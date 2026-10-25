// Reading a list of operators to call: a CSV or a spreadsheet paste, a
// Markdown table, or plain lines ("AZ Limo · 480-725-2427 · azlimo.com").
// Columns are matched by name, so most sheets import as they are. Safe
// anywhere.

import { headerKey, num, parseCsv } from "@/lib/csv";
import { formatPhone } from "@/lib/phone";

export type ProspectInput = {
  business: string;
  contactName?: string;
  phone?: string;
  email?: string;
  website?: string;
  mapsUrl?: string;
  city?: string;
  state?: string;
  rating?: number;
  reviews?: number;
  tags: string[];
  notes?: string;
};

type Field = keyof Omit<ProspectInput, "tags"> | "tags" | "tag";

const ALIASES: Record<string, Field> = {
  business: "business",
  businessname: "business",
  company: "business",
  companyname: "business",
  name: "business",
  operator: "business",
  title: "business",
  contact: "contactName",
  contactname: "contactName",
  owner: "contactName",
  person: "contactName",
  firstname: "contactName",
  phone: "phone",
  phonenumber: "phone",
  tel: "phone",
  telephone: "phone",
  mobile: "phone",
  cell: "phone",
  email: "email",
  emailaddress: "email",
  website: "website",
  site: "website",
  url: "website",
  web: "website",
  domain: "website",
  maps: "mapsUrl",
  mapsurl: "mapsUrl",
  googlemaps: "mapsUrl",
  mapslink: "mapsUrl",
  gbp: "mapsUrl",
  city: "city",
  town: "city",
  state: "state",
  rating: "rating",
  stars: "rating",
  reviews: "reviews",
  reviewcount: "reviews",
  tags: "tags",
  tag: "tags",
  segment: "tag",
  region: "tag",
  category: "tag",
  notes: "notes",
  note: "notes",
  comments: "notes",
};

const PHONE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const EMAIL = /[^\s@<>()|,;]+@[^\s@<>()|,;]+\.[a-z]{2,}/i;
const URL_RE = /(https?:\/\/[^\s|,;]+|\b[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|net|org|us|co|biz|limo|io)\b[^\s|,;]*)/i;

const clean = (v?: string) => (v ?? "").replace(/\s+/g, " ").trim();
const blank = (v?: string) => !v || v === "-" || /^n\/?a$/i.test(v);

