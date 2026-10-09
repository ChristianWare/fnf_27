// Where events come from: Ticketmaster, Eventbrite (through Apify) and
// Google Events (through SerpApi). Calendars an admin adds are read in
// calendars.ts. Server only.

import { callJson } from "./http";
import { track, type Who } from "../usage";
import { eventKind, type RawEvent } from "../classify";

/* ── Ticketmaster: concerts, games and shows ── */

type TmEvent = {
  id: string;
  name: string;
  url?: string;
  dates?: {
    start?: {
      localDate?: string;
      dateTime?: string;
      dateTBD?: boolean;
      timeTBA?: boolean;
    };
    end?: { localDate?: string; dateTime?: string };
  };
  classifications?: {
    segment?: { name?: string };
    genre?: { name?: string };
  }[];
  promoter?: { name?: string };
  _embedded?: {
    venues?: {
      name?: string;
      address?: { line1?: string };
      city?: { name?: string };
      state?: { stateCode?: string };
      location?: { latitude?: string; longitude?: string };
    }[];
  };
};

export const ticketmasterReady = () =>
  Boolean(process.env.TICKETMASTER_API_KEY);

/** "2026-10-09T07:00:00Z", the way Ticketmaster wants it. */
const tmTime = (date: Date) => `${date.toISOString().slice(0, 19)}Z`;

export async function ticketmasterEvents(
  center: { lat: number; lng: number },
  radiusMiles: number,
  from: Date,
  days: number,
  who: Who,
): Promise<RawEvent[]> {
  const key = process.env.TICKETMASTER_API_KEY;
  if (!key) return [];
  const to = new Date(from.getTime() + days * 86_400_000);
  const events: RawEvent[] = [];
  for (let page = 0; page < 5; page++) {
    const params = new URLSearchParams({
      apikey: key,
      latlong: `${center.lat},${center.lng}`,
      radius: String(radiusMiles),
      unit: "miles",
      startDateTime: tmTime(from),
      endDateTime: tmTime(to),
      size: "200",
      page: String(page),
      sort: "date,asc",
      locale: "*",
    });
    const res = await callJson<{
      _embedded?: { events?: TmEvent[] };
      page?: { totalPages?: number };
    }>(
      "Ticketmaster",
      `https://app.ticketmaster.com/discovery/v2/events.json?${params}`,
    );
    track("ticketmaster", who);
    for (const e of res._embedded?.events ?? []) {
      const venue = e._embedded?.venues?.[0];
      const start = e.dates?.start;
      const startsAt =
        start?.dateTime ??
        (start?.localDate ? `${start.localDate}T19:00:00.000Z` : undefined);
      if (!startsAt) continue;
      const segment = e.classifications?.[0]?.segment?.name ?? "";
      const genre = e.classifications?.[0]?.genre?.name ?? "";
      const type = /golf/i.test(genre)
        ? "TOURNAMENT"
        : /music|sports|arts/i.test(segment)
          ? "CONCERT"
          : eventKind(e.name, "", "CONCERT");
      const lat = Number(venue?.location?.latitude);
      const lng = Number(venue?.location?.longitude);
      events.push({
        key: `TICKETMASTER:${e.id}`,
        source: "TICKETMASTER",
        name: e.name,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: e.dates?.end?.dateTime
          ? new Date(e.dates.end.dateTime).toISOString()
          : undefined,
        allDay: Boolean(!start?.dateTime || start?.timeTBA),
        venue: venue?.name,
        address: [
          venue?.address?.line1,
          venue?.city?.name,
          venue?.state?.stateCode,
        ]
          .filter(Boolean)
          .join(", "),
        city: venue?.city?.name,
        lat: Number.isFinite(lat) && lat !== 0 ? lat : undefined,
        lng: Number.isFinite(lng) && lng !== 0 ? lng : undefined,
        organizer: e.promoter?.name ?? venue?.name,
        url: e.url,
        type,
      });
    }
    if (page + 1 >= (res.page?.totalPages ?? 1)) break;
  }
  return events;
}

