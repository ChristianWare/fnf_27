// Reading a Semrush export: which report it is (from its columns), which
// database it came from, and the summary the audit keeps. Safe anywhere.

import { headerKey, num, parseCsv } from "@/lib/csv";
import type {
  SemrushCompetitor,
  SemrushData,
  SemrushFile,
  SemrushGap,
  SemrushKeyword,
  SemrushKind,
  SemrushLinks,
  SemrushMonth,
  SemrushPositions,
  SemrushTrend,
} from "./types";

type Table = { head: string[]; keys: string[]; rows: string[][] };

const DOMAINISH = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

export function detectKind(keys: string[], head: string[]): SemrushKind | null {
  const has = (...k: string[]) => k.every((x) => keys.includes(x));
  if (has("target", "metric") && head.some((h) => /^\d{4}-\d{2}$/.test(h)))
    return "TREND";
  if (has("sourceurl", "targeturl")) return "BACKLINKS";
  if (has("domain", "backlinks") && keys.some((k) => k.includes("ascore")))
    return "REFDOMAINS";
  if (has("domain", "commonkeywords")) return "COMPETITORS";
  if (has("keyword") && head.filter((h) => DOMAINISH.test(h.replace(/\s*\(.*\)$/, ""))).length >= 2)
    return "GAP";
  if (has("keyword", "position", "url")) return "POSITIONS";
  if (has("url", "traffic") && !keys.includes("keyword")) return "PAGES";
  return null;
}

/** "us" in "site.com-organic.Positions-us-20261023-…csv". */
function databaseFromName(name: string) {
  const m = name.match(/-(us|uk|ca|au|de|fr|es|it|in|mx|br)-\d{8}/i);
  return m ? m[1].toUpperCase() : undefined;
}

const normDb = (value?: string) => {
  if (!value) return undefined;
  const v = value.trim();
  if (/^world/i.test(v)) return "Worldwide";
  if (/^(us|united states|google\.com)$/i.test(v)) return "US";
  return v.toUpperCase().slice(0, 20);
};

/** "fabuloustransportation" from the domain, for spotting branded searches. */
const stemOf = (domain: string) =>
  domain.replace(/^www\./, "").split(".")[0].replace(/[^a-z0-9]/gi, "").toLowerCase();

// Searches from someone looking to book.
const RIDE =
  /\b(limo|limos|limousine|limousines|chauffeur|chauffeured|black ?car|car service|town ?car|sedan|suv|sprinter|party bus|shuttle|transportation|transport|airport (transfer|ride|car|pickup|pick up|transportation)|ride to|wine tour|bachelorette|prom|wedding (car|transportation|limo))\b/i;

function isMoney(keyword: string, intent: string) {
  return /commercial|transactional/i.test(intent) || RIDE.test(keyword);
}

const col = (t: Table, ...names: string[]) => {
  for (const n of names) {
    const i = t.keys.indexOf(n);
    if (i >= 0) return i;
  }
  return -1;
};

