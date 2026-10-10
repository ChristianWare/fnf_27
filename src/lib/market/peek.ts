// "Leads in your city" on the leads page: a city typed in, matched with
// Google's suggestions so only a real US city goes through, then a count
// of what the Leads Tool would find there. Where the tool already runs
// (a market within 30 miles), the counts are its own. Anywhere else it's
// a quick look: the tool's Google searches, IDs only (free), and the
// events Ticketmaster lists. Server only.

import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { ACCOUNT_CATEGORIES } from "@/lib/leads/kinds";
import { SEARCHES } from "@/lib/leads/catalog";
import { ticketmasterCount } from "@/lib/leads/apis/events";
import { googleReady, searchIds, type Box } from "@/lib/leads/apis/google";
import { ApiError, callJson } from "@/lib/leads/apis/http";
import { track } from "@/lib/leads/usage";
import type { AccountCategory } from "@/lib/leads/types";

const PLACES = "https://places.googleapis.com/v1";
/** A city this close to a market is in it, the same as a client's base. */
const MARKET_MILES = 30;
/** The quick look's reach around the city, and the tool's own. */
const QUICK_MILES = 25;
/** How far ahead the quick look counts events. */
const EVENT_DAYS = 90;
/** A city's counts are kept this long. */
const KEEP_MS = 24 * 60 * 60 * 1000;
/** Places the tool hasn't seen on Google in this long aren't counted. */
const SEEN_DAYS = 45;

const apiKey = () => process.env.GOOGLE_MAPS_SERVER_KEY ?? "";

/** A session token from the browser: one per spell of typing. */
export const isSessionToken = (value: string | null | undefined) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const isPlaceId = (value: string | null | undefined) =>
  typeof value === "string" && /^[A-Za-z0-9_-]{10,300}$/.test(value);

export type CitySuggestion = {
  id: string;
  /** "Phoenix" */
  name: string;
  /** "AZ" */
  region: string;
  /** "Phoenix, AZ" */
  text: string;
};

type Prediction = {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
  };
};

/** "AZ, USA" → "AZ". */
const regionOf = (secondary: string) =>
  secondary
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !/^(usa|united states)$/i.test(part))[0] ?? "";

/** US cities matching what's been typed so far, from Google. */
export async function suggestCities(
  input: string,
  session?: string,
): Promise<CitySuggestion[]> {
  if (!apiKey())
    throw new ApiError("Google", 0, "GOOGLE_MAPS_SERVER_KEY isn't set.");
  const res = await callJson<{ suggestions?: Prediction[] }>(
    "Google autocomplete",
    `${PLACES}/places:autocomplete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey(),
      },
      body: JSON.stringify({
        input,
        // Cities only, the way Google's own "(cities)" filter works.
        includedPrimaryTypes: ["locality", "administrative_area_level_3"],
        includedRegionCodes: ["us"],
        languageCode: "en-US",
        ...(session ? { sessionToken: session } : {}),
      }),
      timeout: 8_000,
    },
  );
  track("places_autocomplete");
  const out: CitySuggestion[] = [];
  for (const s of res.suggestions ?? []) {
    const p = s.placePrediction;
    const id = p?.placeId;
    const name = p?.structuredFormat?.mainText?.text?.trim();
    if (!id || !name) continue;
    const region = regionOf(p?.structuredFormat?.secondaryText?.text ?? "");
    out.push({ id, name, region, text: region ? `${name}, ${region}` : name });
  }
  return out.slice(0, 6);
}

type Place = {
  location?: { latitude: number; longitude: number };
  addressComponents?: {
    shortText?: string;
    longText?: string;
    types?: string[];
  }[];
};

/** Where a city is, and its state, from its place ID. Ends the session. */
async function cityDetails(placeId: string, session?: string) {
  const query = session ? `?sessionToken=${encodeURIComponent(session)}` : "";
  const p = await callJson<Place>(
    "Google details",
    `${PLACES}/places/${encodeURIComponent(placeId)}${query}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey(),
        "X-Goog-FieldMask": "id,location,addressComponents",
      },
      timeout: 8_000,
    },
  );
  track("places_basic");
  if (!p.location) return undefined;
  const parts = p.addressComponents ?? [];
  const part = (type: string) => parts.find((c) => c.types?.includes(type));
  const name =
    part("locality")?.longText ??
    part("administrative_area_level_3")?.longText ??
    "";
  const state = part("administrative_area_level_1")?.shortText ?? "";
  return {
    name,
    state,
    lat: p.location.latitude,
    lng: p.location.longitude,
  };
}

export type Count = {
  value: number;
  /** The quick look stopped counting here: there are more. */
  more?: boolean;
};

export type Peek = {
  /** "Phoenix, AZ" */
  city: string;
  /** The market's name, when the tool already runs there: "Phoenix area". */
  area?: string;
  /** The tool's own numbers, or a quick look from Google and Ticketmaster. */
  from: "tool" | "quick";
  hotels: Count;
  venues: Count;
  accounts: Count;
  events: Count;
};

const miles = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
};

