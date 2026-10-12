// Google's PageSpeed Insights: opens a page on a mid-range phone, the way
// Google's own speed test does, and says how long it took. It also hands
// back a screenshot of the first screen and every file the page loaded,
// which is how the audit finds a booking widget that a script adds after
// the page loads. Free; PAGESPEED_API_KEY raises the daily limit (without
// one, Google's shared limit runs out fast). Server only.

import { ApiError, callJson } from "@/lib/leads/apis/http";
import type { Cost } from "../cost";

const PSI = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export type Speed =
  | {
      ok: true;
      /** Google's performance score, 0 to 100. */
      score?: number;
      /** Until the main image or text shows, in milliseconds. */
      lcpMs?: number;
      fcpMs?: number;
      /** Everything the page downloaded, in bytes. */
      bytes?: number;
      /** Real visitors on phones, when Google has enough of them. */
      field?: { lcpMs?: number; category?: string; origin: boolean };
      /** The first screen on a phone, as a data: URL (a JPEG). */
      screenshot?: string;
      requests: { url: string; type?: string; bytes: number }[];
    }
  | { ok: false; error: string };

type Audit = {
  numericValue?: number;
  details?: {
    data?: string;
    items?: { url?: string; resourceType?: string; transferSize?: number }[];
  };
};

type Response = {
  lighthouseResult?: {
    runtimeError?: { code?: string; message?: string };
    categories?: { performance?: { score?: number | null } };
    audits?: Record<string, Audit | undefined>;
  };
  loadingExperience?: {
    origin_fallback?: boolean;
    metrics?: {
      LARGEST_CONTENTFUL_PAINT_MS?: { percentile?: number; category?: string };
    };
  };
};

async function once(url: string, timeout: number) {
  const params = new URLSearchParams({
    url,
    strategy: "mobile",
    category: "performance",
  });
  const key = process.env.PAGESPEED_API_KEY;
  if (key) params.set("key", key);
  return callJson<Response>("PageSpeed", `${PSI}?${params}`, {
    timeout,
    retry: false,
  });
}

/** One page on a phone. Never throws: a failure comes back as ok: false. */
export async function pageSpeed(url: string, cost?: Cost): Promise<Speed> {
  const started = Date.now();
  let data: Response | undefined;
  let error = "";
  // A quick failure (Google busy) gets one more go; a slow one doesn't.
  for (let attempt = 0; attempt < 2 && !data; attempt++) {
    try {
      data = await once(url, 90_000);
      cost?.add("pagespeed");
    } catch (e) {
      error =
        e instanceof ApiError
          ? e.message
          : e instanceof Error && e.name === "AbortError"
            ? "PageSpeed took too long."
            : String(e);
      if (Date.now() - started > 40_000) break;
    }
  }
  if (!data) return { ok: false, error };

  const lh = data.lighthouseResult;
  if (!lh) return { ok: false, error: "PageSpeed sent no result." };
  const runtime = lh.runtimeError?.code;
  if (runtime && runtime !== "NO_ERROR")
    return { ok: false, error: lh.runtimeError?.message ?? runtime };

  const audits = lh.audits ?? {};
  const value = (id: string) => audits[id]?.numericValue;
  const perf = lh.categories?.performance?.score;
  const lcp = data.loadingExperience?.metrics?.LARGEST_CONTENTFUL_PAINT_MS;
  const shot = audits["final-screenshot"]?.details?.data;

  return {
    ok: true,
    score: typeof perf === "number" ? Math.round(perf * 100) : undefined,
    lcpMs: value("largest-contentful-paint"),
    fcpMs: value("first-contentful-paint"),
    bytes: value("total-byte-weight"),
    field:
      lcp?.percentile !== undefined
        ? {
            lcpMs: lcp.percentile,
            category: lcp.category,
            origin: Boolean(data.loadingExperience?.origin_fallback),
          }
        : undefined,
    screenshot:
      typeof shot === "string" && shot.startsWith("data:image/")
        ? shot
        : undefined,
    requests: (audits["network-requests"]?.details?.items ?? [])
      .filter((item) => typeof item.url === "string")
      .slice(0, 400)
      .map((item) => ({
        url: item.url!,
        type: item.resourceType,
        bytes: item.transferSize ?? 0,
      })),
  };
}
