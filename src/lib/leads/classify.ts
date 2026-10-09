// Events as each source gives them, and working out what kind of event
// each one is. An event with no kind we pitch (a happy hour, a yoga class)
// is left out. Safe anywhere.

import type { AccountCategory, EventType, SourceId } from "./types";

/** An event as a source gives it, before it's matched and saved. */
export type RawEvent = {
  /** The source's own id for it, e.g. "TICKETMASTER:G5vYZ9…". */
  key: string;
  source: SourceId;
  name: string;
  startsAt: string;
  endsAt?: string;
  allDay?: boolean;
  venue?: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  organizer?: string;
  organizerUrl?: string;
  url?: string;
  guests?: number;
  phone?: string;
  description?: string;
  /** What the source says it is, when it says. */
  type?: EventType;
};

const RULES: [EventType, RegExp][] = [
  ["GRADUATION", /\b(graduation|commencement|convocation)\b/i],
  [
    "WEDDING_SHOW",
    /\b(bridal|wedding)\s+(show|expo|fair|showcase|open house)|\bbridal\b/i,
  ],
  [
    "AUCTION",
    /\b(auction|concours|car show|horse show|arabian|barrett|gun show|antique show)\b/i,
  ],
  [
    "TOURNAMENT",
    /\b(tournament|pro-am|golf classic|invitational|charity golf|golf outing|scramble|championship)\b/i,
  ],
  [
    "GALA",
    /\b(gala|fundraiser|fundraising|benefit|ball|soir[ée]e|black tie|charity dinner|casino night)\b/i,
  ],
  [
    "CONFERENCE",
    /\b(conference|summit|convention|expo|trade show|tradeshow|symposium|congress|forum|con\b|annual meeting)/i,
  ],
  [
    "BUSINESS",
    /\b(awards?|luncheon|banquet|economic outlook|state of the|leadership|business|chamber|networking dinner|executive|keynote|investor)\b/i,
  ],
  ["FESTIVAL", /\b(festival|fest\b|fair\b|carnival|celebration|parade)/i],
  [
    "CONCERT",
    /\b(concert|tour\b|live in|symphony|orchestra|playoff|vs\.?|game)\b/i,
  ],
];

/** What kind of event this is, or undefined when it isn't one we pitch. */
export function eventKind(
  name: string,
  description = "",
  fallback?: EventType,
): EventType | undefined {
  for (const [type, re] of RULES) if (re.test(name)) return type;
  // The description only counts for the kinds that are clearly worth it.
  for (const [type, re] of RULES.slice(0, 6))
    if (re.test(description.slice(0, 400))) return type;
  return fallback;
}

/** Leaves out online events, and things that run for weeks or recur. */
export function worthKeeping(event: RawEvent, now: Date) {
  const start = new Date(event.startsAt).getTime();
  if (!Number.isFinite(start)) return false;
  const end = event.endsAt ? new Date(event.endsAt).getTime() : start;
  if (end < now.getTime() - 86_400_000) return false;
  // More than a year out: too early to pitch.
  if (start > now.getTime() + 365 * 86_400_000) return false;
  // Runs longer than two weeks: a season, an exhibit, a recurring thing.
  if (end - start > 14 * 86_400_000) return false;
  if (
    /\b(online|virtual|webinar|zoom)\b/i.test(
      `${event.name} ${event.venue ?? ""}`,
    )
  )
    return false;
  return Boolean(event.name.trim());
}

/** "valley heart ball", for matching the same event from two sources. */
export const sameName = (name: string) =>
  name
    .toLowerCase()
    .replace(/\b(the|annual|\d{4}|\d+(st|nd|rd|th))\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/* ── Accounts: what kind of business a place is ── */

const TYPE_CATEGORY: [AccountCategory, string[]][] = [
  ["CASINO", ["casino"]],
  [
    "HOTEL",
    ["lodging", "hotel", "resort_hotel", "motel", "inn", "extended_stay_hotel"],
  ],
  ["GOLF", ["golf_course", "country_club"]],
  ["FUNERAL", ["funeral_home", "cemetery"]],
  ["LAW", ["lawyer", "law_firm"]],
  [
    "VENUE",
    ["wedding_venue", "event_venue", "banquet_hall", "convention_center"],
  ],
  [
    "SENIOR",
    ["assisted_living", "nursing_home", "retirement_home", "senior_center"],
  ],
  ["TOURS", ["tour_agency", "travel_agency", "winery", "tourist_attraction"]],
  ["CORPORATE", ["corporate_office"]],
];

/** Places a search turns up that are never a fit. */
const NOT_A_FIT = new Set([
  "campground",
  "rv_park",
  "hostel",
  "apartment_complex",
  "apartment_building",
  "real_estate_agency",
  "car_rental",
  "taxi_stand",
  "transit_station",
  "bus_station",
  "airport",
  "parking",
]);

/** A place's category from Google's types, or the search that found it. */
export function placeCategory(types: string[], found: AccountCategory) {
  if (types.some((t) => NOT_A_FIT.has(t))) return undefined;
  for (const [category, list] of TYPE_CATEGORY)
    if (list.some((t) => types.includes(t))) return category;
  return found;
}

/** Car services, limo companies and the like: competitors, not leads. */
export const isCompetitor = (name: string, types: string[]) =>
  types.includes("car_rental") ||
  /\b(limo|limousine|chauffeur|black car|car service|transportation|shuttle|taxi|party bus)\b/i.test(
    name,
  );
