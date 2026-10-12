// Reading an operator's website for the audit: the homepage, robots.txt,
// the sitemap, and up to 14 more pages picked for what riders look for
// (booking, airport, fleet, the cities they serve…). Pages are read as the
// server sends them, before any script runs: what a search engine or an AI
// crawler sees first. Every address goes through the Leads Tool's safe
// reader, so nothing on our own network is ever fetched. Server only.

import {
  ApiError,
  decodeEntities,
  pageLinks,
  pageText,
  publicUrl,
  readPage,
} from "@/lib/leads/apis/http";
import { BOOKING_SYSTEMS, bookingSystemOf } from "./booking-systems";

export type Field = {
  /** Lowercase words from the field's name, id, placeholder and label. */
  words: string;
  type: string;
};

export type Form = { fields: Field[] };

/** What JSON-LD says about the business. */
export type Schema = {
  types: string[];
  name?: string;
  telephone?: string;
  city?: string;
  region?: string;
  areaServed: string[];
  hours: boolean;
  faq: boolean;
};

export type Page = {
  url: string;
  title: string;
  description: string;
  h1: string[];
  /** The words on the page, without the code. */
  text: string;
  words: number;
  links: { href: string; text: string }[];
  tels: string[];
  /** Ten-digit US numbers found on the page. */
  phones: string[];
  emails: string[];
  forms: Form[];
  iframes: string[];
  scripts: string[];
  schema: Schema[];
  noindex: boolean;
  viewport: boolean;
};

export type Robots = {
  found: boolean;
  groups: { agents: string[]; disallow: string[]; allow: string[] }[];
  sitemaps: string[];
};

export type SiteRead = {
  /** The homepage's address, after redirects. */
  url: string;
  host: string;
  https: boolean;
  home: Page;
  /** The other pages read, homepage not included. */
  pages: Page[];
  robots: Robots;
  /** Every page the sitemap lists (up to 500). */
  sitemap: string[];
  /** Every page of the site we know of (the sitemap and the links), with its link text. */
  known: { url: string; text: string }[];
  platform?: string;
  analytics: string[];
  bookingLinks: { href: string; text: string; internal: boolean }[];
  bookingSystem?: { name: string; href?: string };
};

/* ── Reading the HTML ── */

function attrs(tag: string) {
  const out: Record<string, string> = {};
  const re =
    /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  const inner = tag.replace(/^<[a-zA-Z0-9]+/, "").replace(/\/?>$/, "");
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner))) {
    out[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? m[5] ?? "");
  }
  return out;
}

const tags = (html: string, name: string) =>
  html.match(new RegExp(`<${name}\\b[^>]*>`, "gi")) ?? [];

function meta(html: string) {
  const out = new Map<string, string>();
  for (const tag of tags(html, "meta")) {
    const a = attrs(tag);
    const key = (a.name ?? a.property ?? "").toLowerCase();
    if (key && a.content !== undefined && !out.has(key))
      out.set(key, a.content);
  }
  return out;
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

function schemaOf(html: string): Schema[] {
  const out: Schema[] = [];
  const re =
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  const things: Record<string, unknown>[] = [];
  const collect = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object") {
      const v = value as Record<string, unknown>;
      if (v["@graph"]) collect(v["@graph"]);
      if (v["@type"]) things.push(v);
    }
  };
  while ((m = re.exec(html))) {
    try {
      collect(JSON.parse(m[1].trim()));
    } catch {
      // A broken block: nothing to read.
    }
  }
  const text = (value: unknown): string | undefined =>
    typeof value === "string" ? clean(value) : undefined;
  const list = (value: unknown): string[] =>
    (Array.isArray(value) ? value : value ? [value] : [])
      .map((v) =>
        typeof v === "string"
          ? v
          : v && typeof v === "object"
            ? text((v as Record<string, unknown>).name)
            : undefined,
      )
      .filter((v): v is string => Boolean(v))
      .slice(0, 30);
  for (const t of things) {
    const types = list(t["@type"]);
    const address =
      t.address && typeof t.address === "object"
        ? (t.address as Record<string, unknown>)
        : {};
    out.push({
      types,
      name: text(t.name),
      telephone: text(t.telephone),
      city: text(address.addressLocality),
      region: text(address.addressRegion),
      areaServed: list(t.areaServed),
      hours: Boolean(t.openingHours || t.openingHoursSpecification),
      faq: types.some((type) => /faqpage/i.test(type)),
    });
  }
  return out;
}

