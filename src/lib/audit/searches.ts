// The searches riders make in the operator's city ("airport car service
// Scottsdale"), how often they're made (Google Ads' monthly estimate, kept
// a month per city), and where the operator shows up for the biggest few:
// in the map results, and on page one of Google. The map results also give
// the operators they're up against. Server only.

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  googleResults,
  mapsResults,
  searchVolumes,
  seoReady,
  type MapsItem,
  type Place,
} from "./apis/dataforseo";
import type { Cost } from "./cost";
import type { Service } from "./ai";
import type { Listing, Rival, SearchResult } from "./types";
import { digits } from "./site";

const MONTH = 30 * 24 * 60 * 60 * 1000;
/** How many searches are run in each place (each costs two lookups). */
const SEARCHES = 5;

export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

/** "AZ" from "AZ" or "Arizona". */
export function stateCode(value: string | undefined) {
  if (!value) return undefined;
  const v = value.trim();
  if (STATE_NAMES[v.toUpperCase()]) return v.toUpperCase();
  return Object.entries(STATE_NAMES).find(
    ([, name]) => name.toLowerCase() === v.toLowerCase(),
  )?.[0];
}

/**
 * The phrases worth checking in a city. The core ones fit any car
 * service; the rest only when the site says they offer that kind of ride.
 */
export function phrases(city: string) {
  const c = city.toLowerCase();
  return [
    { keyword: `black car service ${c}` },
    { keyword: `limo service ${c}` },
    { keyword: `car service ${c}` },
    { keyword: `airport car service ${c}`, needs: "airport" as Service },
    { keyword: `limousine service ${c}` },
    { keyword: `chauffeur service ${c}` },
    { keyword: `airport transportation ${c}`, needs: "airport" as Service },
    { keyword: `party bus ${c}`, needs: "party_bus" as Service },
    { keyword: `wedding limo ${c}`, needs: "wedding" as Service },
    { keyword: `corporate car service ${c}`, needs: "corporate" as Service },
    { keyword: `prom limo ${c}`, needs: "prom" as Service },
  ];
}

export const placeName = (city: string, state: string) =>
  `${city},${STATE_NAMES[state] ?? state},United States`;