/** The nearest market the tool already runs, if one's close enough. */
async function marketNear(at: { lat: number; lng: number }) {
  const rows = await db
    .select({
      id: schema.leadsMarkets.id,
      name: schema.leadsMarkets.name,
      lat: schema.leadsMarkets.lat,
      lng: schema.leadsMarkets.lng,
    })
    .from(schema.leadsMarkets)
    .where(
      and(
        isNotNull(schema.leadsMarkets.firstLoadedAt),
        eq(schema.leadsMarkets.paused, false),
      ),
    );
  return rows
    .map((m) => ({ ...m, miles: miles(at, m) }))
    .filter((m) => m.miles <= MARKET_MILES)
    .sort((a, b) => a.miles - b.miles)[0];
}

const OTHER: AccountCategory[] = ACCOUNT_CATEGORIES.filter(
  (c) => c !== "HOTEL" && c !== "VENUE",
);

/** What the tool has in a market right now. */
async function countsFromTool(marketId: string) {
  const since = new Date(Date.now() - SEEN_DAYS * 24 * 60 * 60 * 1000);
  const places = await db
    .select({
      category: schema.leadsPlaces.category,
      n: sql<number>`count(*)::int`,
    })
    .from(schema.leadsPlaces)
    .where(
      and(
        eq(schema.leadsPlaces.marketId, marketId),
        eq(schema.leadsPlaces.closed, false),
        gte(schema.leadsPlaces.lastSeenAt, since),
      ),
    )
    .groupBy(schema.leadsPlaces.category);
  const by = new Map(places.map((p) => [p.category, p.n]));
  const [{ events } = { events: 0 }] = await db
    .select({ events: sql<number>`count(*)::int` })
    .from(schema.leadsEvents)
    .where(
      and(
        eq(schema.leadsEvents.marketId, marketId),
        gte(schema.leadsEvents.startsAt, new Date()),
      ),
    );
  return {
    hotels: { value: by.get("HOTEL") ?? 0 },
    venues: { value: by.get("VENUE") ?? 0 },
    accounts: { value: OTHER.reduce((n, c) => n + (by.get(c) ?? 0), 0) },
    events: { value: events },
  };
}

function boxAround(at: { lat: number; lng: number }, radius: number): Box {
  const dLat = radius / 69;
  const dLng = radius / (69 * Math.cos((at.lat * Math.PI) / 180));
  return {
    south: at.lat - dLat,
    north: at.lat + dLat,
    west: at.lng - dLng,
    east: at.lng + dLng,
  };
}

/** The tool's own Google searches, once each, IDs only (free). */
async function countOnGoogle(
  categories: AccountCategory[],
  box: Box,
): Promise<Count> {
  const ids = new Set<string>();
  let more = false;
  const tasks = categories.flatMap((c) => SEARCHES[c]);
  // A few at a time, so a city doesn't fire two dozen calls at once.
  for (let i = 0; i < tasks.length; i += 6) {
    await Promise.all(
      tasks.slice(i, i + 6).map(async (search) => {
        let result;
        try {
          result = await searchIds(
            { text: search.text, type: search.type, box, pages: search.pages },
            {},
          );
        } catch (error) {
          // A type Google doesn't know: the words alone.
          if (search.type && /type/i.test(String((error as Error)?.message)))
            result = await searchIds(
              { text: search.text, box, pages: search.pages },
              {},
            );
          else throw error;
        }
        result.ids.forEach((id) => ids.add(id));
        if (result.full) more = true;
      }),
    );
  }
  return { value: ids.size, ...(more ? { more: true } : {}) };
}

const cache = new Map<string, { at: number; peek: Peek }>();

/** What the Leads Tool would find around a city. Kept a day. */
export async function peekCity(
  placeId: string,
  session?: string,
): Promise<Peek> {
  const kept = cache.get(placeId);
  if (kept && Date.now() - kept.at < KEEP_MS) return kept.peek;
  if (!googleReady())
    throw new ApiError("Google", 0, "GOOGLE_MAPS_SERVER_KEY isn't set.");

  const city = await cityDetails(placeId, session);
  if (!city?.name) throw new ApiError("Google", 404, "That isn't a city.");
  const label = city.state ? `${city.name}, ${city.state}` : city.name;

  let peek: Peek;
  const market = await marketNear(city);
  if (market) {
    peek = {
      city: label,
      area: market.name,
      from: "tool",
      ...(await countsFromTool(market.id)),
    };
  } else {
    const box = boxAround(city, QUICK_MILES);
    const [hotels, venues, accounts, events] = await Promise.all([
      countOnGoogle(["HOTEL"], box),
      countOnGoogle(["VENUE"], box),
      countOnGoogle(OTHER, box),
      ticketmasterCount(city, QUICK_MILES, new Date(), EVENT_DAYS),
    ]);
    peek = {
      city: label,
      from: "quick",
      hotels,
      venues,
      accounts,
      events: { value: events },
    };
  }
  if (cache.size > 500) cache.clear();
  cache.set(placeId, { at: Date.now(), peek });
  return peek;
}

/* ── Keeping it sane: so many a minute from one address ── */

const buckets = new Map<string, { count: number; until: number }>();

/** True when this address is within its share for the minute. */
export function allow(key: string, perMinute: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.until < now) {
    if (buckets.size > 5000) buckets.clear();
    buckets.set(key, { count: 1, until: now + 60_000 });
    return true;
  }
  b.count++;
  return b.count <= perMinute;
}

/** Who's asking, for the limit: the first forwarded address. */
export const addressOf = (request: Request) =>
  (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
  "unknown";