const PHONE_RE =
  /(?:\+?1[\s.-]?)?\(?\b([2-9]\d{2})\)?[\s.-]?([2-9]\d{2})[\s.-]?(\d{4})\b/g;

export const digits = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
};

function phonesIn(text: string) {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  PHONE_RE.lastIndex = 0;
  while ((m = PHONE_RE.exec(text)) && out.size < 10)
    out.add(`${m[1]}${m[2]}${m[3]}`);
  return [...out];
}

function formsOf(html: string): Form[] {
  const blocks: string[] = html.match(/<form\b[\s\S]*?<\/form>/gi) ?? [];
  // A booking widget drawn without a <form>: its fields still count.
  if (!blocks.length && tags(html, "input").length >= 3) blocks.push(html);
  return blocks.slice(0, 8).map((block) => {
    const labels = (block.match(/<label\b[^>]*>[\s\S]*?<\/label>/gi) ?? [])
      .map((l) => pageText(l, 200).toLowerCase())
      .join(" ");
    const fields: Field[] = [];
    for (const tag of block.match(/<(input|select|textarea)\b[^>]*>/gi) ?? []) {
      const a = attrs(tag);
      const kind = /^<select/i.test(tag)
        ? "select"
        : /^<textarea/i.test(tag)
          ? "textarea"
          : (a.type ?? "text").toLowerCase();
      if (["hidden", "submit", "button", "image", "reset"].includes(kind))
        continue;
      fields.push({
        type: kind,
        words: [a.name, a.id, a.placeholder, a["aria-label"], a["data-label"]]
          .filter(Boolean)
          .join(" ")
          .replace(/[_\-[\].]+/g, " ")
          .toLowerCase(),
      });
    }
    if (fields.length && labels)
      fields.push({ type: "labels", words: labels.slice(0, 600) });
    return { fields };
  });
}

function srcs(html: string, tag: string) {
  return tags(html, tag)
    .map((t) => {
      const a = attrs(t);
      return a.src || a["data-src"] || a["data-lazy-src"] || "";
    })
    .filter(Boolean)
    .slice(0, 80);
}

function parsePage(html: string, url: string): Page {
  const m = meta(html);
  const title = clean(
    decodeEntities(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ""),
  );
  const h1 = (html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) ?? [])
    .map((h) => pageText(h, 300))
    .filter(Boolean)
    .slice(0, 5);
  const text = pageText(html, 40_000);
  const links = pageLinks(html, url);
  const tels = [
    ...new Set(
      links
        .filter((l) => /^tel:/i.test(l.href))
        .map((l) => digits(decodeURIComponent(l.href.slice(4))))
        .filter((d) => d.length === 10),
    ),
  ];
  const mailto = links
    .filter((l) => /^mailto:/i.test(l.href))
    .map((l) => l.href.slice(7).split("?")[0].toLowerCase());
  const textEmails =
    text
      .match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)
      ?.map((e) => e.toLowerCase()) ?? [];
  const robots = (m.get("robots") ?? "").toLowerCase();
  return {
    url,
    title,
    description: clean(m.get("description") ?? m.get("og:description") ?? ""),
    h1,
    text,
    words: text.split(/\s+/).filter((w) => /[a-z]/i.test(w)).length,
    links: links.filter((l) => /^https?:/i.test(l.href)),
    tels,
    phones: [...new Set([...tels, ...phonesIn(text)])],
    emails: [...new Set([...mailto, ...textEmails])].slice(0, 10),
    forms: formsOf(html),
    iframes: srcs(html, "iframe"),
    scripts: srcs(html, "script"),
    schema: schemaOf(html),
    noindex: /\bnoindex\b/.test(robots),
    viewport: m.has("viewport"),
  };
}

