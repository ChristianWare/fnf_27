// The admin's Leads Tool page: the markets and their runs, the calendars
// each one reads, which outside services are set up, and what each client
// used this month and roughly what it cost. Server only.

import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { db, schema } from "@/db";
import { firstOfMonth } from "@/lib/dashboard/billing";
import { dayKey } from "@/lib/dashboard/format";
import { accessOf } from "./access";
import { activeMarketIds } from "./runs";
import { STUDIO_ID } from "./kinds";
import { API_NAMES, type Api } from "./usage";
import type { CalendarSource, EventType } from "./types";

const s = schema;

export type AdminSource = {
  id: string;
  label: string;
  url: string;
  source: CalendarSource;
  eventType?: EventType;
  enabled: boolean;
  lastRunAt?: string;
  lastCount?: number;
  lastError?: string;
};

export type AdminRun = {
  id: string;
  day: string;
  trigger: "NIGHTLY" | "MANUAL";
  status: "RUNNING" | "DONE" | "FAILED";
  startedAt: string;
  finishedAt?: string;
  counts: Record<string, number>;
  errors: string[];
  stepsDone: number;
  /** Being worked on right now, not just part done between rounds. */
  working: boolean;
};

export type AdminMarket = {
  id: string;
  name: string;
  city: string;
  state: string;
  radius: number;
  paused: boolean;
  active: boolean;
  firstLoadedAt?: string;
  lastRunAt?: string;
  accounts: number;
  events: number;
  clients: string[];
  runs: AdminRun[];
  sources: AdminSource[];
  /** This month's cost of its nightly runs, in dollars. */
  monthCost: number;
};

export type AdminClientUsage = {
  id: string;
  business: string;
  access: "STUDIO" | "INCLUDED" | "TRIAL" | "ACTIVE" | "NONE";
  status: string;
  enabled: boolean;
  market?: string;
  saved: number;
  savesThisMonth: number;
  /** In dollars, this month. */
  direct: number;
  marketShare: number;
};

export type Services = {
  name: string;
  env: string;
  ready: boolean;
  note: string;
}[];

export function services(): Services {
  const has = (name: string) => Boolean(process.env[name]);
  return [
    {
      name: "Google Places, photos and drive times",
      env: "GOOGLE_MAPS_SERVER_KEY",
      ready: has("GOOGLE_MAPS_SERVER_KEY"),
      note: "Accounts, photos, venues, drive times",
    },
    {
      name: "Google Maps on lead pages",
      env: "NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY",
      ready: has("NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY"),
      note: "The small map (Maps Embed API)",
    },
    {
      name: "Ticketmaster",
      env: "TICKETMASTER_API_KEY",
      ready: has("TICKETMASTER_API_KEY"),
      note: "Concerts, games and shows, nightly",
    },
    {
      name: "Eventbrite (Apify)",
      env: "APIFY_API_TOKEN",
      ready: has("APIFY_API_TOKEN"),
      note: "Business, charity and gala listings, Mondays and Thursdays",
    },
    {
      name: "Google Events (SerpApi)",
      env: "SERPAPI_API_KEY",
      ready: has("SERPAPI_API_KEY"),
      note: "4 searches per market, Mondays",
    },
    {
      name: "Apollo",
      env: "APOLLO_API_KEY",
      ready: has("APOLLO_API_KEY"),
      note: "Decision-makers' work emails, when a lead is saved",
    },
    {
      name: "AI (Claude)",
      env: "ANTHROPIC_API_KEY",
      ready: has("ANTHROPIC_API_KEY"),
      note: "Briefs, scripts, team pages, calendars, news",
    },
    {
      name: "Nightly runs",
      env: "CRON_SECRET",
      ready: has("CRON_SECRET"),
      note: "Vercel's cron calls, 1 to 6 AM Arizona",
    },
  ];
}