/* ── Eventbrite, through an Apify actor ──
 *
 * Apify runs take minutes, so a run is started early in the night and
 * collected at the end. */

const APIFY = "https://api.apify.com/v2";
export const apifyReady = () => Boolean(process.env.APIFY_API_TOKEN);
/** The actor's id the way Apify's API wants it: "scrapio~eventbrite-scraper". */
export const eventbriteActor = () =>
  (process.env.APIFY_EVENTBRITE_ACTOR ?? "scrapio/eventbrite-scraper").replace(
    "/",
    "~",
  );
const actor = eventbriteActor;

/** Eventbrite's address for a city: "az--phoenix". */
export const eventbriteSlug = (city: string, state: string) =>
  `${state.toLowerCase()}--${city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

/** Starts a scrape of the city's business, charity and gala listings. */
export async function startEventbrite(city: string, state: string, who: Who) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return undefined;
  const slug = eventbriteSlug(city, state);
  const base = `https://www.eventbrite.com/d/${slug}`;
  const res = await callJson<{ data?: { id?: string } }>(
    "Apify",
    `${APIFY}/acts/${actor()}/runs?token=${encodeURIComponent(token)}&timeout=900`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searchMode: "url",
        startUrls: [
          { url: `${base}/business--events/` },
          { url: `${base}/charity-and-causes--events/` },
          { url: `${base}/gala/` },
          { url: `${base}/conference/` },
        ],
        maxPage: 2,
        proxy: { useApifyProxy: true },
      }),
    },
  );
  track("eventbrite", who, 1, 0);
  return res.data?.id;
}

type EbItem = {
  id?: string | number;
  url?: string;
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  eventAttendanceMode?: string;
  location?: {
    name?: string;
    address?:
      | string
      | {
          streetAddress?: string;
          addressLocality?: string;
          addressRegion?: string;
        };
    geo?: { latitude?: number | string; longitude?: number | string };
  };
  organizer?: { name?: string; url?: string };
};

/**
 * The events from a scrape: undefined while it's still running, an empty
 * list if it failed.
 */
export async function collectEventbrite(runId: string, who: Who) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return [];
  const run = await callJson<{
    data?: { status?: string; defaultDatasetId?: string };
  }>(
    "Apify",
    `${APIFY}/actor-runs/${runId}?token=${encodeURIComponent(token)}`,
  );
  const status = run.data?.status ?? "";
  if (status === "READY" || status === "RUNNING") return undefined;
  if (status !== "SUCCEEDED" || !run.data?.defaultDatasetId) return [];
  const items = await callJson<EbItem[]>(
    "Apify",
    `${APIFY}/datasets/${run.data.defaultDatasetId}/items?token=${encodeURIComponent(token)}&clean=true&limit=1000`,
  );
  track("eventbrite", who, items.length);
  const events: RawEvent[] = [];
  for (const e of items) {
    if (!e.name || !e.startDate) continue;
    if (/online/i.test(e.eventAttendanceMode ?? "")) continue;
    const address =
      typeof e.location?.address === "string"
        ? e.location.address
        : [
            e.location?.address?.streetAddress,
            e.location?.address?.addressLocality,
            e.location?.address?.addressRegion,
          ]
            .filter(Boolean)
            .join(", ");
    const city =
      typeof e.location?.address === "object"
        ? e.location.address.addressLocality
        : undefined;
    const lat = Number(e.location?.geo?.latitude);
    const lng = Number(e.location?.geo?.longitude);
    const start = new Date(e.startDate);
    if (Number.isNaN(start.getTime())) continue;
    events.push({
      key: `EVENTBRITE:${e.id ?? e.url}`,
      source: "EVENTBRITE",
      name: e.name,
      startsAt: start.toISOString(),
      endsAt: e.endDate ? new Date(e.endDate).toISOString() : undefined,
      allDay: !/T\d/.test(e.startDate),
      venue: e.location?.name,
      address,
      city,
      lat: Number.isFinite(lat) && lat ? lat : undefined,
      lng: Number.isFinite(lng) && lng ? lng : undefined,
      organizer: e.organizer?.name,
      organizerUrl: e.organizer?.url,
      url: e.url,
      description: e.description?.slice(0, 1000),
    });
  }
  return events;
}

