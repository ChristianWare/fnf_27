// The shapes of an audit: what each check found, the Google listing it was
// matched to, the searches it ran, and the view the report pages draw.
// Safe anywhere.

import type { AuditSource, AuditStatus, CheckId, FollowUp } from "./kinds";
import type { SemrushData } from "./semrush/types";

export type { AuditSource, AuditStatus, CheckId, FollowUp };

/** Where each check is while the audit runs. */
export type StepState = "waiting" | "running" | "done";
export type Steps = Partial<Record<CheckId, StepState>>;

/**
 * One thing a check looks at. "unknown" means we couldn't tell, and it
 * doesn't count for or against the score.
 */
export type PartState = "good" | "partial" | "missing" | "unknown";

/** A page, a search or a listing a finding is based on. */
export type Proof = { label: string; href?: string };

export type Part = {
  id: string;
  label: string;
  state: PartState;
  points: number;
  max: number;
  /** What we found, in a sentence. */
  found: string;
  proof?: Proof[];
  /** Words quoted from their site (AI readability). */
  quote?: string;
  /** When it can't be told, the whole check can't be scored. */
  primary?: boolean;
  /** The fix we'd write for this part on its own. */
  fix?: string;
};

export type CheckResult = {
  id: CheckId;
  /** 0 to 100, or null when it couldn't be checked. */
  score: number | null;
  /** The headline: what we found, in a sentence. */
  found: string;
  parts: Part[];
  /** What to do about it, when it lost points. */
  fix?: string;
  /** Why it couldn't be checked, when it couldn't. */
  skipped?: string;
  /** Worth a look, but not scored (a street address on the listing). */
  notes?: string[];
};

export type Checks = Partial<Record<CheckId, CheckResult>>;

/**
 * A Google listing, as Google's Places API gave it. Kept at most 30 days
 * (Google's terms), then cleared down to the place ID.
 */
export type Listing = {
  placeId: string;
  name: string;
  address?: string;
  city?: string;
  /** "Arizona". */
  state?: string;
  /** "AZ". */
  stateCode?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  reviews: number;
  /** How many photos Google has, up to 10 (it doesn't count further). */
  photos: number;
  /** Opening hours are set. */
  hours: boolean;
  website?: string;
  phone?: string;
  mapsUrl?: string;
  /** Google shows a service area instead of a street address. */
  serviceArea?: boolean;
  /** OPERATIONAL, CLOSED_TEMPORARILY or CLOSED_PERMANENTLY. */
  status?: string;
  types: string[];
};

/** One search riders make, and where the operator showed up for it. */
export type SearchResult = {
  keyword: string;
  /** Google's estimate of searches a month, in their city. */
  volume?: number;
  /** Their place in the map results (1 is first), if they were there. */
  maps?: number;
  /** Their place in Google's results, if they were on page one. */
  organic?: number;
};

/** An operator near them, from the map results. */
export type Rival = {
  name: string;
  rating?: number;
  reviews?: number;
  domain?: string;
};

/** What we learned about the site, for the studio and the fix writer. */
export type SiteFacts = {
  title?: string;
  description?: string;
  /** WordPress, Wix, Squarespace… */
  platform?: string;
  /** Limo Anywhere, Moovs… */
  bookingSystem?: string;
  bookingUrl?: string;
  analytics: string[];
  phones: string[];
  emails: string[];
  https: boolean;
  pagesRead: number;
  sitemapUrls: number;
  words: number;
  /** The rides they offer, from the site: airport, wedding, corporate… */
  services: string[];
  /** Cities and areas the site names. */
  cities: string[];
};

/** A band the score falls in, for the label beside it. */
export type Band = {
  label: string;
  tone: "red" | "yellow" | "mint" | "lime";
};

/** One of the three things costing them the most. */
export type TopItem = {
  id: CheckId;
  name: string;
  found: string;
  why: string;
  fix?: string;
};

/** What a report page shows. Locked views leave out the details. */
export type AuditView = {
  id: string;
  status: AuditStatus;
  steps: Steps;
  source: AuditSource;
  /** The name to show: the listing's, the site's, or the domain. */
  business: string;
  domain?: string;
  url?: string;
  /** They have a website of their own (the sample keeps this, not the address). */
  hasSite: boolean;
  /** "Phoenix, AZ". */
  place?: string;
  score: number | null;
  band?: Band;
  summary?: string;
  /** All six, in order; still-running ones have no result yet. */
  checks: { id: CheckId; name: string; result?: CheckResult }[];
  top: TopItem[];
  searches: SearchResult[];
  rivals: Rival[];
  listing?: {
    name: string;
    rating?: number;
    reviews: number;
    mapsUrl?: string;
  };
  phoneShot?: string;
  /** The full report is showing (an email was given, or an admin ran it). */
  unlocked: boolean;
  createdAt: string;
  finishedAt?: string;
  error?: string;
  /** The anonymized sample on /audit/sample. */
  sample?: boolean;
  /** Semrush exports the admin added: the "Search deep-dive". */
  semrush?: SemrushData;
};