/* ── Which platform, which stats ── */

const PLATFORMS: [RegExp, string][] = [
  [/\/wp-content\/|\/wp-includes\/|wp-json/i, "WordPress"],
  [/static\.wixstatic\.com|wix\.com\/|_wixCIDX|wixsite\.com/i, "Wix"],
  [/squarespace(-cdn)?\.com|static1\.squarespace/i, "Squarespace"],
  [/webflow\.(com|io)|data-wf-page/i, "Webflow"],
  [/img1\.wsimg\.com|godaddy/i, "GoDaddy Website Builder"],
  [/multiscreensite\.com|dudaone|\bduda\b/i, "Duda"],
  [/framerusercontent\.com|framer\.com\/m\//i, "Framer"],
  [/cdn\.shopify\.com/i, "Shopify"],
  [/weebly\.com|editmysite\.com/i, "Weebly"],
  [/zyrosite|hostinger/i, "Hostinger"],
  [/\/_next\/static\//i, "Next.js"],
];

const ANALYTICS: [RegExp, string][] = [
  [
    /googletagmanager\.com\/gtag\/js\?id=G-|gtag\(\s*['"]config['"]\s*,\s*['"]G-/i,
    "Google Analytics",
  ],
  [/googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]{4,}/, "Google Tag Manager"],
  [/connect\.facebook\.net|fbq\(/, "Meta Pixel"],
  [/plausible\.io\/js/i, "Plausible"],
  [/clarity\.ms/i, "Microsoft Clarity"],
  [/static\.hotjar\.com/i, "Hotjar"],
];

/* ── robots.txt ── */

export function parseRobots(text: string): Robots {
  const groups: Robots["groups"] = [];
  const sitemaps: string[] = [];
  let current: Robots["groups"][number] | undefined;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], disallow: [], allow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (field === "sitemap" && value) sitemaps.push(value);
    else if (current && field === "disallow" && value)
      current.disallow.push(value);
    else if (current && field === "allow" && value) current.allow.push(value);
  }
  return { found: true, groups, sitemaps };
}

/** Whether robots.txt keeps this crawler out of the whole site. */
export function blocksSite(robots: Robots, agent: string) {
  const name = agent.toLowerCase();
  const own = robots.groups.filter((g) => g.agents.includes(name));
  const groups = own.length
    ? own
    : robots.groups.filter((g) => g.agents.includes("*"));
  return groups.some(
    (g) =>
      g.disallow.some((path) => path === "/" || path === "/*") &&
      !g.allow.some((path) => path === "/" || path === "/$"),
  );
}

/* ── Fetching ── */

async function fetchText(url: string, timeout = 8_000, limit = 1_200_000) {
  try {
    return await readPage(url, { timeout, limit });
  } catch {
    return undefined;
  }
}

const sameSite = (a: string, b: string) =>
  a.replace(/^www\./i, "").toLowerCase() ===
  b.replace(/^www\./i, "").toLowerCase();

async function readSitemap(url: string) {
  const res = await fetchText(url, 8_000, 3_000_000);
  if (!res || !/<(urlset|sitemapindex)\b/i.test(res.body)) return undefined;
  const locs = [...res.body.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)].map(
    (m) => decodeEntities(m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim()),
  );
  return { index: /<sitemapindex\b/i.test(res.body), locs };
}

/**
 * Every page the sitemap lists, up to 500: the ones robots.txt names, or
 * the usual addresses. An index's own sitemaps are read too, pages first,
 * skipping the lists of images, tags, authors and products.
 */
