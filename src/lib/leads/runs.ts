// The nightly runs, 1 to 5 AM Arizona time: each market with someone using
// it gets its accounts (Google), events (Ticketmaster, Eventbrite, Google
// Events, calendars), the week's openings (Google News), and what we know
// about each business, brought up to date. Server only.
//
// A run is split into steps and saved as it goes, so a run that's out of
// time picks up where it stopped on the next tick (or "Run now").

import {
  and,
  asc,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { db, schema } from "@/db";
import { createId } from "@/lib/server/ids";
import { dayKey } from "@/lib/dashboard/format";
import {
  findPlaceId,
  googleReady,
  venueDetails,
  placeDetails,
  searchIds,
  type Box,
} from "./apis/google";
import {
  collectEventbrite,
  googleEvents,
  startEventbrite,
  ticketmasterEvents,
} from "./apis/events";
import { readCalendar } from "./apis/calendars";
import { openings } from "./apis/news";
import { SEARCHES } from "./catalog";
import {
  eventKind,
  isCompetitor,
  placeCategory,
  sameName,
  worthKeeping,
  type RawEvent,
} from "./classify";
import { ACCOUNT_CATEGORIES, STUDIO_ID } from "./kinds";
import { CITIES } from "./market";
import { milesBetween } from "./advice";
import { researchPlace, RESEARCH_DAYS, researchImage } from "./research";
import { flushUsage, type Who } from "./usage";
import type { AccountCategory, EventType } from "./types";

const DAY = 86_400_000;
const s = schema;

export type Market = typeof s.leadsMarkets.$inferSelect;
type Run = typeof s.leadsRuns.$inferSelect;

/** The steps, in order. */
const STEPS = [
  "eventbrite_start",
  "places",
  "details",
  "research",
  "ticketmaster",
  "google_events",
  "calendars",
  "news",
  "eventbrite_collect",
  "venues",
  "tidy",
] as const;
type Step = (typeof STEPS)[number];

export const STEP_NAMES: Record<Step, string> = {
  eventbrite_start: "Eventbrite started",
  places: "Accounts searched",
  details: "Account details",
  research: "Websites checked",
  ticketmaster: "Ticketmaster",
  google_events: "Google Events",
  calendars: "Calendars",
  news: "News",
  eventbrite_collect: "Eventbrite",
  venues: "Venues located",
  tidy: "Tidied up",
};

type Ctx = {
  market: Market;
  run: Run;
  now: Date;
  first: boolean;
  who: Who;
  deadline: number;
  left: () => number;
  count: (name: string, n?: number) => void;
  fail: (text: string) => void;
  save: () => Promise<void>;
};

/** Runs a few at a time until done or out of time. */
async function pool<T>(
  items: T[],
  size: number,
  enough: () => boolean,
  work: (item: T) => Promise<void>,
) {
  let next = 0;
  const lanes = Array.from(
    { length: Math.min(size, items.length) },
    async () => {
      while (next < items.length && !enough()) {
        const item = items[next++];
        await work(item);
      }
    },
  );
  await Promise.all(lanes);
  return next >= items.length;
}

const message = (e: unknown) =>
  e instanceof Error ? e.message.slice(0, 300) : String(e).slice(0, 300);

/** The Arizona weekday, 0 for Sunday. */
const azWeekday = (now: Date) =>
  new Date(now.getTime() - 7 * 3_600_000).getUTCDay();

/* ── Which markets to run ── */

/**
 * Markets with someone using the Leads Tool in them: the studio, or a
 * client who's on a trial, paying, or on the Full Platform, and switched on.
 */
export async function activeMarketIds() {
  const rows = await db
    .select({ marketId: s.leadsSettings.marketId })
    .from(s.leadsSettings)
    .innerJoin(s.clients, eq(s.clients.id, s.leadsSettings.clientId))
    .leftJoin(s.websites, eq(s.websites.clientId, s.clients.id))
    .where(
      and(
        isNotNull(s.leadsSettings.marketId),
        or(
          eq(s.clients.id, STUDIO_ID),
          and(
            eq(s.clients.leadsEnabled, true),
            or(
              isNull(s.clients.archivedAt),
              sql`${s.clients.archivedAt} > now()`,
            ),
            or(
              inArray(s.clients.leadsStatus, [
                "TRIAL",
                "ACTIVE",
                "CANCELLING",
                "PAST_DUE",
              ]),
              and(
                eq(s.websites.plan, "FULL_PLATFORM"),
                sql`${s.websites.status} <> 'CANCELLED'`,
              ),
            ),
          ),
        ),
      ),
    );
  return [...new Set(rows.map((r) => r.marketId!))];
}

/* ── Accounts ── */

type SearchTask = { c: AccountCategory; q: number; box: Box; d: number };

function rootBox(market: Market): Box {
  const dLat = market.radiusMiles / 69;
  const dLng =
    market.radiusMiles / (69 * Math.cos((market.lat * Math.PI) / 180));
  return {
    south: market.lat - dLat,
    north: market.lat + dLat,
    west: market.lng - dLng,
    east: market.lng + dLng,
  };
}

function quarters(b: Box): Box[] {
  const midLat = (b.south + b.north) / 2;
  const midLng = (b.west + b.east) / 2;
  return [
    { south: b.south, west: b.west, north: midLat, east: midLng },
    { south: b.south, west: midLng, north: midLat, east: b.east },
    { south: midLat, west: b.west, north: b.north, east: midLng },
    { south: midLat, west: midLng, north: b.north, east: b.east },
  ];
}

/** Searches Google for every kind of account, IDs only (free). */
async function stepPlaces(ctx: Ctx) {
  if (!googleReady()) {
    ctx.fail("Accounts skipped: GOOGLE_MAPS_SERVER_KEY isn't set.");
    return true;
  }
  const cursor = ctx.run.cursor as { done: string[]; queue?: SearchTask[] };
  if (!cursor.queue) {
    cursor.queue = ACCOUNT_CATEGORIES.flatMap((c) =>
      SEARCHES[c].map((_, q) => ({ c, q, box: rootBox(ctx.market), d: 0 })),
    );
  }
  const queue = cursor.queue;
  const typeless = new Set<string>();
  while (queue.length && ctx.left() > 25_000) {
    const batch = queue.splice(0, 8);
    await Promise.all(
      batch.map(async (task) => {
        const search = SEARCHES[task.c][task.q];
        const type = typeless.has(search.text) ? undefined : search.type;
        try {
          let result;
          try {
            result = await searchIds(
              { text: search.text, type, box: task.box, pages: search.pages },
              ctx.who,
            );
          } catch (e) {
            // A type Google doesn't know: search by the words alone.
            if (type && /type/i.test(message(e))) {
              typeless.add(search.text);
              result = await searchIds(
                { text: search.text, box: task.box, pages: search.pages },
                ctx.who,
              );
            } else throw e;
          }
          ctx.count("searches");
          if (result.ids.length) {
            const rows = await db
              .insert(s.leadsPlaces)
              .values(
                [...new Set(result.ids)].map((id) => ({
                  id,
                  marketId: ctx.market.id,
                  category: task.c,
                  firstSeenAt: ctx.now,
                  lastSeenAt: ctx.now,
                })),
              )
              .onConflictDoUpdate({
                target: s.leadsPlaces.id,
                set: { lastSeenAt: ctx.now },
              })
              .returning({ inserted: sql<boolean>`(xmax = 0)` });
            ctx.count("placesSeen", rows.length);
            ctx.count("placesNew", rows.filter((r) => r.inserted).length);
          }
          if (result.full && task.d < search.depth) {
            queue.push(
              ...quarters(task.box).map((box) => ({
                ...task,
                box,
                d: task.d + 1,
              })),
            );
          }
        } catch (e) {
          ctx.count("searchErrors");
          if ((ctx.run.counts.searchErrors ?? 0) <= 3)
            ctx.fail(`Google search "${search.text}": ${message(e)}`);
        }
      }),
    );
    await ctx.save();
  }
  if (queue.length) return false;
  delete cursor.queue;
  return true;
}

/** Google's details for new places, and a refresh before 30 days are up. */
async function stepDetails(ctx: Ctx) {
  if (!googleReady()) return true;
  const stale = new Date(ctx.now.getTime() - 26 * DAY);
  while (ctx.left() > 20_000) {
    const rows = await db
      .select({ id: s.leadsPlaces.id, category: s.leadsPlaces.category })
      .from(s.leadsPlaces)
      .where(
        and(
          eq(s.leadsPlaces.marketId, ctx.market.id),
          eq(s.leadsPlaces.closed, false),
          or(
            isNull(s.leadsPlaces.detailsAt),
            lt(s.leadsPlaces.detailsAt, stale),
          ),
        ),
      )
      .orderBy(sql`${s.leadsPlaces.detailsAt} asc nulls first`)
      .limit(40);
    if (!rows.length) return true;
    await pool(
      rows,
      5,
      () => ctx.left() < 15_000,
      async (row) => {
        try {
          const d = await placeDetails(row.id, ctx.who);
          const category = d ? placeCategory(d.types, row.category) : undefined;
          if (!d || d.closed || !category || isCompetitor(d.name, d.types)) {
            await db
              .update(s.leadsPlaces)
              .set({ closed: true, ...clearedDetails, detailsAt: ctx.now })
              .where(eq(s.leadsPlaces.id, row.id));
            ctx.count("placesHidden");
            return;
          }
          await db
            .update(s.leadsPlaces)
            .set({
              category,
              name: d.name,
              address: d.address,
              city: d.city,
              lat: d.lat,
              lng: d.lng,
              rating: d.rating ?? null,
              reviews: d.reviews ?? null,
              phone: d.phone ?? null,
              website: d.website ?? null,
              types: d.types,
              photoCount: d.photoCount,
              detailsAt: ctx.now,
            })
            .where(eq(s.leadsPlaces.id, row.id));
          ctx.count("details");
        } catch (e) {
          ctx.count("detailErrors");
          // Don't ask again tonight; it's tried again tomorrow.
          await db
            .update(s.leadsPlaces)
            .set({
              detailsAt: sql`coalesce(${s.leadsPlaces.detailsAt}, now() - interval '27 days')`,
            })
            .where(eq(s.leadsPlaces.id, row.id));
          if ((ctx.run.counts.detailErrors ?? 0) <= 3)
            ctx.fail(`Google details: ${message(e)}`);
        }
      },
    );
    await ctx.save();
  }
  return false;
}

const clearedDetails = {
  name: null,
  address: null,
  city: null,
  lat: null,
  lng: null,
  rating: null,
  reviews: null,
  phone: null,
  website: null,
  types: null,
  photoCount: null,
};

/** Each business's website: car service, and a line about them. */
async function stepResearch(ctx: Ctx) {
  const stale = new Date(ctx.now.getTime() - RESEARCH_DAYS * DAY);
  const limit = 150;
  const done = () => (ctx.run.counts.researched ?? 0) >= limit;
  while (ctx.left() > 30_000 && !done()) {
    const rows = await db
      .select({
        id: s.leadsPlaces.id,
        name: s.leadsPlaces.name,
        city: s.leadsPlaces.city,
        category: s.leadsPlaces.category,
        website: s.leadsPlaces.website,
      })
      .from(s.leadsPlaces)
      .leftJoin(s.leadsResearch, eq(s.leadsResearch.key, s.leadsPlaces.id))
      .where(
        and(
          eq(s.leadsPlaces.marketId, ctx.market.id),
          eq(s.leadsPlaces.closed, false),
          isNotNull(s.leadsPlaces.detailsAt),
          isNotNull(s.leadsPlaces.name),
          or(
            isNull(s.leadsResearch.checkedAt),
            lt(s.leadsResearch.checkedAt, stale),
          ),
        ),
      )
      .orderBy(sql`${s.leadsPlaces.reviews} desc nulls last`)
      .limit(12);
    if (!rows.length) return true;
    await pool(
      rows,
      4,
      () => ctx.left() < 25_000,
      async (row) => {
        try {
          await researchPlace(
            {
              id: row.id,
              name: row.name ?? "",
              city: row.city ?? "",
              category: row.category,
              website: row.website,
            },
            ctx.who,
          );
          ctx.count("researched");
        } catch (e) {
          ctx.count("researchErrors");
          if ((ctx.run.counts.researchErrors ?? 0) <= 3)
            ctx.fail(`Website check: ${message(e)}`);
        }
      },
    );
    await ctx.save();
  }
  if (ctx.left() > 30_000) await researchImages(ctx);
  return ctx.left() > 30_000 || done();
}

/** Websites read before we kept the picture they share: just that, no AI. */
async function researchImages(ctx: Ctx) {
  const limit = 300;
  while (ctx.left() > 30_000 && (ctx.run.counts.imagesChecked ?? 0) < limit) {
    const rows = await db
      .select({ id: s.leadsPlaces.id, website: s.leadsPlaces.website })
      .from(s.leadsPlaces)
      .innerJoin(s.leadsResearch, eq(s.leadsResearch.key, s.leadsPlaces.id))
      .where(
        and(
          eq(s.leadsPlaces.marketId, ctx.market.id),
          eq(s.leadsPlaces.closed, false),
          isNotNull(s.leadsResearch.checkedAt),
          isNull(s.leadsResearch.imageCheckedAt),
        ),
      )
      .limit(24);
    if (!rows.length) return;
    await pool(
      rows,
      6,
      () => ctx.left() < 25_000,
      async (row) => {
        try {
          if (await researchImage(row)) ctx.count("websiteImages");
        } catch {
          // Tried again on a later night.
        }
        ctx.count("imagesChecked");
      },
    );
    await ctx.save();
  }
}

/* ── Events ── */

type Known = {
  id: string;
  keys: string[];
  name: string;
  day: string;
  saved?: boolean;
};

/** Adds new events and updates ones already found, from any source. */
/** A source's ticket prices, in cents. */
const cents = (raw: RawEvent) =>
  raw.priceMin === undefined && raw.priceMax === undefined
    ? {}
    : {
        priceMinCents: Math.round((raw.priceMin ?? raw.priceMax!) * 100),
        priceMaxCents: Math.round((raw.priceMax ?? raw.priceMin!) * 100),
      };

async function ingest(ctx: Ctx, raws: RawEvent[], fallback?: EventType | null) {
  // The same event on several nights (a concert run): one lead.
  const groups = new Map<string, RawEvent>();
  for (const raw of raws) {
    const key = `${raw.source}|${sameName(raw.name)}|${(raw.venue ?? "").toLowerCase()}`;
    const known = groups.get(key);
    if (
      known &&
      Math.abs(
        new Date(raw.startsAt).getTime() - new Date(known.startsAt).getTime(),
      ) <
        30 * DAY
    ) {
      const starts = [known.startsAt, raw.startsAt].sort();
      const ends = [
        known.endsAt ?? known.startsAt,
        raw.endsAt ?? raw.startsAt,
      ].sort();
      groups.set(key, {
        ...known,
        startsAt: starts[0],
        endsAt: ends[1] > starts[0] ? ends[1] : undefined,
        image: known.image ?? raw.image,
        priceMin: known.priceMin ?? raw.priceMin,
        priceMax: known.priceMax ?? raw.priceMax,
      });
    } else if (!known) groups.set(key, raw);
    else groups.set(`${key}|${raw.startsAt}`, raw);
  }

  const existing = await db
    .select({
      id: s.leadsEvents.id,
      keys: s.leadsEvents.keys,
      name: s.leadsEvents.name,
      startsAt: s.leadsEvents.startsAt,
    })
    .from(s.leadsEvents)
    .where(
      and(
        eq(s.leadsEvents.marketId, ctx.market.id),
        sql`coalesce(${s.leadsEvents.endsAt}, ${s.leadsEvents.startsAt}) > now() - interval '2 days'`,
      ),
    );
  const known: Known[] = existing.map((e) => ({
    id: e.id,
    keys: e.keys,
    name: sameName(e.name),
    day: dayKey(e.startsAt),
  }));
  const byKey = new Map<string, Known>();
  for (const k of known) for (const key of k.keys) byKey.set(key, k);

  for (const raw of groups.values()) {
    if (!worthKeeping(raw, ctx.now)) continue;
    const type =
      raw.type ?? eventKind(raw.name, raw.description, fallback ?? undefined);
    if (!type) {
      ctx.count("eventsSkipped");
      continue;
    }
    if (
      raw.lat !== undefined &&
      raw.lng !== undefined &&
      milesBetween(ctx.market, { lat: raw.lat, lng: raw.lng }) >
        ctx.market.radiusMiles + 15
    ) {
      continue;
    }
    const name = sameName(raw.name);
    const day = dayKey(raw.startsAt);
    const match =
      byKey.get(raw.key) ??
      known.find(
        (k) =>
          k.name === name &&
          Math.abs(new Date(k.day).getTime() - new Date(day).getTime()) <= DAY,
      );
    const city =
      raw.city ||
      /,\s*([^,]+),\s*[A-Z]{2}\b/.exec(raw.address ?? "")?.[1] ||
      "";
    const values = {
      name: raw.name.slice(0, 200),
      startsAt: new Date(raw.startsAt),
      endsAt: raw.endsAt ? new Date(raw.endsAt) : null,
      allDay: Boolean(raw.allDay),
      venue: (raw.venue ?? "").slice(0, 200),
      address: raw.address?.slice(0, 300) || null,
      city: city.slice(0, 100),
      organizer: (raw.organizer ?? "").slice(0, 200),
      organizerUrl: raw.organizerUrl ?? null,
      url: raw.url ?? null,
      guests: raw.guests ?? null,
      phone: raw.phone ?? null,
      description: raw.description?.slice(0, 1000) ?? null,
      imageUrl: raw.image ?? null,
      ...cents(raw),
      ...(raw.lat !== undefined && raw.lng !== undefined
        ? { lat: raw.lat, lng: raw.lng, geoFromGoogleAt: null }
        : {}),
    };
    if (match) {
      // Fill in what we didn't know; keep the source that found it first.
      const keys = [...new Set([...match.keys, raw.key])];
      await db
        .update(s.leadsEvents)
        .set({
          keys,
          startsAt: values.startsAt,
          ...(values.endsAt ? { endsAt: values.endsAt } : {}),
          ...(values.organizer
            ? {
                organizer: sql`coalesce(nullif(${s.leadsEvents.organizer}, ''), ${values.organizer})`,
              }
            : {}),
          ...(values.url
            ? { url: sql`coalesce(${s.leadsEvents.url}, ${values.url})` }
            : {}),
          ...(values.organizerUrl
            ? {
                organizerUrl: sql`coalesce(${s.leadsEvents.organizerUrl}, ${values.organizerUrl})`,
              }
            : {}),
          ...(values.description
            ? {
                description: sql`coalesce(${s.leadsEvents.description}, ${values.description})`,
              }
            : {}),
          ...(values.imageUrl
            ? {
                imageUrl: sql`coalesce(${s.leadsEvents.imageUrl}, ${values.imageUrl})`,
              }
            : {}),
          ...(values.priceMinCents != null || values.priceMaxCents != null
            ? {
                priceMinCents: values.priceMinCents,
                priceMaxCents: values.priceMaxCents,
              }
            : {}),
          ...(raw.lat !== undefined && raw.lng !== undefined
            ? { lat: raw.lat, lng: raw.lng, geoFromGoogleAt: null }
            : {}),
          updatedAt: ctx.now,
        })
        .where(eq(s.leadsEvents.id, match.id));
      match.keys = keys;
      byKey.set(raw.key, match);
      ctx.count("eventsUpdated");
    } else {
      const id = `ev${createId().slice(1)}`;
      await db.insert(s.leadsEvents).values({
        id,
        marketId: ctx.market.id,
        type,
        source: raw.source,
        keys: [raw.key],
        foundAt: ctx.now,
        ...values,
      });
      const k = { id, keys: [raw.key], name, day };
      known.push(k);
      byKey.set(raw.key, k);
      ctx.count("eventsNew");
    }
  }
}

async function stepTicketmaster(ctx: Ctx) {
  if (!process.env.TICKETMASTER_API_KEY) return true;
  try {
    const events = await ticketmasterEvents(
      ctx.market,
      ctx.market.radiusMiles,
      ctx.now,
      180,
      ctx.who,
    );
    ctx.count("ticketmaster", events.length);
    await ingest(ctx, events);
  } catch (e) {
    ctx.fail(`Ticketmaster: ${message(e)}`);
  }
  return true;
}

/** Weekly, on Mondays (and on a market's first run): 4 searches. */
async function stepGoogleEvents(ctx: Ctx) {
  if (!process.env.SERPAPI_API_KEY) return true;
  if (!ctx.first && azWeekday(ctx.now) !== 1) return true;
  const place = `${ctx.market.city}, ${ctx.market.state}`;
  try {
    const events = await googleEvents(
      [
        `galas in ${place}`,
        `conferences in ${place}`,
        `charity fundraisers in ${place}`,
        `business events in ${place}`,
      ],
      ctx.now,
      ctx.who,
    );
    ctx.count("googleEvents", events.length);
    await ingest(ctx, events);
  } catch (e) {
    ctx.fail(`Google Events: ${message(e)}`);
  }
  return true;
}

async function stepCalendars(ctx: Ctx) {
  const sources = await db
    .select()
    .from(s.leadsSources)
    .where(
      and(
        eq(s.leadsSources.marketId, ctx.market.id),
        eq(s.leadsSources.enabled, true),
      ),
    )
    .orderBy(asc(s.leadsSources.createdAt));
  const cursor = ctx.run.cursor as { done: string[]; calendars?: string[] };
  const finished = new Set(cursor.calendars ?? []);
  for (const source of sources) {
    if (finished.has(source.id)) continue;
    if (ctx.left() < 30_000) return false;
    try {
      const read = await readCalendar(
        source.url,
        source.source,
        ctx.now,
        ctx.who,
      );
      await ingest(ctx, read.events, source.eventType);
      await db
        .update(s.leadsSources)
        .set({
          lastRunAt: ctx.now,
          lastCount: read.events.length,
          lastError: null,
        })
        .where(eq(s.leadsSources.id, source.id));
      ctx.count("calendarEvents", read.events.length);
    } catch (e) {
      await db
        .update(s.leadsSources)
        .set({ lastRunAt: ctx.now, lastCount: 0, lastError: message(e) })
        .where(eq(s.leadsSources.id, source.id));
      ctx.fail(`${source.label}: ${message(e)}`);
    }
    finished.add(source.id);
    cursor.calendars = [...finished];
    await ctx.save();
  }
  delete cursor.calendars;
  return true;
}

/** Weekly, on Sundays (and on a market's first run). */
async function stepNews(ctx: Ctx) {
  if (!googleReady()) return true;
  if (!ctx.first && azWeekday(ctx.now) !== 0) return true;
  try {
    const found = await openings(ctx.market.city, ctx.market.state, ctx.who);
    for (const item of found) {
      if (ctx.left() < 20_000) break;
      const id = await findPlaceId(
        `${item.name} ${item.city}`,
        ctx.market,
        ctx.who,
      );
      if (!id) continue;
      const [row] = await db
        .insert(s.leadsPlaces)
        .values({
          id,
          marketId: ctx.market.id,
          category: item.category,
          firstSeenAt: ctx.now,
          lastSeenAt: ctx.now,
          news: item.news,
        })
        .onConflictDoUpdate({
          target: s.leadsPlaces.id,
          set: { news: item.news, lastSeenAt: ctx.now },
        })
        .returning({
          inserted: sql<boolean>`(xmax = 0)`,
          detailsAt: s.leadsPlaces.detailsAt,
        });
      ctx.count("news");
      if (row && !row.detailsAt) {
        const d = await placeDetails(id, ctx.who).catch(() => undefined);
        if (d && !d.closed) {
          await db
            .update(s.leadsPlaces)
            .set({
              name: d.name,
              address: d.address,
              city: d.city,
              lat: d.lat,
              lng: d.lng,
              rating: d.rating ?? null,
              reviews: d.reviews ?? null,
              phone: d.phone ?? null,
              website: d.website ?? null,
              types: d.types,
              detailsAt: ctx.now,
            })
            .where(eq(s.leadsPlaces.id, id));
        }
      }
    }
  } catch (e) {
    ctx.fail(`News: ${message(e)}`);
  }
  return true;
}

/**
 * Where each event is: its venue on Google (looked up once per venue).
 * One with no venue, or a venue Google can't find, goes in the middle of
 * its city (or the market), so it still shows up, roughly where it is.
 */
async function stepVenues(ctx: Ctx) {
  if (googleReady() && !(await venuesFromGoogle(ctx))) return false;
  const leftover = await db
    .select({ id: s.leadsEvents.id, city: s.leadsEvents.city })
    .from(s.leadsEvents)
    .where(
      and(
        eq(s.leadsEvents.marketId, ctx.market.id),
        isNull(s.leadsEvents.lat),
        isNull(s.leadsEvents.venuePlaceId),
        sql`coalesce(${s.leadsEvents.endsAt}, ${s.leadsEvents.startsAt}) > now() - interval '1 day'`,
      ),
    );
  for (const event of leftover) {
    const city = Object.keys(CITIES).find(
      (c) => c.toLowerCase() === event.city.trim().toLowerCase(),
    );
    const at = city
      ? CITIES[city]
      : { lat: ctx.market.lat, lng: ctx.market.lng };
    await db
      .update(s.leadsEvents)
      .set({
        lat: at.lat,
        lng: at.lng,
        city: event.city || ctx.market.city,
        keys: sql`${s.leadsEvents.keys} || '["CITYWIDE"]'::jsonb`,
      })
      .where(eq(s.leadsEvents.id, event.id));
    ctx.count("venuesApproximate");
  }
  return true;
}

async function venuesFromGoogle(ctx: Ctx) {
  const stale = new Date(ctx.now.getTime() - 29 * DAY);
  // Lookups that failed tonight aren't tried again until tomorrow, so one
  // venue Google keeps refusing can't eat the whole run.
  const failed = new Set<string>();
  while (ctx.left() > 20_000) {
    const rows = await db
      .select()
      .from(s.leadsEvents)
      .where(
        and(
          eq(s.leadsEvents.marketId, ctx.market.id),
          sql`coalesce(${s.leadsEvents.endsAt}, ${s.leadsEvents.startsAt}) > now() - interval '1 day'`,
          or(
            and(isNull(s.leadsEvents.lat), isNull(s.leadsEvents.venuePlaceId)),
            and(
              isNotNull(s.leadsEvents.venuePlaceId),
              isNull(s.leadsEvents.lat),
            ),
            lt(s.leadsEvents.geoFromGoogleAt, stale),
            // No picture of its own: the venue's photo stands in.
            and(
              isNull(s.leadsEvents.venuePlaceId),
              isNull(s.leadsEvents.imageUrl),
            ),
            // Looked up before we kept the venue's rating and photos.
            and(
              isNotNull(s.leadsEvents.venuePlaceId),
              isNull(s.leadsEvents.venuePhotos),
            ),
          ),
          sql`(${s.leadsEvents.venue} <> '' or ${s.leadsEvents.address} is not null)`,
          sql`not (${s.leadsEvents.keys} @> '["NOVENUE"]'::jsonb)`,
          ...(failed.size ? [notInArray(s.leadsEvents.id, [...failed])] : []),
        ),
      )
      .limit(25);
    if (!rows.length) return true;
    await pool(
      rows,
      4,
      () => ctx.left() < 15_000,
      async (event) => {
        try {
          let placeId = event.venuePlaceId;
          if (!placeId) {
            const key = `${event.venue}|${event.city}`.toLowerCase().trim();
            const [cached] = await db
              .select()
              .from(s.leadsVenues)
              .where(eq(s.leadsVenues.key, key))
              .limit(1);
            if (cached) placeId = cached.placeId;
            else {
              const text = [
                event.venue,
                event.address ?? event.city ?? ctx.market.city,
              ]
                .filter(Boolean)
                .join(", ");
              placeId = (await findPlaceId(text, ctx.market, ctx.who)) ?? null;
              await db
                .insert(s.leadsVenues)
                .values({ key, placeId })
                .onConflictDoUpdate({
                  target: s.leadsVenues.key,
                  set: { placeId, lastLookedAt: ctx.now },
                });
            }
          }
          const basics = placeId
            ? await venueDetails(placeId, ctx.who)
            : undefined;
          if (!basics) {
            // Google doesn't know the venue: it goes by its city instead.
            await db
              .update(s.leadsEvents)
              .set({
                venuePlaceId: null,
                keys: sql`${s.leadsEvents.keys} || '["NOVENUE"]'::jsonb`,
              })
              .where(eq(s.leadsEvents.id, event.id));
            // A place Google retired: forget it, so the next event there
            // searches again.
            if (placeId)
              await db
                .update(s.leadsVenues)
                .set({ placeId: null, lastLookedAt: ctx.now })
                .where(eq(s.leadsVenues.placeId, placeId));
            ctx.count("venuesMissing");
            return;
          }
          await db
            .update(s.leadsEvents)
            .set({
              venuePlaceId: placeId,
              lat: basics.lat,
              lng: basics.lng,
              geoFromGoogleAt: ctx.now,
              address: event.address ?? basics.address,
              city: event.city || basics.city,
              venueRating: basics.rating ?? null,
              venueReviews: basics.reviews ?? null,
              venuePhone: basics.phone ?? null,
              venuePhotos: basics.photos,
            })
            .where(eq(s.leadsEvents.id, event.id));
          ctx.count("venues");
        } catch (e) {
          failed.add(event.id);
          ctx.count("venueErrors");
          if ((ctx.run.counts.venueErrors ?? 0) <= 3)
            ctx.fail(`Venue lookup: ${message(e)}`);
        }
      },
    );
    await ctx.save();
  }
  return false;
}

/** Eventbrite: started at the top of the run on Mondays and Thursdays. */
async function stepEventbriteStart(ctx: Ctx) {
  if (!process.env.APIFY_API_TOKEN) return true;
  const day = azWeekday(ctx.now);
  if (!ctx.first && day !== 1 && day !== 4) return true;
  try {
    const id = await startEventbrite(
      ctx.market.city,
      ctx.market.state,
      ctx.who,
    );
    if (id) (ctx.run.cursor as { apifyRun?: string }).apifyRun = id;
  } catch (e) {
    ctx.fail(`Eventbrite: ${message(e)}`);
  }
  return true;
}

async function stepEventbriteCollect(ctx: Ctx) {
  const cursor = ctx.run.cursor as { done: string[]; apifyRun?: string };
  if (!cursor.apifyRun) return true;
  // Waits a little while there's time; otherwise the next tick collects.
  while (ctx.left() > 45_000) {
    try {
      const events = await collectEventbrite(cursor.apifyRun, ctx.who);
      if (events) {
        ctx.count("eventbrite", events.length);
        await ingest(ctx, events);
        delete cursor.apifyRun;
        return true;
      }
    } catch (e) {
      ctx.fail(`Eventbrite: ${message(e)}`);
      delete cursor.apifyRun;
      return true;
    }
    // Still scraping after three hours: give up for tonight.
    if (ctx.now.getTime() - ctx.run.startedAt.getTime() > 3 * 3_600_000) {
      ctx.fail("Eventbrite: the scrape took too long.");
      delete cursor.apifyRun;
      return true;
    }
    await new Promise((r) => setTimeout(r, 15_000));
  }
  return false;
}

/** Past events go, and Google's details older than 30 days are cleared. */
async function stepTidy(ctx: Ctx) {
  const saved = db
    .select({ id: s.leadsSaved.targetId })
    .from(s.leadsSaved)
    .where(eq(s.leadsSaved.kind, "EVENT"));
  const gone = await db
    .delete(s.leadsEvents)
    .where(
      and(
        eq(s.leadsEvents.marketId, ctx.market.id),
        sql`coalesce(${s.leadsEvents.endsAt}, ${s.leadsEvents.startsAt}) < now() - interval '2 days'`,
        notInArray(s.leadsEvents.id, saved),
      ),
    )
    .returning({ id: s.leadsEvents.id });
  ctx.count("eventsExpired", gone.length);
  await tidyGoogleData();
  return true;
}

/** Google's terms: nothing but place IDs kept past 30 days. */
export async function tidyGoogleData() {
  const cutoff = sql`now() - interval '30 days'`;
  await db
    .update(s.leadsPlaces)
    .set({ ...clearedDetails, detailsAt: null })
    .where(
      and(lt(s.leadsPlaces.detailsAt, cutoff), isNotNull(s.leadsPlaces.name)),
    );
  await db
    .update(s.leadsEvents)
    .set({
      lat: null,
      lng: null,
      geoFromGoogleAt: null,
      venueRating: null,
      venueReviews: null,
      venuePhone: null,
      venuePhotos: null,
    })
    .where(lt(s.leadsEvents.geoFromGoogleAt, cutoff));
  await db.delete(s.leadsDrives).where(lt(s.leadsDrives.at, cutoff));
}

const RUNNERS: Record<Step, (ctx: Ctx) => Promise<boolean>> = {
  eventbrite_start: stepEventbriteStart,
  places: stepPlaces,
  details: stepDetails,
  research: stepResearch,
  ticketmaster: stepTicketmaster,
  google_events: stepGoogleEvents,
  calendars: stepCalendars,
  news: stepNews,
  venues: stepVenues,
  eventbrite_collect: stepEventbriteCollect,
  tidy: stepTidy,
};

/* ── Running ── */

/** Today's run for a market: the one under way, or a new one. */
async function runFor(
  market: Market,
  trigger: "NIGHTLY" | "MANUAL",
  now: Date,
) {
  const day = dayKey(now);
  // Runs left over from earlier days are finished as they are.
  await db
    .update(s.leadsRuns)
    .set({ status: "FAILED", finishedAt: now, lockedUntil: null })
    .where(
      and(
        eq(s.leadsRuns.marketId, market.id),
        eq(s.leadsRuns.status, "RUNNING"),
        sql`${s.leadsRuns.day} <> ${day}`,
      ),
    );
  const running = () =>
    db
      .select()
      .from(s.leadsRuns)
      .where(
        and(
          eq(s.leadsRuns.marketId, market.id),
          eq(s.leadsRuns.status, "RUNNING"),
        ),
      )
      .limit(1);
  const [under] = await running();
  if (under) return under;
  // The nightly run happens once a day; "Run now" can always start another.
  if (trigger === "NIGHTLY") {
    const [today] = await db
      .select({ id: s.leadsRuns.id })
      .from(s.leadsRuns)
      .where(and(eq(s.leadsRuns.marketId, market.id), eq(s.leadsRuns.day, day)))
      .limit(1);
    if (today) return undefined;
  }
  // Two ticks at once both get here: the database lets one start it.
  const [made] = await db
    .insert(s.leadsRuns)
    .values({ id: createId(), marketId: market.id, day, trigger })
    .onConflictDoNothing()
    .returning();
  return made ?? (await running())[0];
}

export type RunReport = {
  market: string;
  status: "DONE" | "RUNNING" | "SKIPPED" | "BUSY";
  counts?: Record<string, number>;
  errors?: string[];
};

/** Works on one market's run until it's done or out of time. */
export async function runMarket(
  market: Market,
  options: { trigger: "NIGHTLY" | "MANUAL"; deadline: number },
): Promise<RunReport> {
  const now = new Date();
  const run = await runFor(market, options.trigger, now);
  if (!run) return { market: market.name, status: "SKIPPED" };

  // One worker at a time.
  const lockFor = Math.max(60_000, options.deadline - Date.now() + 60_000);
  const [claimed] = await db
    .update(s.leadsRuns)
    .set({ lockedUntil: new Date(Date.now() + lockFor) })
    .where(
      and(
        eq(s.leadsRuns.id, run.id),
        or(
          isNull(s.leadsRuns.lockedUntil),
          lt(s.leadsRuns.lockedUntil, new Date()),
        ),
      ),
    )
    .returning();
  if (!claimed) return { market: market.name, status: "BUSY" };

  const state: Run = {
    ...claimed,
    cursor: { ...(claimed.cursor ?? {}), done: claimed.cursor?.done ?? [] },
    counts: { ...(claimed.counts ?? {}) },
    errors: [...(claimed.errors ?? [])],
  };
  const ctx: Ctx = {
    market,
    run: state,
    now,
    first: !market.firstLoadedAt,
    who: { marketId: market.id },
    deadline: options.deadline,
    left: () => options.deadline - Date.now(),
    count: (name, n = 1) => {
      state.counts[name] = (state.counts[name] ?? 0) + n;
    },
    fail: (text) => {
      if (state.errors.length < 40) state.errors.push(text);
    },
    save: async () => {
      await db
        .update(s.leadsRuns)
        .set({
          cursor: state.cursor,
          counts: state.counts,
          errors: state.errors,
        })
        .where(eq(s.leadsRuns.id, state.id));
      await flushUsage();
    },
  };

  try {
    for (const step of STEPS) {
      if (state.cursor.done.includes(step)) continue;
      if (ctx.left() < 15_000) break;
      const finished = await RUNNERS[step](ctx);
      if (!finished) break;
      state.cursor.done.push(step);
      await ctx.save();
    }
  } catch (e) {
    ctx.fail(`Stopped: ${message(e)}`);
  } finally {
    await ctx.save();
  }

  const complete = STEPS.every((step) => state.cursor.done.includes(step));
  const end = new Date();
  await db
    .update(s.leadsRuns)
    .set({
      lockedUntil: null,
      ...(complete ? { status: "DONE" as const, finishedAt: end } : {}),
    })
    .where(eq(s.leadsRuns.id, state.id));
  if (complete) {
    await db
      .update(s.leadsMarkets)
      .set({
        lastRunAt: end,
        ...(market.firstLoadedAt ? {} : { firstLoadedAt: end }),
      })
      .where(eq(s.leadsMarkets.id, market.id));
  }
  return {
    market: market.name,
    status: complete ? "DONE" : "RUNNING",
    counts: state.counts,
    errors: state.errors,
  };
}

/** The nightly tick: every active market, until the time's up. */
export async function nightlyTick(budgetMs: number) {
  const deadline = Date.now() + budgetMs;
  const ids = await activeMarketIds();
  if (!ids.length) return [];
  const markets = await db
    .select()
    .from(s.leadsMarkets)
    .where(
      and(inArray(s.leadsMarkets.id, ids), eq(s.leadsMarkets.paused, false)),
    )
    .orderBy(asc(s.leadsMarkets.createdAt));
  const reports: RunReport[] = [];
  for (const market of markets) {
    if (deadline - Date.now() < 30_000) break;
    reports.push(await runMarket(market, { trigger: "NIGHTLY", deadline }));
  }
  return reports;
}
