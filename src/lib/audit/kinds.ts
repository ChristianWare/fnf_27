// The free website audit's fixed lists: the six checks and what each is
// worth, the states an audit goes through, and the follow-up statuses on
// Admin → Audits. The database imports these too. Safe anywhere.

export const CHECK_IDS = [
  "google",
  "profile",
  "speed",
  "booking",
  "pages",
  "ai",
] as const;

export type CheckId = (typeof CHECK_IDS)[number];

/**
 * The six checks, in the order the page and the report show them. The
 * weights add up to 100: what's worth the most is what costs the most
 * bookings.
 */
export const CHECKS: Record<
  CheckId,
  { name: string; tag: string; weight: number; why: string }
> = {
  google: {
    name: "Google visibility",
    tag: "Search",
    weight: 20,
    why: "Riders search for the ride they need, in their city. If you're not near the top, they book whoever is.",
  },
  profile: {
    name: "Your Google Business Profile",
    tag: "Maps",
    weight: 20,
    why: "The map results are where most local calls start, and riders compare reviews before they call.",
  },
  speed: {
    name: "Speed on a phone",
    tag: "Phone",
    weight: 15,
    why: "Most riders look you up on a phone, and a slow page loses them before it loads.",
  },
  booking: {
    name: "Online booking",
    tag: "Bookings",
    weight: 20,
    why: "A rider who can't book without calling often books someone who lets them.",
  },
  pages: {
    name: "The pages riders search for",
    tag: "Pages",
    weight: 15,
    why: "Each kind of ride is its own search, and a page for each one is how you show up for it.",
  },
  ai: {
    name: "AI readability",
    tag: "AI search",
    weight: 10,
    why: "More riders ask ChatGPT and other AI assistants for a car service. They can only recommend what they can read.",
  },
};

/**
 * CONFIRM: waiting for "is this your Google listing?". QUEUED: about to
 * run. RUNNING: the checks are going. DONE or FAILED at the end.
 */
export const AUDIT_STATUSES = [
  "CONFIRM",
  "QUEUED",
  "RUNNING",
  "DONE",
  "FAILED",
] as const;

export type AuditStatus = (typeof AUDIT_STATUSES)[number];

/** Who started it: an operator on /audit, or an admin. */
export const AUDIT_SOURCES = ["PAGE", "ADMIN"] as const;

export type AuditSource = (typeof AUDIT_SOURCES)[number];

/** Where the studio is with the operator who ran it. */
export const FOLLOW_UPS = ["NEW", "CONTACTED", "CALL", "CLIENT", "NO"] as const;

export type FollowUp = (typeof FOLLOW_UPS)[number];

export const FOLLOW_UP_LABELS: Record<FollowUp, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  CALL: "Call booked",
  CLIENT: "Became a client",
  NO: "Not a fit",
};

/**
 * The scoring rules' version, saved with each audit. Change it when a
 * rule changes, so an old report can be told apart from a new one.
 */
export const RULES_VERSION = 1;

/** Under this, the next step is a call; at or over it, the leads tool. */
export const CALL_BELOW = 60;