/** Monthly searches for every phrase in a city: kept a month. */
export async function cityVolumes(
  city: string,
  state: string,
  cost: Cost,
): Promise<{ volumes: Map<string, number>; where: Place } | undefined> {
  const key = `${city.toLowerCase()}|${state.toLowerCase()}`;
  const [cached] = await db
    .select()
    .from(schema.auditSearches)
    .where(eq(schema.auditSearches.key, key))
    .limit(1);
  if (cached && Date.now() - cached.fetchedAt.getTime() < MONTH) {
    return {
      volumes: new Map(cached.searches.map((s) => [s.keyword, s.volume])),
      where: { location: cached.location },
    };
  }
  if (!seoReady()) return undefined;

  const keywords = phrases(city).map((p) => p.keyword);
  // The city, or its state when Google Ads doesn't know the city.
  const places = [
    placeName(city, state),
    `${STATE_NAMES[state] ?? state},United States`,
  ];
  for (const location of places) {
    try {
      const volumes = await searchVolumes(keywords, { location }, cost);
      const searches = keywords.map((k) => ({
        keyword: k,
        volume: volumes.get(k) ?? 0,
      }));
      await db
        .insert(schema.auditSearches)
        .values({ key, location, searches })
        .onConflictDoUpdate({
          target: schema.auditSearches.key,
          set: { location, searches, fetchedAt: new Date() },
        });
      return {
        volumes: new Map(searches.map((s) => [s.keyword, s.volume])),
        where: { location },
      };
    } catch (error) {
      console.warn(
        `[audit] search numbers for ${location}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }
  return undefined;
}

/** The biggest searches for the rides they offer, most searched first. */
export function pickSearches(
  city: string,
  services: Service[],
  volumes: Map<string, number> | undefined,
) {
  const offered = phrases(city).filter(
    (p) => !p.needs || services.includes(p.needs),
  );
  const sorted = volumes
    ? [...offered].sort(
        (a, b) => (volumes.get(b.keyword) ?? 0) - (volumes.get(a.keyword) ?? 0),
      )
    : offered;
  return sorted.slice(0, SEARCHES).map((p) => ({
    keyword: p.keyword,
    volume: volumes?.get(p.keyword),
  }));
}

/* ── Is it them? ── */

const nameKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(
      /\b(llc|inc|co|corp|ltd|the|services?|transportation|limousines?|limo|car|black)\b/g,
      " ",
    )
    .replace(/[^a-z0-9]+/g, "");

export function isThem(
  item: { title?: string; domain?: string; placeId?: string; phone?: string },
  them: { placeId?: string; domain?: string; name?: string; phones: string[] },
) {
  if (them.placeId && item.placeId && item.placeId === them.placeId)
    return true;
  if (them.domain && item.domain && item.domain === them.domain) return true;
  if (item.phone && them.phones.includes(digits(item.phone))) return true;
  const a = item.title ? nameKey(item.title) : "";
  const b = them.name ? nameKey(them.name) : "";
  return a.length >= 4 && a === b;
}

export type SearchRun = {
  results: SearchResult[];
  rivals: Rival[];
  /** Searches we couldn't run, so the check knows what it's missing. */
  failed: number;
};

/** Runs the searches, two lookups each, a few at a time. */
export async function runSearches(
  picks: { keyword: string; volume?: number }[],
  where: Place,
  them: { placeId?: string; domain?: string; name?: string; phones: string[] },
  cost: Cost,
): Promise<SearchRun> {
  let failed = 0;
  const results: SearchResult[] = [];
  let firstMaps: MapsItem[] | undefined;
  for (let i = 0; i < picks.length; i += 3) {
    const batch = await Promise.all(
      picks.slice(i, i + 3).map(async (pick) => {
        const [maps, google] = await Promise.all([
          mapsResults(pick.keyword, where, cost).catch((error) => {
            console.warn(
              `[audit] maps "${pick.keyword}":`,
              error instanceof Error ? error.message : error,
            );
            return undefined;
          }),
          googleResults(pick.keyword, where, cost).catch((error) => {
            console.warn(
              `[audit] google "${pick.keyword}":`,
              error instanceof Error ? error.message : error,
            );
            return undefined;
          }),
        ]);
        if (!maps && !google) {
          failed++;
          return undefined;
        }
        const mapsRank = maps?.find((m) => isThem(m, them))?.rank;
        const packRank = google?.pack.find((m) => isThem(m, them))?.rank;
        const organic = google?.organic.find(
          (o) => them.domain && o.domain === them.domain,
        )?.rank;
        return {
          maps,
          result: {
            keyword: pick.keyword,
            volume: pick.volume,
            maps: mapsRank ?? packRank,
            organic: organic && organic <= 10 ? organic : undefined,
          } satisfies SearchResult,
        };
      }),
    );
    for (const row of batch) {
      if (!row) continue;
      results.push(row.result);
      if (!firstMaps && row.maps?.length) firstMaps = row.maps;
    }
  }
  // The operators near them: the top of the biggest search's map results.
  const rivals = (firstMaps ?? [])
    .filter((m) => !isThem(m, them) && m.title)
    .slice(0, 3)
    .map((m) => ({
      name: m.title,
      rating: m.rating,
      reviews: m.reviews,
      domain: m.domain,
    }));
  return { results, rivals, failed };
}

/** Listings from the Places API, as rivals, when DataForSEO isn't set up. */
export function rivalsFrom(
  listings: Listing[],
  them: Parameters<typeof isThem>[1],
) {
  return listings
    .filter(
      (l) =>
        !isThem(
          {
            title: l.name,
            placeId: l.placeId,
            phone: l.phone,
            domain: l.website ? hostOf(l.website) : undefined,
          },
          them,
        ),
    )
    .slice(0, 3)
    .map((l) => ({
      name: l.name,
      rating: l.rating,
      reviews: l.reviews,
      domain: l.website ? hostOf(l.website) : undefined,
    }));
}

export function hostOf(url: string) {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname
      .replace(/^www\./i, "")
      .toLowerCase();
  } catch {
    return undefined;
  }
}