async function readSitemaps(origin: string, host: string, listed: string[]) {
  const found = new Set<string>();
  const add = (locs: string[]) => {
    for (const loc of locs) {
      const u = publicUrl(loc);
      if (u && sameSite(u.hostname, host) && found.size < 500)
        found.add(u.toString().split("#")[0]);
    }
  };
  const children: string[] = [];
  const sources = listed.length
    ? listed.slice(0, 3)
    : [
        `${origin}/sitemap.xml`,
        `${origin}/sitemap_index.xml`,
        `${origin}/wp-sitemap.xml`,
      ];
  for (const source of sources) {
    const map = await readSitemap(source);
    if (!map) continue;
    if (map.index) children.push(...map.locs);
    else add(map.locs);
    // Guessing: the first address that answers is the sitemap.
    if (!listed.length) break;
  }
  const wanted = children
    .filter(
      (l) => !/image|video|tag|author|categor|product|post_format/i.test(l),
    )
    .sort((a, b) => Number(/page/i.test(b)) - Number(/page/i.test(a)))
    .slice(0, 6);
  for (const child of wanted) {
    if (found.size >= 500) break;
    const map = await readSitemap(child);
    if (map && !map.index) add(map.locs);
  }
  return [...found];
}

/* ── Picking the pages worth reading ── */

const SKIP_PATH =
  /\/(blog|news|tag|tags|category|categories|author|feed|wp-json|wp-admin|cart|checkout|account|login|my-account|privacy|cookie)(\/|$)|\/20\d\d\/|\.(pdf|jpe?g|png|gif|webp|svg|mp4|zip|xml|txt)$/i;

const PAGE_HINTS: [RegExp, number][] = [
  [/book|reserv|quote|get-a-ride|order/i, 10],
  [/airport|transfer|sky-?harbor|phx|\blax\b|sfo|jfk|terminal/i, 8],
  [/fleet|vehicle|our-cars|limousines|suv|sedan|sprinter|party-?bus/i, 8],
  [/faq|questions/i, 7],
  [/service/i, 6],
  [/corporate|business|executive/i, 6],
  [/wedding/i, 6],
  [/rate|pric/i, 6],
  [/area|cities|locations|serving/i, 6],
  [/prom|event|concert|night-out|bachelor|quince|wine|tour/i, 5],
  [/hourly|as-directed/i, 5],
  [/polic|terms|cancel/i, 5],
  [/about/i, 5],
  [/contact/i, 4],
];

function pageScore(url: string, text = "") {
  const where = `${new URL(url).pathname} ${text}`.toLowerCase();
  let best = 0;
  for (const [re, score] of PAGE_HINTS)
    if (re.test(where)) best = Math.max(best, score);
  return best;
}

/** Sites a "book" link can point to that aren't booking. */
const NOT_BOOKING = [
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "youtube.com",
  "youtu.be",
  "tiktok.com",
  "pinterest.com",
  "yelp.com",
  "google.com",
  "goo.gl",
  "g.page",
  "tripadvisor.com",
  "thumbtack.com",
  "weddingwire.com",
  "theknot.com",
  "bbb.org",
  "apple.com",
];

const notBooking = (host: string) =>
  NOT_BOOKING.some((d) => host === d || host.endsWith(`.${d}`));

/**
 * An address that's the business's own website, not a social profile, a
 * directory or a booking system's page.
 */
export function isOwnSite(address: string | undefined) {
  if (!address) return false;
  try {
    const host = new URL(
      /^https?:\/\//i.test(address) ? address : `https://${address}`,
    ).hostname.toLowerCase();
    return !notBooking(host) && !bookingSystemOf(`https://${host}/`);
  } catch {
    return false;
  }
}

const BOOK_WORDS =
  /\b(book|booking|book now|book online|reserve|reservations?|get a quote|request a quote|free quote|instant quote|get a price|get a ride|order a ride|schedule a ride|ride now)\b/i;