/** "https://www.azlimo.com/about" → "azlimo.com". */
export function domainOf(value?: string | null) {
  if (!value) return null;
  const host = value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split(/[/?#\s]/)[0]
    .toLowerCase();
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host) ? host : null;
}

const isMaps = (v: string) => /google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(v);

/** The ten digits of a US number, or null. */
export function phoneDigits(value?: string | null) {
  if (!value) return null;
  let d = value.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d.length === 10 ? d : null;
}

/** One row, trimmed to size and checked. Null without a business name. */
export function tidy(p: ProspectInput): ProspectInput | null {
  const business = clean(p.business).slice(0, 160);
  if (business.length < 2) return null;
  let website = blank(p.website) ? undefined : clean(p.website);
  let mapsUrl = blank(p.mapsUrl) ? undefined : clean(p.mapsUrl);
  if (website && isMaps(website)) [mapsUrl, website] = [website, undefined];
  if (mapsUrl && !/^https?:\/\//i.test(mapsUrl)) mapsUrl = undefined;
  const phone = blank(p.phone) ? undefined : clean(p.phone);
  const email = clean(p.email).toLowerCase().match(EMAIL)?.[0];
  const state = clean(p.state).toUpperCase();
  return {
    business,
    contactName: clean(p.contactName).slice(0, 120) || undefined,
    phone: phone ? (phoneDigits(phone) ? formatPhone(phone) : phone.slice(0, 40)) : undefined,
    email,
    website: website?.slice(0, 300),
    mapsUrl: mapsUrl?.slice(0, 600),
    city: clean(p.city).slice(0, 80) || undefined,
    state: /^[A-Z]{2}$/.test(state) ? state : undefined,
    rating: p.rating && p.rating > 0 && p.rating <= 5 ? p.rating : undefined,
    reviews: p.reviews && p.reviews > 0 ? Math.round(p.reviews) : undefined,
    tags: [...new Set(p.tags.map(clean).filter(Boolean))].slice(0, 12),
    notes: clean(p.notes).slice(0, 2000) || undefined,
  };
}

function fromTable(rows: string[][]): ProspectInput[] | null {
  // The header can sit a few rows down, under a title.
  const at = rows
    .slice(0, 8)
    .findIndex((r) => r.filter((c) => ALIASES[headerKey(c)]).length >= 2);
  if (at < 0) return null;
  const head = rows[at].map((h) => ({ h, f: ALIASES[headerKey(h)] }));
  if (!head.some((x) => x.f === "business")) return null;
  return rows.slice(at + 1).map((r) => {
    const p: ProspectInput = { business: "", tags: [] };
    head.forEach(({ h, f }, i) => {
      const v = r[i] ?? "";
      if (!f || blank(v)) return;
      if (f === "tags") p.tags.push(...v.split(/[;|]/));
      else if (f === "tag")
        p.tags.push(/segment/i.test(h) && v.length <= 2 ? `Segment ${v}` : v);
      else if (f === "rating" || f === "reviews") p[f] = num(v);
      else if (f === "website" && p.website && isMaps(p.website)) {
        p.mapsUrl = p.website;
        p.website = v;
      } else if (!p[f]) (p as Record<string, unknown>)[f] = v;
    });
    return p;
  });
}

/** "| a | b |" rows → cells. Separator rows are dropped. */
function markdownRows(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("|") && !/^\|[\s:|-]+\|?$/.test(l))
    .map((l) =>
      l
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.replace(/\*\*|__|`/g, "").replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$2").trim()),
    );
}

/** A line with no columns: pull out the phone, email and site; the rest is the name. */
function fromLine(line: string): ProspectInput {
  let rest = line.replace(/^[-*•\d.)\s]+/, "");
  const take = (re: RegExp) => {
    const m = rest.match(re)?.[0];
    if (m) rest = rest.replace(m, " ");
    return m;
  };
  const email = take(EMAIL);
  const site = take(URL_RE);
  const phone = take(PHONE);
  const [business, ...more] = rest
    .split(/\s[-–—·|]\s|\t|,|\s{2,}/)
    .map((x) => x.trim())
    .filter(Boolean);
  return {
    business: business ?? "",
    phone,
    email,
    website: site,
    tags: [],
    notes: more.join(" · ") || undefined,
  };
}

/** Everything in an import, tidied. Rows with no business name are dropped. */
export function parseProspects(text: string, name = ""): ProspectInput[] {
  const src = text.replace(/\r\n?/g, "\n");
  let raw: ProspectInput[] | null = null;
  if (/\.md$/i.test(name) || /^\s*\|.+\|\s*$/m.test(src)) {
    const md = markdownRows(src);
    if (md.length >= 2) raw = fromTable(md);
  }
  if (!raw) raw = fromTable(parseCsv(src));
  if (!raw)
    raw = src
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
      .map(fromLine);
  return raw.map(tidy).filter((p): p is ProspectInput => p !== null);
}

/** What makes two rows the same operator: the phone, the site or the name. */
export function matchKeys(p: {
  business: string;
  city?: string | null;
  phone?: string | null;
  website?: string | null;
}) {
  const keys: string[] = [];
  const d = phoneDigits(p.phone);
  if (d) keys.push(`p:${d}`);
  const dom = domainOf(p.website);
  if (dom) keys.push(`d:${dom}`);
  keys.push(
    `n:${p.business.toLowerCase().replace(/\b(llc|inc|co|the)\b|[^a-z0-9]/g, "")}|${(p.city ?? "").toLowerCase()}`,
  );
  return keys;
}

/* ── Chrome bookmarks ──
 *
 * Chrome → Bookmarks → Bookmark manager → ⋮ → Export bookmarks gives an
 * HTML file of folders (<H3>) and links (<A HREF>). Each folder is offered
 * on its own, so only the prospects folder is imported. */

export type BookmarkFolder = { path: string; items: ProspectInput[] };

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

/** A bookmark's title, without the site's tagline: "AZ Limo | Phoenix Limo Service" → "AZ Limo". */
function bookmarkName(title: string, href: string) {
  const place = href.match(/\/maps\/place\/([^/@?]+)/)?.[1];
  if (place) return decodeURIComponent(place.replace(/\+/g, " "));
  const t = title.replace(/\s*[-–—]\s*Google Maps$/i, "").trim();
  const first = t.split(/\s[|–—]\s|\s-\s/)[0]?.trim();
  return first && first.length >= 2 ? first : t || (domainOf(href) ?? "");
}

export const isBookmarks = (text: string) =>
  /<!DOCTYPE NETSCAPE-Bookmark-file/i.test(text) || /<DT><A HREF=/i.test(text);

export function parseBookmarks(html: string): BookmarkFolder[] {
  const folders = new Map<string, ProspectInput[]>();
  const stack: string[] = [];
  let pending: string | null = null;
  const token = /<H3[^>]*>([\s\S]*?)<\/H3>|<A\s+[^>]*HREF="([^"]+)"[^>]*>([\s\S]*?)<\/A>|<DL>|<\/DL>/gi;
  for (const m of html.matchAll(token)) {
    const t = m[0].toUpperCase();
    if (m[1] !== undefined) pending = decode(m[1].trim());
    else if (t === "<DL>") {
      if (pending !== null) stack.push(pending);
      pending = null;
    } else if (t === "</DL>") stack.pop();
    else if (m[2]) {
      const href = decode(m[2]);
      if (!/^https?:/i.test(href)) continue;
      const path = stack.join(" / ") || "Bookmarks";
      const list = folders.get(path) ?? [];
      const maps = isMaps(href);
      const p = tidy({
        business: bookmarkName(decode(m[3] ?? ""), href),
        website: maps ? undefined : href,
        mapsUrl: maps ? href : undefined,
        tags: [],
      });
      if (p) list.push(p);
      folders.set(path, list);
    }
  }
  return [...folders.entries()].map(([path, items]) => ({ path, items }));
}
