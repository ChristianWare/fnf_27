// The Leads Tool's shapes. Two kinds of lead: an account (a business that
// books rides again and again) and an event (a date with an organizer to
// pitch). Saving either one finds the decision-maker and writes the
// scripts, then it moves through the pipeline.

import type {
  ACCOUNT_CATEGORIES,
  ACTIVITY_KINDS,
  CALENDAR_SOURCES,
  EVENT_KINDS,
  LEAD_STAGES,
  SOURCE_IDS,
} from "./kinds";

export type AccountCategory = (typeof ACCOUNT_CATEGORIES)[number];
export type EventType = (typeof EVENT_KINDS)[number];
export type SourceId = (typeof SOURCE_IDS)[number];
export type CalendarSource = (typeof CALENDAR_SOURCES)[number];

/** The person who books the rides. Found when a lead is saved. */
export type Contact = {
  name: string;
  title: string;
  email?: string;
  phone?: string;
  /** The email was checked and accepts mail. */
  verified: boolean;
};

type Place = {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  /** When it first showed up in the tool. */
  foundAt: string;
  /** Only on leads you've saved: who to contact. */
  contact?: Contact;
  /** Someone's already been found for it, with an email. */
  contactReady?: boolean;
  /** A line about this one in particular, for the brief. */
  note?: string;
  /** A small photo (the place, or the event's venue), when there is one. */
  photo?: string;
};

export type Account = Place & {
  kind: "ACCOUNT";
  category: AccountCategory;
  address: string;
  rating?: number;
  reviews?: number;
  phone?: string;
  website?: string;
  /** Whether their website shows a car service already. */
  carService: "NONE" | "HAS" | "UNKNOWN";
  carServiceNote?: string;
  /** In the news lately: an opening, a move, a new headquarters. */
  news?: { title: string; url: string; at: string };
};

export type EventLead = Place & {
  kind: "EVENT";
  type: EventType;
  source: SourceId;
  date: string;
  /** For events that run over several days. */
  endDate?: string;
  /** Only the day is known, not the time. */
  allDay?: boolean;
  venue: string;
  address?: string;
  organizer: string;
  guests?: number;
  phone?: string;
  /** The event's own page. */
  website?: string;
};

export type Target = Account | EventLead;

/** A target as one client sees it: how far it is from their base. */
export type Located<T extends Target = Target> = T & { miles: number };

export type LeadStage = (typeof LEAD_STAGES)[number];

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export type LeadActivity = {
  id: string;
  at: string;
  kind: ActivityKind;
  text: string;
};

export type SavedLead = {
  /** The account or event it was saved from. */
  targetId: string;
  stage: LeadStage;
  savedAt: string;
  /** When to follow up next. */
  remindAt?: string;
  /** What it's worth, once won. */
  value?: number;
  per?: "MONTH" | "ONCE";
  wonAt?: string;
  /** Written for this client when it was saved. */
  scripts?: Script;
  activity: LeadActivity[];
};

/** The operator, as their scripts introduce them. */
export type Operator = {
  company: string;
  name: string;
  fleet: string;
  /** What they're best at, e.g. "airport runs and corporate accounts". */
  strength: string;
  phone: string;
  website?: string;
};

export type LeadsSettings = {
  /** Where leads are measured from. */
  base: { city: string; lat: number; lng: number };
  radius: number;
  categories: AccountCategory[];
  eventTypes: EventType[];
  /** The morning email, for the person signed in. */
  morningEmail: boolean;
  operator: Operator;
};

export type Script = {
  email: { subject: string; body: string };
  text: string;
  call: string;
};

/** Everything one client's (or the studio's) Leads Tool shows. */
export type LeadsWorkspace = {
  now: string;
  access: "INCLUDED" | "TRIAL" | "ACTIVE" | "STUDIO";
  trialEndsAt?: string;
  billing: {
    raw: "NONE" | "TRIAL" | "ACTIVE" | "CANCELLING" | "PAST_DUE" | "ENDED";
    /** A card is set up to keep it after the trial. */
    subscribed: boolean;
    nextBillingAt?: string;
  };
  monthly: number;
  settings: LeadsSettings;
  /** Not ready until its first nightly run is in. */
  market: { name: string; ready: boolean; lastRunAt?: string };
  /** Found after this counts as new this morning. */
  newSince: string;
  accounts: Account[];
  events: EventLead[];
  saved: SavedLead[];
};

/** What a lead's page adds on top of the list: a big photo, a map, the drive. */
export type LeadExtras = {
  photo?: { src: string; credit?: string; creditUrl?: string };
  /** A Google Maps embed address. */
  map?: string;
  drive?: { minutes: number; miles: number };
};
