// What each key can actually do, for Admin → Leads Tool → Services. A key
// that's set but whose API isn't turned on looks fine until the first
// run; this says so straight away, in the service's own words. Each check
// is one small call (the Routes one costs half a cent). Server only.

import { ApiError, call, callJson } from "./http";
import { driveTime, findPlaceId, googleReady } from "./google";
import { eventbriteActor } from "./events";
import { url } from "@/lib/server/config";

export type Check = { ok: boolean; text: string };

const PHOENIX = { lat: 33.4484, lng: -112.074 };
const SCOTTSDALE = { lat: 33.4942, lng: -111.9261 };
const APIFY = "https://api.apify.com/v2";

const said = (error: unknown) =>
  (error instanceof Error ? error.message : String(error))
    .replace(/\s+/g, " ")
    .slice(0, 260);

const unset = (env: string): Check => ({
  ok: false,
  text: `${env} isn't set.`,
});

async function googleServer(): Promise<Check> {
  if (!googleReady()) return unset("GOOGLE_MAPS_SERVER_KEY");
  let id: string | undefined;
  try {
    id = await findPlaceId("Phoenix Convention Center", PHOENIX, {});
  } catch (error) {
    return { ok: false, text: `Places API (New): ${said(error)}` };
  }
  if (!id)
    return {
      ok: false,
      text: "Places API (New) answers, but a test search found nothing.",
    };
  try {
    const route = await driveTime(PHOENIX, SCOTTSDALE, {});
    if (!route)
      return { ok: false, text: "Routes API answers, but gave no route." };
  } catch (error) {
    return {
      ok: false,
      text: `Places API (New) works. Routes API: ${said(error)}`,
    };
  }
  return { ok: true, text: "Places API (New) and the Routes API both answer." };
}

/** The map on lead pages: asked for the way a browser on the site would. */
async function googleEmbed(): Promise<Check> {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
  if (!key) return unset("NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY");
  const site = url("/");
  try {
    const res = await call(
      `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=Phoenix+Convention+Center`,
      { headers: { Referer: site }, timeout: 10_000, retry: false },
    );
    const page = await res.text();
    const rejected = /rejected your request\.?\s*([^<.]{0,200}\.?)/i.exec(page);
    if (rejected)
      return {
        ok: false,
        text: `Maps Embed API, from ${site}: ${rejected[1].trim() || "rejected."}`,
      };
    if (!res.ok)
      return { ok: false, text: `Maps Embed API said ${res.status}.` };
    return { ok: true, text: `Maps Embed API answers for ${site}.` };
  } catch (error) {
    return { ok: false, text: `Maps Embed API: ${said(error)}` };
  }
}

async function ticketmaster(): Promise<Check> {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) return unset("TICKETMASTER_API_KEY");
  try {
    await callJson(
      "Ticketmaster",
      `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${encodeURIComponent(key)}&size=1&city=Phoenix`,
      { retry: false },
    );
    return { ok: true, text: "Answers." };
  } catch (error) {
    return { ok: false, text: said(error) };
  }
}

async function apify(): Promise<Check> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return unset("APIFY_API_TOKEN");
  const t = encodeURIComponent(token);
  const actor = eventbriteActor();
  const hint =
    "Starting it needs a token without limited permissions (Apify → Settings → API & Integrations), or a scoped one with Run on this actor and Read on its runs and datasets.";
  try {
    const me = await callJson<{ data?: { username?: string } }>(
      "Apify",
      `${APIFY}/users/me?token=${t}`,
      { retry: false },
    );
    const act = await callJson<{ data?: { username?: string; name?: string } }>(
      "Apify",
      `${APIFY}/acts/${actor}?token=${t}`,
      { retry: false },
    );
    const name = act.data
      ? `${act.data.username}/${act.data.name}`
      : actor.replace("~", "/");
    return {
      ok: true,
      text: `Signed in as ${me.data?.username ?? "you"}; the ${name} actor is there. ${hint}`,
    };
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 0;
    return {
      ok: false,
      text: `${said(error)}${status === 403 ? ` ${hint}` : ""}`,
    };
  }
}

async function serpapi(): Promise<Check> {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) return unset("SERPAPI_API_KEY");
  try {
    const account = await callJson<{
      plan_name?: string;
      total_searches_left?: number;
      searches_per_month?: number;
    }>(
      "SerpApi",
      `https://serpapi.com/account.json?api_key=${encodeURIComponent(key)}`,
      { retry: false },
    );
    const left =
      typeof account.total_searches_left === "number"
        ? `${account.total_searches_left.toLocaleString("en-US")} searches left this month`
        : "answers";
    return {
      ok: true,
      text: `${account.plan_name ? `${account.plan_name}: ` : ""}${left}.`,
    };
  } catch (error) {
    return { ok: false, text: said(error) };
  }
}

async function apollo(): Promise<Check> {
  const key = process.env.APOLLO_API_KEY;
  if (!key) return unset("APOLLO_API_KEY");
  try {
    const health = await callJson<{ is_logged_in?: boolean }>(
      "Apollo",
      "https://api.apollo.io/api/v1/auth/health",
      {
        headers: { "Cache-Control": "no-cache", "X-Api-Key": key },
        retry: false,
      },
    );
    if (!health.is_logged_in)
      return { ok: false, text: "Apollo doesn't recognise this key." };
    return {
      ok: true,
      text: "Signed in. The people search needs a master key: if saving a lead finds nobody and the run's problems mention the key, make a master key in Apollo → Settings → Integrations → API.",
    };
  } catch (error) {
    return { ok: false, text: said(error) };
  }
}

async function anthropic(): Promise<Check> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return unset("ANTHROPIC_API_KEY");
  try {
    await callJson("AI", "https://api.anthropic.com/v1/models?limit=1", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      retry: false,
    });
    return { ok: true, text: "Answers." };
  } catch (error) {
    return { ok: false, text: said(error) };
  }
}

const CHECKS: Record<string, () => Promise<Check>> = {
  GOOGLE_MAPS_SERVER_KEY: googleServer,
  NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY: googleEmbed,
  TICKETMASTER_API_KEY: ticketmaster,
  APIFY_API_TOKEN: apify,
  SERPAPI_API_KEY: serpapi,
  APOLLO_API_KEY: apollo,
  ANTHROPIC_API_KEY: anthropic,
};

/** Every service at once, by its environment variable. */
export async function checkServices(): Promise<Record<string, Check>> {
  const out: Record<string, Check> = {};
  await Promise.all(
    Object.entries(CHECKS).map(async ([env, check]) => {
      out[env] = await Promise.race([
        check().catch((error): Check => ({ ok: false, text: said(error) })),
        new Promise<Check>((resolve) =>
          setTimeout(
            () => resolve({ ok: false, text: "No answer in 12 seconds." }),
            12_000,
          ),
        ),
      ]);
    }),
  );
  return out;
}
