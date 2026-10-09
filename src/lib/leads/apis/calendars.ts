// Reading a calendar an admin added: an iCal file, an RSS feed, or an
// events page (schema.org event data, or failing that, the AI reads the
// page). Server only.

import { aiReady, askJson } from "./ai";
import { decodeEntities, pageText, readPage } from "./http";
import type { Who } from "../usage";
import type { RawEvent } from "../classify";
import { goodImage, offerPrices } from "../media";
import type { CalendarSource } from "../types";

export type CalendarRead = {
  format: "ICAL" | "RSS" | "EVENT_DATA" | "AI";
  events: RawEvent[];
};

const AZ = "America/Phoenix";

/** A wall-clock time in a time zone, as a real moment. */
function zoned(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  s: number,
  zone: string,
) {
  const guess = Date.UTC(y, mo, d, h, mi, s);
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(guess));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const asIfUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
    );
    return new Date(guess - (asIfUtc - guess));
  } catch {
    return new Date(guess + 7 * 3_600_000);
  }
}

/* ── iCal ── */

function icalDate(value: string, params: string) {
  const zone = /TZID=([^;:]+)/i.exec(params)?.[1] ?? AZ;
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(
    value.trim(),
  );
  if (!m) return undefined;
  const [, y, mo, d, h, mi, s, z] = m;
  if (h === undefined) {
    return { at: zoned(+y, +mo - 1, +d, 12, 0, 0, AZ), allDay: true };
  }
  const at = z
    ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s ?? 0)))
    : zoned(+y, +mo - 1, +d, +h, +mi, +(s ?? 0), zone);
  return { at, allDay: false };
}

const icalText = (value = "") =>
  value
    .replace(/\\n/gi, "\n")
    .replace(/\\([,;\\])/g, "$1")
    .trim();

export function readIcal(text: string, source: CalendarSource): RawEvent[] {
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const events: RawEvent[] = [];
  let current: Record<string, { value: string; params: string }> | undefined;
  for (const line of lines) {
    if (/^BEGIN:VEVENT/i.test(line)) current = {};
    else if (/^END:VEVENT/i.test(line) && current) {
      const start =
        current.DTSTART &&
        icalDate(current.DTSTART.value, current.DTSTART.params);
      const end =
        current.DTEND && icalDate(current.DTEND.value, current.DTEND.params);
      const name = icalText(current.SUMMARY?.value);
      if (start && name) {
        const location = icalText(current.LOCATION?.value);
        const organizer = /CN="?([^";:]+)/i.exec(
          current.ORGANIZER?.params ?? "",
        )?.[1];
        // RFC 7986's IMAGE, or an image attached to the event.
        const attached =
          current.IMAGE?.value ??
          (/FMTTYPE=image\//i.test(current.ATTACH?.params ?? "")
            ? current.ATTACH?.value
            : undefined);
        events.push({
          key: `${source}:${current.UID?.value ?? `${name}|${start.at.toISOString()}`}`,
          source,
          name,
          startsAt: start.at.toISOString(),
          endsAt: end && !end.allDay ? end.at.toISOString() : undefined,
          allDay: start.allDay,
          venue: location.split(",")[0]?.trim() || undefined,
          address: location || undefined,
          url: current.URL?.value?.trim(),
          organizer,
          description: icalText(current.DESCRIPTION?.value).slice(0, 1000),
          image: goodImage(attached?.trim()),
        });
      }
      current = undefined;
    } else if (current) {
      const m = /^([A-Z-]+)((?:;[^:]*)?):(.*)$/i.exec(line);
      if (m) current[m[1].toUpperCase()] = { params: m[2], value: m[3] };
    }
  }
  return events;
}

/* ── RSS and Atom ── */