/** A browser's name, for a site that turns away anything else. */
const BROWSER_AGENT =
  "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 (compatible; FontsAndFootersAudit/1.0)";

async function readHome(url: string) {
  try {
    return await readPage(url, { timeout: 12_000, limit: 2_000_000 });
  } catch (error) {
    // Some sites (and their firewalls) only answer browsers.
    if (
      error instanceof ApiError &&
      [401, 403, 406, 429, 503].includes(error.status)
    )
      return readPage(url, {
        timeout: 12_000,
        limit: 2_000_000,
        agent: BROWSER_AGENT,
      });
    throw error;
  }
}

/**
 * Just the homepage, for the first step ("is this you?"): quick, so the
 * operator isn't kept waiting. Throws when it can't be read.
 */
export async function readHomepage(address: string) {
  const start = publicUrl(address);
  if (!start) throw new ApiError("website", 0, "That isn't a public website.");
  let res: Awaited<ReturnType<typeof readPage>>;
  try {
    res = await readHome(start.toString());
  } catch (error) {
    if (
      start.protocol !== "https:" ||
      (error instanceof ApiError && error.status >= 400)
    )
      throw error;
    const plain = new URL(start.toString());
    plain.protocol = "http:";
    res = await readHome(plain.toString());
  }
  if (!res || !/html|text\/plain|^$/i.test(res.type))
    throw new ApiError("website", 0, "That address doesn't show a web page.");
  const url = new URL(res.url);
  return {
    url: res.url,
    host: url.hostname,
    page: parsePage(res.body, res.url),
  };
}

const GENERIC_TITLE = /^(home|homepage|welcome|index|main)$/i;

/** The business's name, as the site gives it. */
export function siteName(page: Page, host: string) {
  const fromSchema = page.schema.find((s) => s.name && s.types.length)?.name;
  if (fromSchema && fromSchema.length < 80) return fromSchema;
  const segments = page.title
    .split(/\s+[|–—:·•-]\s+/)
    .map((t) => t.trim())
    .filter((t) => t && !GENERIC_TITLE.test(t));
  // The shortest segment is usually the name ("AZ Limo"), the long one the pitch.
  const short = [...segments].sort((a, b) => a.length - b.length)[0];
  if (short && short.length >= 3 && short.length <= 60) return short;
  return host.replace(/^www\./, "");
}

/** The city and state the site gives in its business details, if any. */
export function siteCity(page: Page) {
  const s = page.schema.find((x) => x.city);
  return s?.city ? { city: s.city, region: s.region } : undefined;
}