function positions(t: Table, domain: string, database?: string): SemrushPositions {
  const ix = {
    keyword: col(t, "keyword"),
    position: col(t, "position"),
    volume: col(t, "searchvolume", "volume"),
    cpc: col(t, "cpc"),
    url: col(t, "url"),
    traffic: col(t, "traffic"),
    cost: col(t, "trafficcost"),
    features: col(t, "serpfeaturesbykeyword", "serpfeatures"),
    intent: col(t, "keywordintents", "intents", "intent"),
    type: col(t, "positiontype"),
  };
  const stem = stemOf(domain);
  // A keyword can be listed twice (two of their pages rank): keep the best.
  const best = new Map<string, SemrushKeyword & { cost: number; ai: boolean }>();
  const pages = new Map<string, { traffic: number; keywords: number }>();
  let traffic = 0;
  let value = 0;
  for (const r of t.rows) {
    const keyword = r[ix.keyword]?.toLowerCase();
    if (!keyword) continue;
    const k = {
      keyword,
      position: num(r[ix.position]),
      volume: num(r[ix.volume]),
      traffic: num(r[ix.traffic]),
      cpc: num(r[ix.cpc]),
      url: r[ix.url] ?? "",
      intent: r[ix.intent] ?? "",
      local: /local pack/i.test(r[ix.type] ?? ""),
      cost: num(r[ix.cost]),
      ai: /ai overview/i.test(r[ix.features] ?? ""),
    };
    traffic += k.traffic;
    value += k.cost;
    if (k.url) {
      const path = k.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\?.*$/, "");
      const p = pages.get(path) ?? { traffic: 0, keywords: 0 };
      p.traffic += k.traffic;
      p.keywords += 1;
      pages.set(path, p);
    }
    const had = best.get(keyword);
    if (!had) best.set(keyword, k);
    else {
      had.traffic += k.traffic;
      had.cost += k.cost;
      if (k.position && k.position < had.position) {
        had.position = k.position;
        had.url = k.url;
      }
    }
  }
  const list = [...best.values()];
  const branded = list.filter(
    (k) => stem.length >= 4 && k.keyword.replace(/[^a-z0-9]/g, "").includes(stem),
  );
  const brandSet = new Set(branded.map((k) => k.keyword));
  const money = list.filter(
    (k) => !brandSet.has(k.keyword) && isMoney(k.keyword, k.intent),
  );
  const moneySet = new Set(money.map((k) => k.keyword));
  const other = list.filter(
    (k) => !brandSet.has(k.keyword) && !moneySet.has(k.keyword),
  );
  const sum = (xs: typeof list, f: (k: (typeof list)[number]) => number) =>
    Math.round(xs.reduce((s, k) => s + f(k), 0));
  const strip = ({ cost: _c, ai: _a, ...k }: (typeof list)[number]) => {
    void _c;
    void _a;
    return k;
  };
  return {
    database,
    keywords: list.length,
    traffic: Math.round(traffic),
    value: Math.round(value),
    top3: list.filter((k) => k.position >= 1 && k.position <= 3).length,
    top10: list.filter((k) => k.position >= 1 && k.position <= 10).length,
    top20: list.filter((k) => k.position >= 1 && k.position <= 20).length,
    branded: { keywords: branded.length, traffic: sum(branded, (k) => k.traffic) },
    money: {
      keywords: money.length,
      traffic: sum(money, (k) => k.traffic),
      value: sum(money, (k) => k.cost),
    },
    other: { keywords: other.length, traffic: sum(other, (k) => k.traffic) },
    localPack: list.filter((k) => k.local).length,
    aiOverview: list.filter((k) => k.ai).length,
    top: [...list]
      .sort((a, b) => b.traffic - a.traffic || b.volume - a.volume)
      .slice(0, 10)
      .map(strip),
    close: money
      .filter((k) => k.position >= 4 && k.position <= 20 && k.volume > 0)
      .sort((a, b) => b.volume * (b.cpc || 1) - a.volume * (a.cpc || 1))
      .slice(0, 12)
      .map(strip),
    pages: [...pages.entries()]
      .map(([url, p]) => ({ url, traffic: Math.round(p.traffic), ...{ keywords: p.keywords } }))
      .sort((a, b) => b.traffic - a.traffic)
      .slice(0, 8),
  };
}

function trend(t: Table): SemrushTrend {
  const metric = col(t, "metric");
  const db = col(t, "database");
  const monthCols = t.head
    .map((h, i) => ({ h, i }))
    .filter((x) => /^\d{4}-\d{2}$/.test(x.h));
  const pick = (re: RegExp) => t.rows.find((r) => re.test(r[metric] ?? ""));
  const tr = pick(/^organic traffic$/i);
  const kw = pick(/^organic keywords$/i);
  const cost = pick(/^organic traffic cost$/i);
  const all: SemrushMonth[] = monthCols.map(({ h, i }) => ({
    month: h,
    traffic: num(tr?.[i]),
    keywords: num(kw?.[i]),
    cost: num(cost?.[i]),
  }));
  const months = all.slice(-24);
  const peak = [...all].sort((a, b) => b.traffic - a.traffic)[0];
  // The last month in an export is often part-way through: compare the one
  // before it with a year earlier.
  const now = all.at(-2);
  const then = all.at(-14);
  return {
    database: normDb(t.rows[0]?.[db]),
    months,
    peak: peak?.traffic ? { month: peak.month, traffic: peak.traffic } : undefined,
    change12:
      now && then && then.traffic > 0
        ? Math.round(((now.traffic - then.traffic) / then.traffic) * 100)
        : undefined,
  };
}

function competitors(t: Table, domain: string): SemrushCompetitor[] {
  const ix = {
    domain: col(t, "domain"),
    common: col(t, "commonkeywords"),
    keywords: col(t, "organickeywords", "sekeywords", "keywords"),
    traffic: col(t, "organictraffic", "setraffic", "traffic"),
    value: col(t, "organiccost", "setrafficprice", "trafficcost"),
  };
  return t.rows
    .map((r) => ({
      domain: (r[ix.domain] ?? "").replace(/^www\./, "").toLowerCase(),
      common: num(r[ix.common]),
      keywords: num(r[ix.keywords]),
      traffic: num(r[ix.traffic]),
      value: num(r[ix.value]),
    }))
    .filter((c) => c.domain && c.domain !== domain)
    .slice(0, 10);
}

