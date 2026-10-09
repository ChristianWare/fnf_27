// What the Leads Tool's outside services cost, roughly: counted per day,
// per client (saving a lead) or per market (the nightly runs), for the
// admin's Leads Tool page. List prices, before any free monthly credit.
// Server only.

import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { dayKey } from "@/lib/dashboard/format";

export type Api =
  | "places_search"
  | "places_details"
  | "places_basic"
  | "places_photo"
  | "routes"
  | "ticketmaster"
  | "eventbrite"
  | "serpapi"
  | "news"
  | "apollo_search"
  | "apollo_match"
  | "ai"
  | "website";

/** Millionths of a dollar per call, at list price. */
export const PRICE: Record<Api, number> = {
  places_search: 0, // IDs only: no charge
  places_details: 20_000, // Place Details Enterprise, $20 per 1,000
  places_basic: 5_000, // Place Details Essentials, $5 per 1,000
  places_photo: 7_000, // Place Photos, $7 per 1,000
  routes: 5_000, // Compute Routes Essentials, $5 per 1,000
  ticketmaster: 0,
  eventbrite: 4_000, // per event found, $3.99 per 1,000
  serpapi: 15_000, // about $15 per 1,000 searches on a paid plan
  news: 0,
  apollo_search: 0,
  apollo_match: 30_000, // one credit, roughly
  ai: 0, // worked out from the tokens used
  website: 0,
};

export const API_NAMES: Record<Api, string> = {
  places_search: "Google search (IDs only)",
  places_details: "Google place details",
  places_basic: "Google venue lookups",
  places_photo: "Google photos",
  routes: "Google drive times",
  ticketmaster: "Ticketmaster",
  eventbrite: "Eventbrite (Apify)",
  serpapi: "Google Events (SerpApi)",
  news: "Google News",
  apollo_search: "Apollo search",
  apollo_match: "Apollo emails",
  ai: "AI",
  website: "Business websites",
};

/** Who a call was for: a client, a market's run, or both. */
export type Who = { clientId?: string; marketId?: string };

type Row = {
  day: string;
  clientId: string;
  marketId: string;
  api: Api;
  calls: number;
  costMicros: number;
};

const pending = new Map<string, Row>();

/** Counts a call (or several). Saved by flushUsage. */
export function track(api: Api, who: Who = {}, calls = 1, costMicros?: number) {
  const day = dayKey(new Date());
  const clientId = who.clientId ?? "";
  const marketId = who.marketId ?? "";
  const key = `${day}|${clientId}|${marketId}|${api}`;
  const row = pending.get(key) ?? {
    day,
    clientId,
    marketId,
    api,
    calls: 0,
    costMicros: 0,
  };
  row.calls += calls;
  row.costMicros += Math.round(costMicros ?? PRICE[api] * calls);
  pending.set(key, row);
}

/** Saves what's been counted. Never throws. */
export async function flushUsage() {
  if (!pending.size) return;
  const rows = [...pending.values()];
  pending.clear();
  try {
    await db
      .insert(schema.leadsUsage)
      .values(rows)
      .onConflictDoUpdate({
        target: [
          schema.leadsUsage.day,
          schema.leadsUsage.clientId,
          schema.leadsUsage.marketId,
          schema.leadsUsage.api,
        ],
        set: {
          calls: sql`${schema.leadsUsage.calls} + excluded.calls`,
          costMicros: sql`${schema.leadsUsage.costMicros} + excluded.cost_micros`,
        },
      });
  } catch (error) {
    console.error("[leads] couldn't save usage:", error);
  }
}