const tag = (xml: string, name: string) => {
  const m = new RegExp(
    `<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,
    "i",
  ).exec(xml);
  if (!m) return undefined;
  return decodeEntities(
    m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1"),
  ).trim();
};

/** "10/05/2026", "2026-10-05" or "October 5, 2026", at noon Arizona time. */
function textDates(text: string) {
  const found: Date[] = [];
  const re =
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b|\b(\d{4})-(\d{2})-(\d{2})\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/gi;
  let m: RegExpExecArray | null;
  const months = [
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
  while ((m = re.exec(text)) && found.length < 4) {
    if (m[1]) found.push(zoned(+m[3], +m[1] - 1, +m[2], 12, 0, 0, AZ));
    else if (m[4]) found.push(zoned(+m[4], +m[5] - 1, +m[6], 12, 0, 0, AZ));
    else
      found.push(
        zoned(
          +m[9],
          months.indexOf(m[7].slice(0, 3).toLowerCase()),
          +m[8],
          12,
          0,
          0,
          AZ,
        ),
      );
  }
  return found;
}

const attr = (tagText: string, name: string) =>
  new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i").exec(tagText)?.[1];

/** An item's picture: an image enclosure, media:content, or an <img>. */
function rssImage(item: string, html: string, base?: string) {
  for (const t of item.match(/<enclosure\b[^>]*>/gi) ?? []) {
    const type = attr(t, "type") ?? "";
    const href = attr(t, "url");
    if (
      href &&
      (/^image\//i.test(type) || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(href))
    )
      return goodImage(href, base);
  }
  for (const t of item.match(/<media:(content|thumbnail)\b[^>]*>/gi) ?? []) {
    const href = attr(t, "url");
    const medium = attr(t, "medium") ?? attr(t, "type") ?? "image";
    if (href && /image/i.test(medium)) return goodImage(href, base);
  }
  const img = /<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i.exec(html)?.[1];
  return goodImage(img, base);
}

export function readRss(xml: string, source: CalendarSource): RawEvent[] {
  const items = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];
  const events: RawEvent[] = [];
  for (const item of items) {
    const name = pageText(tag(item, "title") ?? "", 300);
    if (!name) continue;
    const linkTag = tag(item, "link");
    const href = /<link[^>]*href=["']([^"']+)["']/i.exec(item)?.[1];
    const url =
      (linkTag && /^https?:/.test(linkTag) ? linkTag : href) ?? undefined;
    const rawDescription =
      tag(item, "description") ??
      tag(item, "summary") ??
      tag(item, "content") ??
      tag(item, "content:encoded") ??
      "";
    const description = pageText(rawDescription, 1500);
    const image = rssImage(item, rawDescription, url);
    // An explicit start date, if the feed has one…
    const explicit =
      tag(item, "ev:startdate") ??
      tag(item, "startdate") ??
      tag(item, "xCal:dtstart") ??
      tag(item, "event:startdate");
    const explicitEnd = tag(item, "ev:enddate") ?? tag(item, "enddate");
    let start: Date | undefined;
    let end: Date | undefined;
    let allDay = true;
    if (explicit && !Number.isNaN(new Date(explicit).getTime())) {
      start = new Date(explicit);
      allDay = !/T\d/.test(explicit);
      if (explicitEnd && !Number.isNaN(new Date(explicitEnd).getTime()))
        end = new Date(explicitEnd);
    } else {
      // …or the dates written in the description ("10/05/2026 to 10/11/2026").
      const dates = textDates(description);
      if (!dates.length) continue;
      start = dates[0];
      end = dates[1] && dates[1] > dates[0] ? dates[1] : undefined;
    }
    events.push({
      key: `${source}:${url ?? `${name}|${start.toISOString()}`}`,
      source,
      name,
      startsAt: start.toISOString(),
      endsAt: end?.toISOString(),
      allDay,
      url,
      description,
      image,
    });
  }
  return events;
}

/* ── schema.org event data on a page ── */

type Thing = Record<string, unknown>;

function* things(value: unknown): Generator<Thing> {
  if (Array.isArray(value)) {
    for (const v of value) yield* things(v);
  } else if (value && typeof value === "object") {
    const t = value as Thing;
    yield t;
    if (t["@graph"]) yield* things(t["@graph"]);
    if (t.itemListElement) yield* things(t.itemListElement);
    if (t.item && typeof t.item === "object") yield* things(t.item);
  }
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : undefined);

const prices = (p: { min: number; max: number } | undefined) =>
  p ? { priceMin: p.min, priceMax: p.max } : {};

export function readEventData(
  html: string,
  source: CalendarSource,
  base: string,
) {
  const events: RawEvent[] = [];
  const blocks = html.match(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
  );
  for (const block of blocks ?? []) {
    const json = block
      .replace(/^<script[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, "")
      .trim();
    let data: unknown;
    try {
      data = JSON.parse(json);
    } catch {
      continue;
    }
    for (const t of things(data)) {
      const type = [t["@type"]].flat().map(String).join(" ");
      if (!/Event\b|Festival/.test(type)) continue;
      const name = str(t.name);
      const startDate = str(t.startDate);
      if (!name || !startDate || Number.isNaN(new Date(startDate).getTime()))
        continue;
      const place = [t.location].flat()[0] as Thing | undefined;
      const address = place?.address;
      const addressText =
        typeof address === "string"
          ? address
          : address && typeof address === "object"
            ? [
                str((address as Thing).streetAddress),
                str((address as Thing).addressLocality),
                str((address as Thing).addressRegion),
              ]
                .filter(Boolean)
                .join(", ")
            : undefined;
      const geo = place?.geo as Thing | undefined;
      const organizer = [t.organizer].flat()[0] as Thing | undefined;
      const lat = Number(geo?.latitude);
      const lng = Number(geo?.longitude);
      const pageUrl = str(t.url);
      events.push({
        key: `${source}:${pageUrl ?? `${name}|${startDate}`}`,
        source,
        name: decodeEntities(name),
        startsAt: new Date(
          /T\d/.test(startDate) ? startDate : `${startDate}T12:00:00-07:00`,
        ).toISOString(),
        endsAt:
          str(t.endDate) && /T\d/.test(str(t.endDate)!)
            ? new Date(str(t.endDate)!).toISOString()
            : undefined,
        allDay: !/T\d/.test(startDate),
        venue: str(place?.name),
        address: addressText || undefined,
        city:
          address && typeof address === "object"
            ? str((address as Thing).addressLocality)
            : undefined,
        lat: Number.isFinite(lat) && lat ? lat : undefined,
        lng: Number.isFinite(lng) && lng ? lng : undefined,
        organizer: str(organizer?.name),
        organizerUrl: str(organizer?.url),
        url: pageUrl ? new URL(pageUrl, base).toString() : undefined,
        description: str(t.description)?.slice(0, 1000),
        image: goodImage(t.image, base),
        ...prices(offerPrices(t.offers)),
      });
    }
  }
  return events;
}

/* ── Any other events page: the AI reads it ── */

type AiEvents = {
  events: {
    name: string;
    start: string;
    end?: string;
    venue?: string;
    address?: string;
    city?: string;
    organizer?: string;
    url?: string;
  }[];
};

async function readWithAi(
  html: string,
  source: CalendarSource,
  base: string,
  now: Date,
  who: Who,
): Promise<RawEvent[]> {
  const text = pageText(html, 18_000);
  if (text.length < 200) return [];
  const answer = await askJson<AiEvents>({
    model: "fast",
    who,
    maxTokens: 4000,
    system:
      "You read event calendar pages and list the events on them. Only list real, dated, in-person events shown on the page. Never invent anything.",
    prompt: `Today is ${now.toISOString().slice(0, 10)} (Arizona time, UTC-7). List the upcoming events on this page (at most 40). Give each start as an ISO date-time in Arizona time (e.g. 2026-11-05T18:00:00-07:00), or just the date (2026-11-05) when no time is shown. Page address: ${base}\n\nPage text:\n${text}`,
    schema: {
      type: "object",
      properties: {
        events: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              start: { type: "string" },
              end: { type: "string" },
              venue: { type: "string" },
              address: { type: "string" },
              city: { type: "string" },
              organizer: { type: "string" },
              url: { type: "string" },
            },
            required: ["name", "start"],
          },
        },
      },
      required: ["events"],
    },
  });
  const events: RawEvent[] = [];
  for (const e of answer?.events ?? []) {
    const dated = /T\d/.test(e.start) ? e.start : `${e.start}T12:00:00-07:00`;
    const start = new Date(dated);
    if (!e.name || Number.isNaN(start.getTime())) continue;
    let url: string | undefined;
    try {
      url = e.url ? new URL(e.url, base).toString() : undefined;
    } catch {
      url = undefined;
    }
    const end = e.end && /T\d/.test(e.end) ? new Date(e.end) : undefined;
    events.push({
      key: `${source}:${url ?? `${e.name}|${start.toISOString().slice(0, 10)}`}`,
      source,
      name: e.name,
      startsAt: start.toISOString(),
      endsAt:
        end && !Number.isNaN(end.getTime()) ? end.toISOString() : undefined,
      allDay: !/T\d/.test(e.start),
      venue: e.venue,
      address: e.address,
      city: e.city,
      organizer: e.organizer,
      url,
    });
  }
  return events;
}

/** Reads a calendar address, whatever kind it is. Throws with a reason. */
export async function readCalendar(
  address: string,
  source: CalendarSource,
  now: Date,
  who: Who,
): Promise<CalendarRead> {
  const page = await readPage(address, { timeout: 15_000 });
  if (!page) throw new Error("That isn't a public web address.");
  const body = page.body.trimStart();
  if (/^BEGIN:VCALENDAR/i.test(body) || /text\/calendar/i.test(page.type)) {
    return { format: "ICAL", events: readIcal(body, source) };
  }
  if (/^(<\?xml[^>]*>\s*)?<(rss|feed|rdf:RDF)\b/i.test(body)) {
    return { format: "RSS", events: readRss(body, source) };
  }
  const data = readEventData(body, source, page.url);
  if (data.length) return { format: "EVENT_DATA", events: data };
  if (!aiReady())
    throw new Error(
      "No iCal, RSS or event data on that page, and the AI isn't set up to read it.",
    );
  return {
    format: "AI",
    events: await readWithAi(body, source, page.url, now, who),
  };
}