/** Reads the site. Throws when the homepage can't be read at all. */
export async function readSite(address: string): Promise<SiteRead> {
  const start = publicUrl(address);
  if (!start) throw new ApiError("website", 0, "That isn't a public website.");

  let homeRes: Awaited<ReturnType<typeof readPage>>;
  try {
    homeRes = await readHome(start.toString());
  } catch (error) {
    // https first; some small sites still only answer on http.
    if (
      start.protocol !== "https:" ||
      (error instanceof ApiError && error.status >= 400)
    )
      throw error;
    const plain = new URL(start.toString());
    plain.protocol = "http:";
    homeRes = await readHome(plain.toString());
  }
  if (!homeRes || !/html|text\/plain|^$/i.test(homeRes.type))
    throw new ApiError("website", 0, "That address doesn't show a web page.");

  const finalUrl = new URL(homeRes.url);
  const origin = finalUrl.origin;
  const host = finalUrl.hostname;
  const home = parsePage(homeRes.body, homeRes.url);
  const html = homeRes.body;

  const platform = PLATFORMS.find(([re]) => re.test(html))?.[1];
  const analytics = ANALYTICS.filter(([re]) => re.test(html)).map(([, n]) => n);

  // robots.txt, then the sitemap it names (or the usual places).
  const robotsRes = await fetchText(`${origin}/robots.txt`, 6_000, 300_000);
  const robots: Robots =
    robotsRes && !/<html/i.test(robotsRes.body.slice(0, 400))
      ? parseRobots(robotsRes.body)
      : { found: false, groups: [], sitemaps: [] };
  const sitemap = await readSitemaps(
    origin,
    host,
    robots.sitemaps
      .map((s) => publicUrl(s)?.toString())
      .filter((s): s is string => Boolean(s)),
  );

  // The site's own pages we know of.
  const internal = new Map<string, string>();
  for (const link of home.links) {
    try {
      const u = new URL(link.href);
      if (!sameSite(u.hostname, host)) continue;
      u.hash = "";
      const key = u.toString().replace(/\/$/, "");
      if (key === homeRes.url.replace(/\/$/, "")) continue;
      if (!internal.has(key)) internal.set(key, link.text);
    } catch {
      // A link we can't read.
    }
  }
  for (const loc of sitemap) {
    const key = loc.replace(/\/$/, "");
    if (!internal.has(key)) internal.set(key, "");
  }
  const known = [...internal.entries()].map(([url, text]) => ({ url, text }));

  // Booking: links that say book or reserve, and links to booking systems.
  const bookingLinks: SiteRead["bookingLinks"] = [];
  for (const link of home.links) {
    let u: URL;
    try {
      u = new URL(link.href);
    } catch {
      continue;
    }
    const isInternal = sameSite(u.hostname, host);
    if (!isInternal && notBooking(u.hostname.toLowerCase())) continue;
    const system = bookingSystemOf(u.toString());
    const says =
      BOOK_WORDS.test(link.text) || /book|reserv|quote/i.test(u.pathname);
    if ((says || system) && !bookingLinks.some((b) => b.href === u.toString()))
      bookingLinks.push({
        href: u.toString(),
        text: link.text,
        internal: isInternal,
      });
    if (bookingLinks.length >= 8) break;
  }

  // Which pages to read: booking pages first, then what riders look for.
  const picks = known
    .filter((k) => !SKIP_PATH.test(new URL(k.url).pathname))
    .map((k, order) => ({ u: k.url, order, score: pageScore(k.url, k.text) }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map((p) => p.u);
  const wanted = [
    ...bookingLinks
      .filter((b) => b.internal)
      .map((b) => b.href.replace(/\/$/, "")),
    ...picks,
  ].filter(
    (u, i, all) => all.indexOf(u) === i && u !== homeRes.url.replace(/\/$/, ""),
  );

  const pages: Page[] = [];
  const list = wanted.slice(0, 14);
  for (let i = 0; i < list.length; i += 4) {
    const batch = await Promise.all(
      list.slice(i, i + 4).map(async (u) => {
        const res = await fetchText(u);
        return res && /html/i.test(res.type)
          ? parsePage(res.body, res.url)
          : undefined;
      }),
    );
    pages.push(...batch.filter((p): p is Page => Boolean(p)));
  }

  // A booking system: linked from the homepage, or embedded on any page.
  let bookingSystem: SiteRead["bookingSystem"];
  for (const link of bookingLinks) {
    const name = bookingSystemOf(link.href);
    if (name) {
      bookingSystem = { name, href: link.href };
      break;
    }
  }
  if (!bookingSystem) {
    for (const page of [home, ...pages]) {
      const src = [...page.iframes, ...page.scripts].find((s) =>
        bookingSystemOf(s),
      );
      if (src) {
        bookingSystem = { name: bookingSystemOf(src)!, href: page.url };
        break;
      }
    }
  }

  return {
    url: homeRes.url,
    host,
    https: finalUrl.protocol === "https:",
    home,
    pages,
    robots,
    sitemap,
    known,
    platform,
    analytics,
    bookingLinks,
    bookingSystem,
  };
}

export { BOOKING_SYSTEMS };
