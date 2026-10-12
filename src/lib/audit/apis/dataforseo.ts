// DataForSEO: Google's results for a search, as a rider in that city would
// see them (the map results, and the ten results under them), and Google
// Ads' estimate of how often each search is made there. Live mode, so each
// answer comes back in seconds. DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD
// are the API login and password from the DataForSEO dashboard. Server only.

import { ApiError, callJson } from "@/lib/leads/apis/http";
import type { Cost } from "../cost";

const API = "https://api.dataforseo.com/v3";

export const seoReady = () =>
  Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);

function authorization() {
  const login = process.env.DATAFORSEO_LOGIN ?? "";
  const password = process.env.DATAFORSEO_PASSWORD ?? "";
  return `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
}

type Task<T> = {
  status_code?: number;
  status_message?: string;
  /** What this task cost, in dollars. */
  cost?: number;
  result?: T[] | null;
};

type Envelope<T> = {
  status_code?: number;
  status_message?: string;
  tasks?: Task<T>[];
};

/** OK, in DataForSEO's own codes. */
const OK = 20000;

async function post<T>(
  path: string,
  body: Record<string, unknown>,
  cost: Cost | undefined,
  fallback: Parameters<Cost["add"]>[0],
) {
  if (!seoReady())
    throw new ApiError("DataForSEO", 0, "DataForSEO isn't set up.");
  const res = await callJson<Envelope<T>>("DataForSEO", `${API}${path}`, {
    method: "POST",
    timeout: 60_000,
    headers: {
      Authorization: authorization(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify([body]),
  });
  const task = res.tasks?.[0];
  if (res.status_code !== undefined && res.status_code !== OK && !task)
    throw new ApiError(
      "DataForSEO",
      res.status_code,
      `DataForSEO said ${res.status_code}: ${res.status_message ?? ""}`,
    );
  if (!task) throw new ApiError("DataForSEO", 0, "DataForSEO sent no answer.");
  if (typeof task.cost === "number") cost?.addMicros(task.cost * 1_000_000);
  else cost?.add(fallback);
  if (task.status_code !== OK)
    throw new ApiError(
      "DataForSEO",
      task.status_code ?? 0,
      `DataForSEO said ${task.status_code}: ${task.status_message ?? ""}`,
    );
  return task.result ?? [];
}

/** Where a search is made from: "Phoenix,Arizona,United States". */
export type Place = { location: string };

/** Monthly searches for each phrase, by lowercase phrase. */
export async function searchVolumes(
  keywords: string[],
  where: Place,
  cost?: Cost,
) {
  const result = await post<{
    keyword?: string;
    search_volume?: number | null;
  }>(
    "/keywords_data/google_ads/search_volume/live",
    {
      keywords: keywords.slice(0, 100),
      location_name: where.location,
      language_code: "en",
    },
    cost,
    "volumes",
  );
  const out = new Map<string, number>();
  for (const row of result) {
    if (row.keyword) out.set(row.keyword.toLowerCase(), row.search_volume ?? 0);
  }
  return out;
}

export type MapsItem = {
  rank: number;
  title: string;
  domain?: string;
  placeId?: string;
  phone?: string;
  rating?: number;
  reviews?: number;
};

type RawItem = {
  type?: string;
  rank_group?: number;
  rank_absolute?: number;
  title?: string;
  domain?: string;
  url?: string;
  place_id?: string;
  phone?: string;
  rating?: { value?: number; votes_count?: number } | null;
  items?: RawItem[];
};

const toMapsItem = (item: RawItem, rank: number): MapsItem => ({
  rank,
  title: item.title ?? "",
  domain: item.domain?.replace(/^www\./i, "").toLowerCase(),
  placeId: item.place_id,
  phone: item.phone,
  rating: item.rating?.value ?? undefined,
  reviews: item.rating?.votes_count ?? undefined,
});

/** The map results for a search, first 20. */
export async function mapsResults(
  keyword: string,
  where: Place,
  cost?: Cost,
): Promise<MapsItem[]> {
  const result = await post<{ items?: RawItem[] | null }>(
    "/serp/google/maps/live/advanced",
    {
      keyword,
      location_name: where.location,
      language_code: "en",
      device: "mobile",
      depth: 20,
    },
    cost,
    "serp",
  );
  return (result[0]?.items ?? [])
    .filter((item) => item.type === "maps_search")
    .map((item, i) => toMapsItem(item, item.rank_group ?? i + 1));
}

export type OrganicItem = { rank: number; domain: string; url?: string };

/**
 * Page one of Google for a search: the ordinary results, and the three
 * map results Google shows at the top (the "local pack"), if it does.
 */
export async function googleResults(
  keyword: string,
  where: Place,
  cost?: Cost,
): Promise<{ organic: OrganicItem[]; pack: MapsItem[] }> {
  const result = await post<{ items?: RawItem[] | null }>(
    "/serp/google/organic/live/advanced",
    {
      keyword,
      location_name: where.location,
      language_code: "en",
      device: "mobile",
      depth: 10,
    },
    cost,
    "serp",
  );
  const items = result[0]?.items ?? [];
  const organic = items
    .filter((item) => item.type === "organic" && item.domain)
    .map((item, i) => ({
      rank: item.rank_group ?? i + 1,
      domain: item.domain!.replace(/^www\./i, "").toLowerCase(),
      url: item.url,
    }));
  const packItem = items.find((item) => item.type === "local_pack");
  const pack = (
    packItem?.items?.length
      ? packItem.items
      : items.filter((item) => item.type === "local_pack")
  ).map((item, i) => toMapsItem(item, i + 1));
  return { organic, pack };
}

/** The account's balance, to check the login works (free). */
export async function balance() {
  const res = await callJson<Envelope<{ money?: { balance?: number } }>>(
    "DataForSEO",
    `${API}/appendix/user_data`,
    {
      timeout: 15_000,
      headers: { Authorization: authorization() },
    },
  );
  const task = res.tasks?.[0];
  if (task?.status_code !== OK)
    throw new ApiError(
      "DataForSEO",
      task?.status_code ?? 0,
      `DataForSEO said ${task?.status_code ?? res.status_code}: ${task?.status_message ?? res.status_message ?? ""}`,
    );
  return task.result?.[0]?.money?.balance;
}
