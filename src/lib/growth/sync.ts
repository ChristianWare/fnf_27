// Every night, each live site's numbers from Google: visitors from search
// (Search Console) and their rating and review count (Google Maps). The
// first pull goes back to launch day, or as far as Search Console keeps
// (16 months); after that each night re-reads the last ten days, since
// Google keeps adjusting recent numbers. Server only.

import { and, eq, gt, isNull, lt, max, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { dayKey } from "@/lib/dashboard/format";
import type { GrowthSync } from "@/lib/dashboard/types";
import { googleReady, listingDetails } from "@/lib/leads/apis/google";
import { flushUsage } from "@/lib/leads/usage";
import {
  addDays,
  addMonths,
  eachDay,
  endOfMonth,
  maxDay,
  minDay,
  startOfMonth,
  todayAz,
  todayPacific,
} from "./dates";
import {
  domainOf,
  keyProblem,
  listSites,
  pickProperty,
  problemText,
  searchAnalytics,
  serviceAccountEmail,
  type SearchRow,
} from "./searchConsole";

const { websites, clients, trafficDays, trafficQueries, reviewDays } = schema;

/** Search Console keeps about 16 months. */
const HISTORY_DAYS = 486;
/** Each night re-reads this many days: Google settles them slowly. */
const REREAD_DAYS = 10;
/** Searches kept a day, most clicks first. */
const SEARCHES_A_DAY = 100;
/** Google Maps' terms: its numbers are kept at most 30 days. */
const REVIEW_DAYS = 30;

async function siteOf(clientId: string) {
  const [row] = await db
    .select()
    .from(websites)
    .where(eq(websites.clientId, clientId))
    .limit(1);
  return row;
}

/** Saves how a pull went, next to the other one's. */
async function noteSync(clientId: string, part: Partial<GrowthSync>) {
  await db
    .update(websites)
    .set({
      growthSync: sql`${websites.growthSync} || ${JSON.stringify(part)}::jsonb`,
    })
    .where(eq(websites.clientId, clientId));
}

export type PullResult =
  | { ok: true; through?: string; days: number; property?: string }
  | { ok: false; error: string };

const round = (n: number, places = 2) => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

/** Search Console's rows can carry very long searches: keep them sane. */
const tidyQuery = (text: string) => text.trim().slice(0, 300);

/** One property's searches, a day at a time, the top ones each day. */
async function searchesBetween(property: string, from: string, to: string) {
  const byDay = new Map<string, Map<string, SearchRow>>();
  for (let page = 0; page < 6; page++) {
    const { rows } = await searchAnalytics(property, {
      startDate: from,
      endDate: to,
      dimensions: ["date", "query"],
      startRow: page * 25_000,
    });
    for (const row of rows) {
      const [day, raw] = row.keys ?? [];
      if (!day || !raw || day < from || day > to) continue;
      const query = tidyQuery(raw);
      const list = byDay.get(day) ?? new Map<string, SearchRow>();
      const seen = list.get(query);
      // Two long searches that start the same way: count them as one.
      if (seen) {
        const impressions = seen.impressions + row.impressions;
        seen.position = impressions
          ? (seen.position * seen.impressions +
              row.position * row.impressions) /
            impressions
          : 0;
        seen.clicks += row.clicks;
        seen.impressions = impressions;
      } else list.set(query, { ...row });
      byDay.set(day, list);
    }
    if (rows.length < 25_000) break;
  }
  const out: {
    day: string;
    query: string;
    clicks: number;
    impressions: number;
    position: number;
  }[] = [];
  for (const [day, list] of byDay) {
    [...list.entries()]
      .sort(
        ([, a], [, b]) => b.clicks - a.clicks || b.impressions - a.impressions,
      )
      .slice(0, SEARCHES_A_DAY)
      .forEach(([query, row]) =>
        out.push({
          day,
          query,
          clicks: Math.round(row.clicks),
          impressions: Math.round(row.impressions),
          position: round(row.position),
        }),
      );
  }
  return out;
}

/**
 * Visitors from Google for one client, from Search Console. `full` reads
 * everything since launch again (the admin's "Pull now").
 */
export async function syncTraffic(
  clientId: string,
  { full = false, now = new Date() } = {},
): Promise<PullResult> {
  const site = await siteOf(clientId);
  if (!site) return { ok: false, error: "They don't have a website plan." };
  const launchedAt = site.facts.launchedAt;
  if (!launchedAt)
    return { ok: false, error: "Their site isn't live yet: nothing to read." };
  const problem = keyProblem();
  if (problem) return { ok: false, error: problem };

  const [{ last } = { last: null }] = await db
    .select({ last: max(trafficDays.day) })
    .from(trafficDays)
    .where(eq(trafficDays.clientId, clientId));
  let property = site.searchConsoleSite ?? undefined;
  const fail = async (error: string): Promise<PullResult> => {
    await noteSync(clientId, {
      traffic: {
        at: now.toISOString(),
        error,
        ...(last ? { through: last } : {}),
      },
    });
    return { ok: false, error };
  };

  try {
    if (!property) {
      const domain = domainOf(site);
      if (!domain)
        return await fail(
          "Add their domain under Site links first, so we know which Search Console property is theirs.",
        );
      property = pickProperty(await listSites(), domain);
      if (!property)
        return await fail(
          `Search Console doesn't show ${domain} to us yet. Add ${serviceAccountEmail()} to its property as a user (Restricted is enough), then pull again.`,
        );
      await db
        .update(websites)
        .set({ searchConsoleSite: property })
        .where(eq(websites.clientId, clientId));
    }

    const today = todayPacific(now);
    const launchDay = dayKey(launchedAt);
    const first = maxDay(launchDay, addDays(today, -HISTORY_DAYS));
    const start =
      full || !last ? first : maxDay(first, addDays(last, -REREAD_DAYS));
    if (start > today) return { ok: true, days: 0, property };

    // Totals by day. Days with nothing at all don't come back: they're 0.
    const totals = await searchAnalytics(property, {
      startDate: start,
      endDate: today,
      dimensions: ["date"],
    });
    const byDay = new Map(totals.rows.map((r) => [r.keys?.[0] ?? "", r]));
    const latest = [...byDay.keys()].sort().at(-1);
    // Only Google's final numbers: up to the day before its first
    // incomplete one.
    const through = totals.firstIncomplete
      ? addDays(totals.firstIncomplete, -1)
      : minDay(latest ?? addDays(today, -3), addDays(today, -2));

    let days = 0;
    if (through >= start) {
      const rows = eachDay(start, through).map((day) => {
        const r = byDay.get(day);
        return {
          clientId,
          day,
          clicks: Math.round(r?.clicks ?? 0),
          impressions: Math.round(r?.impressions ?? 0),
          position: round(r?.position ?? 0),
        };
      });
      days = rows.length;
      for (let i = 0; i < rows.length; i += 500)
        await db
          .insert(trafficDays)
          .values(rows.slice(i, i + 500))
          .onConflictDoUpdate({
            target: [trafficDays.clientId, trafficDays.day],
            set: {
              clicks: sql`excluded.clicks`,
              impressions: sql`excluded.impressions`,
              position: sql`excluded.position`,
            },
          });

      // The searches behind them, a month at a time.
      for (let m = startOfMonth(start); m <= through; m = addMonths(m, 1)) {
        const from = maxDay(m, start);
        const to = minDay(endOfMonth(m), through);
        const found = await searchesBetween(property, from, to);
        await db.transaction(async (tx) => {
          await tx
            .delete(trafficQueries)
            .where(
              and(
                eq(trafficQueries.clientId, clientId),
                sql`${trafficQueries.day} between ${from} and ${to}`,
              ),
            );
          for (let i = 0; i < found.length; i += 1000)
            await tx
              .insert(trafficQueries)
              .values(
                found.slice(i, i + 1000).map((r) => ({ clientId, ...r })),
              );
        });
      }
    }

    // Nothing from before launch, and nothing past Google's final day.
    const keepTo = through >= start ? through : (last ?? through);
    await db
      .delete(trafficDays)
      .where(
        and(
          eq(trafficDays.clientId, clientId),
          or(lt(trafficDays.day, launchDay), gt(trafficDays.day, keepTo)),
        ),
      );
    await db
      .delete(trafficQueries)
      .where(
        and(
          eq(trafficQueries.clientId, clientId),
          or(lt(trafficQueries.day, launchDay), gt(trafficQueries.day, keepTo)),
        ),
      );

    const [{ stored } = { stored: null }] = await db
      .select({ stored: max(trafficDays.day) })
      .from(trafficDays)
      .where(eq(trafficDays.clientId, clientId));
    await noteSync(clientId, {
      traffic: {
        at: now.toISOString(),
        ...(stored ? { through: stored } : {}),
      },
    });
    return { ok: true, through: stored ?? undefined, days, property };
  } catch (error) {
    console.error("[growth] traffic pull failed:", error);
    return await fail(problemText(error, property));
  }
}

/** Their Google rating and review count, once a day. */
export async function syncReviews(
  clientId: string,
  { now = new Date() } = {},
): Promise<PullResult> {
  const site = await siteOf(clientId);
  if (!site?.googlePlaceId) return { ok: true, days: 0 };
  const fail = async (error: string): Promise<PullResult> => {
    await noteSync(clientId, { reviews: { at: now.toISOString(), error } });
    return { ok: false, error };
  };
  if (!googleReady()) return fail("GOOGLE_MAPS_SERVER_KEY isn't set.");
  try {
    const listing = await listingDetails(site.googlePlaceId, { clientId });
    if (!listing)
      return await fail(
        "Google doesn't have that listing any more. Find theirs again.",
      );
    const day = todayAz(now);
    const row = {
      clientId,
      day,
      rating: listing.rating ?? null,
      reviews: listing.reviews,
      name: listing.name,
      address: listing.address ?? null,
    };
    await db
      .insert(reviewDays)
      .values(row)
      .onConflictDoUpdate({
        target: [reviewDays.clientId, reviewDays.day],
        set: {
          rating: row.rating,
          reviews: row.reviews,
          name: row.name,
          address: row.address,
        },
      });
    await noteSync(clientId, { reviews: { at: now.toISOString() } });
    return { ok: true, days: 1 };
  } catch (error) {
    console.error("[growth] reviews pull failed:", error);
    return await fail(error instanceof Error ? error.message : String(error));
  }
}

/** Google Maps' numbers go after 30 days. */
export async function tidyReviews(now = new Date()) {
  await db
    .delete(reviewDays)
    .where(lt(reviewDays.day, addDays(todayAz(now), -REVIEW_DAYS)));
}

/** Both, for one client: the admin's "Pull now". */
export async function syncGrowth(clientId: string, { full = false } = {}) {
  const traffic = await syncTraffic(clientId, { full });
  const reviews = await syncReviews(clientId);
  await flushUsage();
  return { traffic, reviews };
}

/**
 * The nightly pull for every live site (the growth cron). Whoever went
 * longest without one goes first, so a short night still reaches everyone
 * in turn.
 */
export async function nightlyGrowth(budgetMs = 240_000, now = new Date()) {
  const until = Date.now() + budgetMs;
  await tidyReviews(now);
  const rows = await db
    .select({
      clientId: websites.clientId,
      placeId: websites.googlePlaceId,
      sync: websites.growthSync,
    })
    .from(websites)
    .innerJoin(clients, eq(clients.id, websites.clientId))
    .where(
      and(
        sql`${websites.facts} ? 'launchedAt'`,
        or(isNull(clients.archivedAt), gt(clients.archivedAt, now)),
      ),
    );
  rows.sort((a, b) =>
    (a.sync.traffic?.at ?? "").localeCompare(b.sync.traffic?.at ?? ""),
  );

  const report = {
    sites: rows.length,
    traffic: 0,
    reviews: 0,
    skipped: 0,
    problems: [] as string[],
  };
  const trafficOn = !keyProblem();
  const today = todayAz(now);
  for (const row of rows) {
    if (Date.now() > until) {
      report.skipped++;
      continue;
    }
    if (trafficOn) {
      const r = await syncTraffic(row.clientId, { now });
      if (r.ok) report.traffic++;
      else report.problems.push(`${row.clientId}: ${r.error}`);
    }
    // One look a day at most: each one is billed.
    if (
      row.placeId &&
      (row.sync.reviews?.at ? dayKey(row.sync.reviews.at) !== today : true)
    ) {
      const r = await syncReviews(row.clientId, { now });
      if (r.ok) report.reviews++;
      else report.problems.push(`${row.clientId}: ${r.error}`);
    }
  }
  await flushUsage();
  return report;
}