export async function getLeadsAdmin() {
  const now = new Date();
  const monthStart = new Date(firstOfMonth(now));
  const monthDay = dayKey(monthStart);

  const [markets, runs, sources, settings, active] = await Promise.all([
    db.select().from(s.leadsMarkets).orderBy(s.leadsMarkets.createdAt),
    db
      .select()
      .from(s.leadsRuns)
      .where(
        gte(s.leadsRuns.startedAt, new Date(now.getTime() - 14 * 86_400_000)),
      )
      .orderBy(desc(s.leadsRuns.startedAt)),
    db.select().from(s.leadsSources).orderBy(s.leadsSources.createdAt),
    db
      .select({
        clientId: s.leadsSettings.clientId,
        marketId: s.leadsSettings.marketId,
      })
      .from(s.leadsSettings),
    activeMarketIds(),
  ]);

  const [placeCounts, eventCounts] = await Promise.all([
    db
      .select({
        marketId: s.leadsPlaces.marketId,
        n: sql<number>`count(*)::int`,
      })
      .from(s.leadsPlaces)
      .where(
        and(eq(s.leadsPlaces.closed, false), isNotNull(s.leadsPlaces.name)),
      )
      .groupBy(s.leadsPlaces.marketId),
    db
      .select({
        marketId: s.leadsEvents.marketId,
        n: sql<number>`count(*)::int`,
      })
      .from(s.leadsEvents)
      .where(
        sql`coalesce(${s.leadsEvents.endsAt}, ${s.leadsEvents.startsAt}) >= now()`,
      )
      .groupBy(s.leadsEvents.marketId),
  ]);

  // Everyone who has (or had) the Leads Tool, and the studio.
  const people = await db
    .select({ client: s.clients, site: s.websites })
    .from(s.clients)
    .leftJoin(s.websites, eq(s.websites.clientId, s.clients.id))
    .where(
      and(
        or(isNull(s.clients.archivedAt), sql`${s.clients.archivedAt} > now()`),
        or(
          eq(s.clients.id, STUDIO_ID),
          ne(s.clients.leadsStatus, "NONE"),
          eq(s.websites.plan, "FULL_PLATFORM"),
          inArray(s.clients.id, settings.map((x) => x.clientId).concat([""])),
        ),
      ),
    );

  const usage = await db
    .select()
    .from(s.leadsUsage)
    .where(gte(s.leadsUsage.day, monthDay));
  const [savedCounts, monthSaves] = await Promise.all([
    db
      .select({
        clientId: s.leadsSaved.clientId,
        n: sql<number>`count(*)::int`,
      })
      .from(s.leadsSaved)
      .groupBy(s.leadsSaved.clientId),
    db
      .select({
        clientId: s.leadsActivity.clientId,
        n: sql<number>`count(*)::int`,
      })
      .from(s.leadsActivity)
      .where(
        and(
          eq(s.leadsActivity.kind, "SAVED"),
          gte(s.leadsActivity.at, monthStart),
        ),
      )
      .groupBy(s.leadsActivity.clientId),
  ]);

  const dollars = (micros: number) => Math.round(micros / 10_000) / 100;
  const marketOf = new Map(settings.map((x) => [x.clientId, x.marketId]));
  const name = new Map(people.map((p) => [p.client.id, p.client.business]));

  const clientRows: AdminClientUsage[] = people.map(({ client, site }) => {
    const access = accessOf(client, site, now);
    return {
      id: client.id,
      business: client.id === STUDIO_ID ? "The studio (you)" : client.business,
      access,
      status:
        client.id === STUDIO_ID
          ? "Free"
          : site?.plan === "FULL_PLATFORM" && access === "INCLUDED"
            ? "Full Platform"
            : site?.plan === "FULL_PLATFORM" && client.leadsStatus === "NONE"
              ? "Plan ended"
              : client.leadsStatus === "TRIAL" && access === "NONE"
                ? "Trial ended"
                : client.leadsStatus.charAt(0) +
                  client.leadsStatus.slice(1).toLowerCase().replace("_", " "),
      enabled: client.leadsEnabled,
      market: markets.find((m) => m.id === marketOf.get(client.id))?.name,
      saved: savedCounts.find((x) => x.clientId === client.id)?.n ?? 0,
      savesThisMonth: monthSaves.find((x) => x.clientId === client.id)?.n ?? 0,
      direct: dollars(
        usage
          .filter((u) => u.clientId === client.id)
          .reduce((sum, u) => sum + u.costMicros, 0),
      ),
      marketShare: 0,
    };
  });

  const marketRows: AdminMarket[] = markets.map((m) => {
    const inMarket = clientRows.filter(
      (c) =>
        marketOf.get(c.id) === m.id &&
        c.access !== "NONE" &&
        (c.enabled || c.access === "STUDIO"),
    );
    const monthCost = dollars(
      usage
        .filter((u) => u.marketId === m.id && !u.clientId)
        .reduce((sum, u) => sum + u.costMicros, 0),
    );
    // The nightly runs' cost, shared by everyone using the market.
    for (const c of inMarket)
      c.marketShare = Math.round((monthCost / inMarket.length) * 100) / 100;
    return {
      id: m.id,
      name: m.name,
      city: m.city,
      state: m.state,
      radius: m.radiusMiles,
      paused: m.paused,
      active: active.includes(m.id),
      firstLoadedAt: m.firstLoadedAt?.toISOString(),
      lastRunAt: m.lastRunAt?.toISOString(),
      accounts: placeCounts.find((x) => x.marketId === m.id)?.n ?? 0,
      events: eventCounts.find((x) => x.marketId === m.id)?.n ?? 0,
      clients: inMarket.map((c) => c.business),
      monthCost,
      runs: runs
        .filter((r) => r.marketId === m.id)
        .slice(0, 6)
        .map((r) => ({
          id: r.id,
          day: r.day,
          trigger: r.trigger,
          status: r.status,
          startedAt: r.startedAt.toISOString(),
          finishedAt: r.finishedAt?.toISOString(),
          counts: r.counts,
          errors: r.errors,
          stepsDone: r.cursor?.done?.length ?? 0,
          working: Boolean(r.lockedUntil && r.lockedUntil > now),
        })),
      sources: sources
        .filter((x) => x.marketId === m.id)
        .map((x) => ({
          id: x.id,
          label: x.label,
          url: x.url,
          source: x.source,
          eventType: x.eventType ?? undefined,
          enabled: x.enabled,
          lastRunAt: x.lastRunAt?.toISOString(),
          lastCount: x.lastCount ?? undefined,
          lastError: x.lastError ?? undefined,
        })),
    };
  });

  // This month, by service.
  const byApi = new Map<string, { calls: number; cost: number }>();
  for (const u of usage) {
    const row = byApi.get(u.api) ?? { calls: 0, cost: 0 };
    row.calls += u.calls;
    row.cost += u.costMicros;
    byApi.set(u.api, row);
  }
  const apis = [...byApi.entries()]
    .map(([api, v]) => ({
      api,
      name: API_NAMES[api as Api] ?? api,
      calls: v.calls,
      cost: dollars(v.cost),
    }))
    .sort((a, b) => b.cost - a.cost || b.calls - a.calls);

  return {
    now: now.toISOString(),
    month: monthStart.toISOString(),
    services: services(),
    markets: marketRows,
    clients: clientRows
      .filter((c) => c.access !== "NONE" || c.saved > 0 || c.id === STUDIO_ID)
      .sort((a, b) =>
        a.id === STUDIO_ID
          ? -1
          : b.id === STUDIO_ID
            ? 1
            : a.business.localeCompare(b.business),
      ),
    apis,
    total: Math.round(apis.reduce((sum, a) => sum + a.cost, 0) * 100) / 100,
    names: Object.fromEntries(name),
  };
}

export type LeadsAdmin = Awaited<ReturnType<typeof getLeadsAdmin>>;