function gap(t: Table, domain: string): SemrushGap {
  const kwI = col(t, "keyword");
  const volI = col(t, "searchvolume", "volume");
  const domainCols = t.head
    .map((h, i) => ({ d: h.replace(/\s*\(.*\)$/, "").replace(/^www\./, "").toLowerCase(), h, i }))
    .filter((x) => DOMAINISH.test(x.d) && !/\(pages?\)/i.test(x.h));
  const mine =
    domainCols.find((x) => x.d === domain) ??
    domainCols.find((x) => domain && x.d.includes(stemOf(domain))) ??
    domainCols[0];
  const rivals = domainCols.filter((x) => x !== mine);
  const missing: SemrushGap["missing"] = [];
  let missingCount = 0;
  let weakerCount = 0;
  for (const r of t.rows) {
    const you = num(r[mine?.i ?? -1]);
    const theirs = rivals
      .map((x) => ({ domain: x.d, position: num(r[x.i]) }))
      .filter((x) => x.position > 0)
      .sort((a, b) => a.position - b.position);
    const top = theirs[0];
    if (!top) continue;
    if (!you && top.position <= 20) {
      missingCount++;
      missing.push({
        keyword: r[kwI] ?? "",
        volume: num(r[volI]),
        domain: top.domain,
        position: top.position,
      });
    } else if (you && top.position < you) weakerCount++;
  }
  return {
    you: mine?.d ?? domain,
    rivals: rivals.map((x) => x.d),
    missing: missing.sort((a, b) => b.volume - a.volume).slice(0, 10),
    missingCount,
    weakerCount,
  };
}

const SPAM_TLD = /\.(xyz|top|ru|cn|tk|ml|ga|cf|gq|pw|icu|buzz|click|loan|work|bid|win|site|online|shop|info)$/i;
const SPAM_WORD = /\b(casino|bet|poker|porn|xxx|sex|viagra|cialis|loan|payday|crypto|forex|seo ?link|backlink|escort|replica)\b/i;

function spamWhy(domain: string, text: string, score?: number) {
  if (SPAM_WORD.test(`${domain} ${text}`)) return "Spam words in the link or page";
  if (SPAM_TLD.test(domain)) return "A domain ending often used for link spam";
  if ((domain.match(/\d/g)?.length ?? 0) >= 4 || (domain.match(/-/g)?.length ?? 0) >= 3)
    return "A machine-made looking domain";
  if (score === 0) return "Authority score of 0";
  return null;
}

