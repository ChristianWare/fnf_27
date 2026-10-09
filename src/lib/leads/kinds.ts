// The Leads Tool's fixed lists, as values: the database checks them and
// the types come from them. Safe anywhere.

export const ACCOUNT_CATEGORIES = [
  "HOTEL",
  "VENUE",
  "CORPORATE",
  "LAW",
  "FUNERAL",
  "GOLF",
  "CASINO",
  "SENIOR",
  "TOURS",
] as const;

export const EVENT_KINDS = [
  "GALA",
  "CONFERENCE",
  "BUSINESS",
  "FESTIVAL",
  "CONCERT",
  "GRADUATION",
  "WEDDING_SHOW",
  "TOURNAMENT",
  "AUCTION",
] as const;

/** Where an event was found. */
export const SOURCE_IDS = [
  "EVENTBRITE",
  "CONVENTION",
  "TOURISM",
  "CHAMBER",
  "UNIVERSITY",
  "TICKETMASTER",
  "WEDDING",
  "TOURNAMENT",
  "GOOGLE",
] as const;

/** The kinds of calendar an admin can add for a market. */
export const CALENDAR_SOURCES = [
  "CONVENTION",
  "TOURISM",
  "CHAMBER",
  "UNIVERSITY",
  "WEDDING",
  "TOURNAMENT",
] as const;

export const LEAD_STAGES = [
  "NEW",
  "CONTACTED",
  "TALKING",
  "WON",
  "NOT_NOW",
] as const;

export const ACTIVITY_KINDS = [
  "SAVED",
  "FOUND",
  "EMAIL",
  "TEXT",
  "CALL",
  "MET",
  "NOTE",
  "STAGE",
  "WON",
] as const;

/** The one business that isn't a client: the studio's own Leads Tool. */
export const STUDIO_ID = "studio";
