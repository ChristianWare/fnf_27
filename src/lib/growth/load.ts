// Reading the Growth numbers back: the daily series for the Growth page,
// the top searches for whatever dates are picked, their Google reviews,
// and what the admin needs to see about the pulls. Server only.

import { and, asc, count, eq, gte, inArray, max, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { dayKey } from "@/lib/dashboard/format";
import type { GrowthSync } from "@/lib/dashboard/types";
import { addDays, daysFrom, maxDay, todayAz } from "./dates";
import type { TrafficSeries } from "./traffic";
import { keyProblem, serviceAccountEmail } from "./searchConsole";

const { trafficDays, trafficQueries, reviewDays, websites } = schema;

/**
 * Visitors from Google, a day at a time, from launch day (or as far back
 * as Search Console went) to the last day with final numbers.
 */
export async function loadSeries(
  clientId: string,
  launchedAt?: string,
): Promise<TrafficSeries | undefined> {
  if (!launchedAt) return undefined;
  const launch = dayKey(launchedAt);
  const rows = await db
    .select({
      day: trafficDays.day,
      clicks: trafficDays.clicks,
      impressions: trafficDays.impressions,
      position: trafficDays.position,
    })
    .from(trafficDays)
    .where(
      and(eq(trafficDays.clientId, clientId), gte(trafficDays.day, launch)),
    )
    .orderBy(asc(trafficDays.day));
  if (!rows.length) return undefined;
  const start = maxDay(launch, rows[0].day);
  const through = rows[rows.length - 1].day;
  const n = daysFrom(start, through) + 1;
  const series: TrafficSeries = {
    start,
    through,
    clicks: Array(n).fill(0),
    impressions: Array(n).fill(0),
    position: Array(n).fill(0),
  };
  for (const r of rows) {
    const i = daysFrom(start, r.day);
    if (i < 0 || i >= n) continue;
    series.clicks[i] = r.clicks;
    series.impressions[i] = r.impressions;
    series.position[i] = Math.round(r.position * 10) / 10;
  }
  return series;
}

export type TopSearch = {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
  /** Places moved up (down when negative) on the same days before. */
  change?: number;
  /** Not seen at all in the days before. Neither is set when there's
   * nothing before to compare with (dates from launch day). */
  isNew?: boolean;
};

/** The searches that brought the most visitors between two days. */
export async function topSearches(
  clientId: string,
  from: string,
  to: string,
  limit = 10,
): Promise<TopSearch[]> {
  const pick = (a: string, b: string, only?: string[]) =>
    db
      .select({
        query: trafficQueries.query,
        clicks: sql<number>`sum(${trafficQueries.clicks})::int`,
        impressions: sql<number>`sum(${trafficQueries.impressions})::int`,
        position: sql<number>`(sum(${trafficQueries.position} * ${trafficQueries.impressions}) / nullif(sum(${trafficQueries.impressions}), 0))::float8`,
      })
      .from(trafficQueries)
      .where(
        and(
          eq(trafficQueries.clientId, clientId),
          sql`${trafficQueries.day} between ${a} and ${b}`,
          ...(only ? [inArray(trafficQueries.query, only)] : []),
        ),
      )
      .groupBy(trafficQueries.query);

  const now = await pick(from, to)
    .orderBy(
      sql`sum(${trafficQueries.clicks}) desc`,
      sql`sum(${trafficQueries.impressions}) desc`,
    )
    .limit(limit);
  if (!now.length) return [];

  // Against the same number of days before, when the site was live for
  // all of them; from launch day on there's nothing to compare with.
  const days = daysFrom(from, to) + 1;
  const [{ first } = { first: null }] = await db
    .select({ first: sql<string | null>`min(${trafficDays.day})::text` })
    .from(trafficDays)
    .where(eq(trafficDays.clientId, clientId));
  const compare = Boolean(first && addDays(from, -days) >= first);
  const before = compare
    ? await pick(
        addDays(from, -days),
        addDays(from, -1),
        now.map((r) => r.query),
      )
    : [];
  const earlier = new Map(before.map((r) => [r.query, r]));
  return now.map((r) => {
    const position = Math.round((r.position ?? 0) * 10) / 10;
    if (!compare)
      return {
        query: r.query,
        clicks: r.clicks,
        impressions: r.impressions,
        position,
      };
    const was = earlier.get(r.query);
    const wasAt = was?.position ? Math.round(was.position * 10) / 10 : 0;
    return {
      query: r.query,
      clicks: r.clicks,
      impressions: r.impressions,
      position,
      ...(was && wasAt
        ? { change: Math.round((wasAt - position) * 10) / 10 }
        : { isNew: true }),
    };
  });
}

export type Reviews = {
  name: string;
  address?: string;
  rating?: number;
  total: number;
  /** New since `since` (the oldest day kept, at most 30 days ago). */
  added?: number;
  since?: string;
  /** The day these are from. */
  day: string;
};

/** Their Google rating and reviews, and how many came in lately. */
export async function loadReviews(
  clientId: string,
  now: Date | string = new Date(),
): Promise<Reviews | undefined> {
  const rows = await db
    .select()
    .from(reviewDays)
    .where(
      and(
        eq(reviewDays.clientId, clientId),
        gte(reviewDays.day, addDays(todayAz(now), -30)),
      ),
    )
    .orderBy(asc(reviewDays.day));
  const latest = rows.at(-1);
  if (!latest) return undefined;
  const oldest = rows[0];
  return {
    name: latest.name,
    address: latest.address ?? undefined,
    rating: latest.rating ?? undefined,
    total: latest.reviews,
    ...(oldest.day < latest.day
      ? {
          added: Math.max(0, latest.reviews - oldest.reviews),
          since: oldest.day,
        }
      : {}),
    day: latest.day,
  };
}

export type GrowthAdmin = {
  /** Why it can't pull at all, if so. */
  keyProblem?: string;
  /** The address to add to their property. */
  email?: string;
  property?: string;
  sync: GrowthSync;
  /** Days of numbers kept, and the first and last of them. */
  stored: number;
  first?: string;
  through?: string;
  placeId?: string;
  reviews?: Reviews;
  /** Visitors each month, for the plan: "2026-10" → 412. */
  monthly: Record<string, number>;
};

/** What the admin's Growth tab shows about the pulls. */
export async function loadGrowthAdmin(
  clientId: string,
  now: Date | string = new Date(),
): Promise<GrowthAdmin> {
  const [site] = await db
    .select({
      property: websites.searchConsoleSite,
      placeId: websites.googlePlaceId,
      sync: websites.growthSync,
    })
    .from(websites)
    .where(eq(websites.clientId, clientId))
    .limit(1);
  const [days] = await db
    .select({
      stored: count(),
      first: sql<string | null>`min(${trafficDays.day})::text`,
      through: max(trafficDays.day),
    })
    .from(trafficDays)
    .where(eq(trafficDays.clientId, clientId));
  const months = await db
    .select({
      month: sql<string>`to_char(${trafficDays.day}, 'YYYY-MM')`,
      clicks: sql<number>`sum(${trafficDays.clicks})::int`,
    })
    .from(trafficDays)
    .where(eq(trafficDays.clientId, clientId))
    .groupBy(sql`to_char(${trafficDays.day}, 'YYYY-MM')`);
  return {
    keyProblem: keyProblem(),
    email: serviceAccountEmail(),
    property: site?.property ?? undefined,
    sync: site?.sync ?? {},
    stored: days?.stored ?? 0,
    first: days?.first ?? undefined,
    through: days?.through ?? undefined,
    placeId: site?.placeId ?? undefined,
    reviews: site?.placeId ? await loadReviews(clientId, now) : undefined,
    monthly: Object.fromEntries(months.map((m) => [m.month, m.clicks])),
  };
}