const hostOf = (u: string) =>
  u.replace(/^https?:\/\/(www\.)?/i, "").split(/[/?#]/)[0].toLowerCase();

function backlinks(t: Table): SemrushLinks {
  const ix = {
    source: col(t, "sourceurl"),
    title: col(t, "sourcetitle"),
    anchor: col(t, "anchor"),
    nofollow: col(t, "nofollow"),
    score: col(t, "pageascore", "ascore"),
  };
  const domains = new Map<string, { score: number; links: number; why: string | null }>();
  const anchors = new Map<string, number>();
  let follow = 0;
  for (const r of t.rows) {
    const d = hostOf(r[ix.source] ?? "");
    if (!d) continue;
    const score = num(r[ix.score]);
    const had = domains.get(d) ?? { score, links: 0, why: null };
    had.links++;
    had.score = Math.max(had.score, score);
    had.why ??= spamWhy(d, `${r[ix.title] ?? ""} ${r[ix.anchor] ?? ""}`, undefined);
    domains.set(d, had);
    if (!/^true$/i.test(r[ix.nofollow] ?? "")) follow++;
    const a = (r[ix.anchor] ?? "").trim().toLowerCase() || "(no text)";
    anchors.set(a, (anchors.get(a) ?? 0) + 1);
  }
  return linkSummary(domains, anchors, t.rows.length, follow);
}

function refDomains(t: Table): SemrushLinks {
  const ix = {
    domain: col(t, "domain"),
    score: col(t, "domainascore", "ascore"),
    links: col(t, "backlinks"),
  };
  const domains = new Map<string, { score: number; links: number; why: string | null }>();
  for (const r of t.rows) {
    const d = (r[ix.domain] ?? "").replace(/^www\./, "").toLowerCase();
    if (!d) continue;
    const score = num(r[ix.score]);
    domains.set(d, { score, links: num(r[ix.links]), why: spamWhy(d, "", score) });
  }
  return linkSummary(domains, new Map(), undefined, undefined);
}

function linkSummary(
  domains: Map<string, { score: number; links: number; why: string | null }>,
  anchors: Map<string, number>,
  links: number | undefined,
  follow: number | undefined,
): SemrushLinks {
  const all = [...domains.entries()].map(([domain, d]) => ({ domain, ...d }));
  const spam = all.filter((d) => d.why);
  return {
    links: links ?? all.reduce((s, d) => s + d.links, 0),
    domains: all.length,
    follow: links && follow !== undefined ? Math.round((follow / links) * 100) : undefined,
    top: all
      .filter((d) => !d.why)
      .sort((a, b) => b.score - a.score || b.links - a.links)
      .slice(0, 8)
      .map(({ domain, score, links }) => ({ domain, score, links })),
    spam: spam.slice(0, 10).map(({ domain, why }) => ({ domain, why: why! })),
    spamCount: spam.length,
    anchors: [...anchors.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([anchor, count]) => ({ anchor, count })),
  };
}

function pagesExport(t: Table) {
  const ix = {
    url: col(t, "url"),
    traffic: col(t, "traffic"),
    keywords: col(t, "numberofkeywords", "keywords", "organickeywords"),
  };
  return t.rows
    .map((r) => ({
      url: (r[ix.url] ?? "").replace(/^https?:\/\/(www\.)?/, ""),
      traffic: num(r[ix.traffic]),
      keywords: num(r[ix.keywords]),
    }))
    .filter((p) => p.url)
    .sort((a, b) => b.traffic - a.traffic)
    .slice(0, 10);
}

export type Parsed =
  | { ok: true; kind: SemrushKind; file: SemrushFile; patch: Partial<SemrushData> }
  | { ok: false; error: string };

/** One export, read and summarised for an audit of `domain`. */
export function parseSemrush(name: string, text: string, domain: string): Parsed {
  const rows = parseCsv(text);
  if (rows.length < 2) return { ok: false, error: `${name} has no rows.` };
  const head = rows[0];
  const t: Table = { head, keys: head.map(headerKey), rows: rows.slice(1) };
  const kind = detectKind(t.keys, head);
  if (!kind)
    return {
      ok: false,
      error: `${name} doesn't look like a Semrush export we read. Use Organic Positions, Overview trend, Competitors, Keyword Gap, Backlinks, Referring Domains or Pages.`,
    };
  const d = domain.replace(/^www\./, "").toLowerCase();
  // "azlimo.com-organic.Positions-us-…csv" names the site it's for.
  const named = name.match(/^(?:[0-9a-f]{8}-)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)-(?:organic|backlinks|refdomains|competitors)/i)?.[1]?.toLowerCase().replace(/^www\./, "");
  if (named && d && named !== d)
    return { ok: false, error: `${name} is for ${named}, not ${d}.` };
  let database = databaseFromName(name);
  let patch: Partial<SemrushData> = {};
  switch (kind) {
    case "POSITIONS":
      patch = { positions: positions(t, d, database) };
      break;
    case "TREND": {
      const tr = trend(t);
      database = tr.database ?? database;
      patch = { trend: tr };
      break;
    }
    case "COMPETITORS":
      patch = { competitors: competitors(t, d) };
      break;
    case "GAP":
      patch = { gap: gap(t, d) };
      break;
    case "BACKLINKS":
      patch = { links: backlinks(t) };
      database = undefined;
      break;
    case "REFDOMAINS":
      patch = { links: refDomains(t) };
      database = undefined;
      break;
    case "PAGES":
      patch = { pages: pagesExport(t) };
      break;
  }
  return {
    ok: true,
    kind,
    file: {
      kind,
      name: name.slice(0, 160),
      rows: t.rows.length,
      database,
      uploadedAt: new Date().toISOString(),
    },
    patch,
  };
}

/** Adds an export to what the audit has: one of each kind, newest wins. */
export function mergeSemrush(
  had: SemrushData | null | undefined,
  parsed: Extract<Parsed, { ok: true }>,
): SemrushData {
  const base: SemrushData = had ?? { v: 1, files: [] };
  // Backlinks beat referring domains (they have anchors), unless newer.
  return {
    ...base,
    ...parsed.patch,
    files: [
      ...base.files.filter(
        (f) =>
          f.kind !== parsed.kind &&
          !(
            (parsed.kind === "BACKLINKS" && f.kind === "REFDOMAINS") ||
            (parsed.kind === "REFDOMAINS" && f.kind === "BACKLINKS")
          ),
      ),
      parsed.file,
    ],
  };
}
