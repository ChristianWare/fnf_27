// Plausible: everyone who visits each client's site, counted without
// cookies, read through Plausible's Stats API. Server only.
//
// PLAUSIBLE_API_KEY is a Stats API key, made in Plausible under Settings →
// API Keys → New API Key. It reads every site in the team it was made for,
// so each client's site needs to be in that team.

import { ApiError, callJson } from "@/lib/leads/apis/http";

const API = "https://plausible.io/api/v2/query";
/** Rows a page: Plausible's most. */
const PAGE = 10_000;

const apiKey = () => process.env.PLAUSIBLE_API_KEY?.trim() || undefined;

/** What's wrong with the key, if anything. */
export function plausibleProblem() {
  if (!apiKey()) return "PLAUSIBLE_API_KEY isn't set.";
  return undefined;
}

export const plausibleReady = () => !plausibleProblem();

export type Metric = "visitors" | "visits" | "pageviews";

/** One row of an answer: the metrics, then the dimensions, in order. */
export type StatsRow = { metrics: number[]; dimensions: string[] };

export type StatsQuery = {
  /** The site's name in Plausible: "example.com". */
  site: string;
  /** Whole days, in the site's own time zone. */
  from: string;
  to: string;
  metrics: Metric[];
  dimensions?: string[];
  orderBy?: [string, "asc" | "desc"][];
};

/** One question to Plausible, with every page of its answer. */
export async function stats(query: StatsQuery): Promise<StatsRow[]> {
  const key = apiKey();
  if (!key) throw new ApiError("Plausible", 0, plausibleProblem() ?? "");
  const out: StatsRow[] = [];
  for (let page = 0; page < 30; page++) {
    const res = await callJson<{ results?: StatsRow[] }>("Plausible", API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        site_id: query.site,
        metrics: query.metrics,
        date_range: [query.from, query.to],
        dimensions: query.dimensions ?? [],
        ...(query.orderBy ? { order_by: query.orderBy } : {}),
        pagination: { limit: PAGE, offset: page * PAGE },
      }),
      timeout: 40_000,
    });
    const rows = res.results ?? [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

/** Plausible's answer for a site that isn't there, or isn't ours to read. */
export const siteRefused = (error: unknown) =>
  error instanceof ApiError &&
  (error.status === 401 || error.status === 404) &&
  /site/i.test(error.message);

/** The names their site might have in Plausible, most likely first. */
export function siteNames(domain: string) {
  const bare = domain.toLowerCase().replace(/^www\./, "");
  return [bare, `www.${bare}`];
}

/** A site name as typed in the admin: "example.com", nothing else. */
export function cleanSiteName(value: string) {
  const text = value.trim().toLowerCase();
  if (!text) return undefined;
  try {
    const host = new URL(text.includes("://") ? text : `https://${text}`)
      .hostname;
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : undefined;
  } catch {
    return undefined;
  }
}

/** What Plausible's answer means, in words for the admin. */
export function plausibleText(error: unknown, site?: string) {
  if (error instanceof ApiError) {
    if (siteRefused(error))
      return `Plausible won't show ${site ?? "their site"} to our key. Check it's in Plausible under exactly that name, in the same team as the key.`;
    if (error.status === 401 || error.status === 403)
      return `Plausible turned the key down${site ? ` for ${site}` : ""}. Either the key is wrong, or the site is in a different Plausible team than the key. Make a Stats API key in the site's team (Plausible → Settings → API Keys) and put it in PLAUSIBLE_API_KEY.`;
    if (error.status === 402)
      return `Plausible has locked ${site ?? "their site"} until its subscription is sorted out.`;
    if (error.status === 429)
      return "Plausible says we've asked too often this hour (600 questions a key). Tonight's pull catches up.";
    return `Plausible: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}