/* ── Google Events, through SerpApi (weekly: 250 free searches a month) ── */

export const serpReady = () => Boolean(process.env.SERPAPI_API_KEY);

type SerpEvent = {
  title?: string;
  date?: { start_date?: string; when?: string };
  address?: string[];
  link?: string;
  description?: string;
  venue?: { name?: string };
};

const MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

/** Arizona time to UTC, for a date and an hour we read from text. */
function azTime(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
) {
  return new Date(Date.UTC(year, month, day, hour + 7, minute));
}

/** "Fri, Oct 17, 6 – 10 PM" → a start (and end) in Arizona time. */
export function readWhen(text: string, now: Date) {
  const m = /([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})/.exec(text);
  if (!m) return undefined;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  if (month < 0) return undefined;
  const day = Number(m[2]);
  const local = new Date(now.getTime() - 7 * 3_600_000);
  let year = local.getUTCFullYear();
  // A date more than a month in the past is next year's.
  if (
    Date.UTC(year, month, day) <
    Date.UTC(year, local.getUTCMonth(), local.getUTCDate()) - 30 * 86_400_000
  )
    year++;
  const times = [...text.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/gi)]
    .filter((t) => t.index! > m.index + m[0].length)
    .map((t) => ({
      h: Number(t[1]),
      m: Number(t[2] ?? 0),
      ap: t[3]?.toUpperCase(),
    }));
  // "6 – 10 PM": the first time takes the second's AM or PM.
  const ap = times.find((t) => t.ap)?.ap;
  const first = times[0];
  if (!first || !ap || first.h > 12) {
    return { start: azTime(year, month, day, 12), allDay: true };
  }
  const hour = (first.h % 12) + ((first.ap ?? ap) === "PM" ? 12 : 0);
  const start = azTime(year, month, day, hour, first.m);
  const second = times[1];
  const end =
    second && second.ap
      ? azTime(
          year,
          month,
          day,
          (second.h % 12) + (second.ap === "PM" ? 12 : 0),
          second.m,
        )
      : undefined;
  return {
    start,
    end: end && end > start ? end : undefined,
    allDay: false,
  };
}

export async function googleEvents(
  queries: string[],
  now: Date,
  who: Who,
): Promise<RawEvent[]> {
  const key = process.env.SERPAPI_API_KEY;
  if (!key) return [];
  const events: RawEvent[] = [];
  for (const q of queries) {
    const params = new URLSearchParams({
      engine: "google_events",
      q,
      hl: "en",
      gl: "us",
      api_key: key,
    });
    const res = await callJson<{ events_results?: SerpEvent[] }>(
      "SerpApi",
      `https://serpapi.com/search.json?${params}`,
      { timeout: 30_000 },
    );
    track("serpapi", who);
    for (const e of res.events_results ?? []) {
      if (!e.title) continue;
      const when = readWhen(e.date?.when ?? e.date?.start_date ?? "", now);
      if (!when) continue;
      const address = e.address ?? [];
      const city = /^([^,]+),\s*[A-Z]{2}\b/.exec(
        address[address.length - 1] ?? "",
      )?.[1];
      events.push({
        key: `GOOGLE:${e.link ?? `${e.title}|${when.start.toISOString()}`}`,
        source: "GOOGLE",
        name: e.title,
        startsAt: when.start.toISOString(),
        endsAt: when.end?.toISOString(),
        allDay: when.allDay,
        venue: e.venue?.name ?? address[0]?.split(",")[0],
        address: address.join(", "),
        city,
        url: e.link,
        description: e.description,
      });
    }
  }
  return events;
}
