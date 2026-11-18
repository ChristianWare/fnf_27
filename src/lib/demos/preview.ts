// A preview (a prospect's demo site) as the admin screens show it, made
// from what the demo platform reports. Safe anywhere.

import { DEMO_MARKETS } from "./options";

export type PreviewStatus = "NOT_OPENED" | "OPENED" | "EXPIRING" | "EXPIRED";

export type PreviewEvent = { at: string; text: string };

export type PreviewEventKind = "view" | "login" | "booking" | "signup";

/** One demo as the platform's API returns it (fnf-demos, /api/platform). */
export type PlatformDemo = {
  id: string;
  ref: string;
  slug: string;
  url: string;
  business: string;
  marketId: string;
  contactName: string;
  email: string;
  phone: string;
  heroUrl: string | null;
  aboutUrl: string | null;
  status: "creating" | "live" | "expired" | "deleted" | "failed";
  createdAt: string;
  expiresAt: string;
  views: number;
  firstOpenedAt: string | null;
  lastSeenAt: string | null;
  logins: { password: string; admin: string; driver: string; rider: string };
  events?: { at: string; kind: PreviewEventKind; detail: string }[];
};

export type PreviewView = {
  id: string;
  prospectId: string;
  business: string;
  contactName: string;
  phone: string;
  market: string;
  url: string;
  createdAt: string;
  expiresAt: string;
  status: PreviewStatus;
  /** Still up (not expired or deleted). */
  live: boolean;
  views: number;
  firstOpenedAt: string | null;
  lastSeenAt: string | null;
  /** What they did, newest first. */
  events: PreviewEvent[];
  logins: PlatformDemo["logins"];
};

/** Days before the end when a preview counts as "expiring soon". */
export const EXPIRING_DAYS = 5;

const PAGES: Record<string, string> = {
  "": "the home page",
  book: "the booking page",
  fleet: "the fleet",
  services: "the services",
  airports: "the airports",
  about: "the About page",
  contact: "the Contact page",
  admin: "their admin",
  "driver-dashboard": "the driver app",
  dashboard: "a rider account",
  login: "the login page",
  corporate: "the corporate portal",
};

/** "/fleet/luxury-suv" → "the fleet". */
export function pageName(path: string) {
  const first = path.replace(/^\/+/, "").split(/[/?#]/)[0];
  return PAGES[first] ?? path;
}

/** Where each sign-in lands. */
const LOGINS: Record<string, string> = {
  admin: "Signed in to the admin",
  driver: "Signed in to the driver app",
  rider: "Signed in as a rider",
  corporate: "Signed in to the corporate portal",
};

/** One line on the "What they did" list. */
export function eventText(e: NonNullable<PlatformDemo["events"]>[number]) {
  if (e.kind === "login") return LOGINS[e.detail] ?? `Signed in (${e.detail || "a login"})`;
  if (e.kind === "signup") return "Made a rider account";
  if (e.kind === "booking") return `Booked a test ride${e.detail ? ` (${e.detail})` : ""}`;
  return `Looked at ${pageName(e.detail)}`;
}

/** "14 page views (the home page, the fleet and the booking page), signed
 *  in to the admin, 2 test bookings": a day of events in one line. */
export function eventsSummary(events: NonNullable<PlatformDemo["events"]>) {
  const views = events.filter((e) => e.kind === "view");
  const pages = [...new Set(views.map((e) => pageName(e.detail)))];
  const logins = [...new Set(events.filter((e) => e.kind === "login").map((e) => e.detail))];
  const bookings = events.filter((e) => e.kind === "booking").length;
  const signups = events.filter((e) => e.kind === "signup").length;
  const list = (items: string[]) =>
    items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
  const shown = pages.slice(0, 4);
  const more = pages.length - shown.length;
  return [
    views.length
      ? `${views.length} page view${views.length === 1 ? "" : "s"} (${list(more > 0 ? [...shown, `${more} more`] : shown)})`
      : "",
    logins.length ? `signed in as the ${list(logins)}` : "",
    signups ? `made ${signups === 1 ? "a rider account" : `${signups} rider accounts`}` : "",
    bookings ? `${bookings} test booking${bookings === 1 ? "" : "s"}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

export function toPreviewView(d: PlatformDemo, now: Date): PreviewView {
  const live = d.status === "live" || d.status === "creating";
  const left = (new Date(d.expiresAt).getTime() - now.getTime()) / 86_400_000;
  const market = DEMO_MARKETS.find((m) => m.id === d.marketId);
  const status: PreviewStatus = !live
    ? "EXPIRED"
    : left <= EXPIRING_DAYS
      ? "EXPIRING"
      : d.views > 0
        ? "OPENED"
        : "NOT_OPENED";
  return {
    id: d.id,
    prospectId: d.ref,
    business: d.business,
    contactName: d.contactName,
    phone: d.phone,
    market: market ? `${market.city}, ${market.state}` : d.marketId,
    url: d.url,
    createdAt: d.createdAt,
    expiresAt: d.expiresAt,
    status,
    live,
    views: d.views,
    firstOpenedAt: d.firstOpenedAt,
    lastSeenAt: d.lastSeenAt,
    events: (d.events ?? []).slice(0, 40).map((e) => ({ at: e.at, text: eventText(e) })),
    logins: d.logins,
  };
}

/** The text to send them, from your phone. */
export function previewText(p: { contactName: string; business: string; url: string }) {
  const first = p.contactName.split(/\s+/)[0];
  return `${first ? `Hi ${first}, ` : ""}it's Chris from Fonts & Footers. Here's the preview I put together for ${p.business}: ${p.url}. It's yours to click around for the next 30 days.`;
}

/** The link you open yourself: your visits don't count as theirs. */
export const ownerUrl = (url: string, path = "/") => `${url}${path}${path.includes("?") ? "&" : "?"}ff=owner`;
