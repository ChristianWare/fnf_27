// What an audit keeps from the Semrush exports the admin uploads: short
// summaries for the report's "Search deep-dive", never the raw files.
// Every number here is Semrush's estimate, and the report says so. Safe
// anywhere.

export const SEMRUSH_KINDS = [
  "POSITIONS",
  "TREND",
  "COMPETITORS",
  "GAP",
  "BACKLINKS",
  "REFDOMAINS",
  "PAGES",
] as const;
export type SemrushKind = (typeof SEMRUSH_KINDS)[number];

export const SEMRUSH_LABELS: Record<SemrushKind, string> = {
  POSITIONS: "Organic Positions",
  TREND: "Overview trend",
  COMPETITORS: "Organic Competitors",
  GAP: "Keyword Gap",
  BACKLINKS: "Backlinks",
  REFDOMAINS: "Referring Domains",
  PAGES: "Pages",
};

export type SemrushFile = {
  kind: SemrushKind;
  name: string;
  rows: number;
  /** "US", "Worldwide". Empty when the export doesn't say. */
  database?: string;
  uploadedAt: string;
};

export type SemrushKeyword = {
  keyword: string;
  position: number;
  volume: number;
  traffic: number;
  /** What Google Ads would charge for one click. */
  cpc: number;
  url: string;
  intent: string;
  /** Shown in the map pack rather than the blue links. */
  local?: boolean;
};

export type SemrushPositions = {
  database?: string;
  keywords: number;
  traffic: number;
  /** What the traffic would cost a month in Google Ads. */
  value: number;
  top3: number;
  top10: number;
  top20: number;
  /** Searches for their own name. */
  branded: { keywords: number; traffic: number };
  /** Searches from people looking to book a ride. */
  money: { keywords: number; traffic: number; value: number };
  /** Everything else: blog-style questions, other businesses' names. */
  other: { keywords: number; traffic: number };
  /** In the map pack. */
  localPack: number;
  /** Searches that show Google's AI overview. */
  aiOverview: number;
  top: SemrushKeyword[];
  /** Ride searches at 4 to 20: the quickest wins. */
  close: SemrushKeyword[];
  pages: { url: string; traffic: number; keywords: number }[];
};

export type SemrushMonth = {
  month: string;
  traffic: number;
  keywords: number;
  cost: number;
};

export type SemrushTrend = {
  database?: string;
  months: SemrushMonth[];
  peak?: { month: string; traffic: number };
  /** Traffic now against 12 months ago, in percent. Empty with no base. */
  change12?: number;
};

export type SemrushCompetitor = {
  domain: string;
  common: number;
  keywords: number;
  traffic: number;
  value: number;
};

export type SemrushGap = {
  you: string;
  rivals: string[];
  /** Searches a rival ranks for in the top 20 and they don't. */
  missing: { keyword: string; volume: number; domain: string; position: number }[];
  missingCount: number;
  /** Searches where a rival ranks higher. */
  weakerCount: number;
};

export type SemrushLinks = {
  links?: number;
  domains: number;
  /** Followed links, in percent. */
  follow?: number;
  top: { domain: string; score: number; links: number }[];
  /** Links that look like spam, and why. */
  spam: { domain: string; why: string }[];
  spamCount: number;
  anchors: { anchor: string; count: number }[];
};

export type SemrushData = {
  v: 1;
  files: SemrushFile[];
  positions?: SemrushPositions;
  trend?: SemrushTrend;
  competitors?: SemrushCompetitor[];
  gap?: SemrushGap;
  links?: SemrushLinks;
  /** From a Pages export, which beats the pages worked out from positions. */
  pages?: { url: string; traffic: number; keywords: number }[];
};

/** The things to point out, worked out each time it's shown. */
export function semrushWarnings(data: SemrushData): string[] {
  const out: string[] = [];
  const dbs = [
    ...new Set(
      data.files
        .map((f) => f.database)
        .filter((d): d is string => Boolean(d)),
    ),
  ];
  if (dbs.length > 1)
    out.push(
      `These exports come from different databases (${dbs.join(" and ")}), so their totals won't match. Export everything from the US database.`,
    );
  else if (dbs[0] && dbs[0] !== "US")
    out.push(
      `These numbers are from Semrush's ${dbs[0]} database. For a local operator, the US database is the one to use.`,
    );
  return out;
}
