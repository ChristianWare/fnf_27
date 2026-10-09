// The Leads Tool's shapes. Two kinds of lead: an account (a business that
// books rides again and again) and an event (a date with an organizer to
// pitch). Saving either one finds the decision-maker and writes the
// scripts, then it moves through the pipeline.

export type AccountCategory =
  | "HOTEL"
  | "VENUE"
  | "CORPORATE"
  | "LAW"
  | "FUNERAL"
  | "GOLF"
  | "CASINO"
  | "SENIOR"
  | "TOURS";

export type EventType =
  | "GALA"
  | "CONFERENCE"
  | "BUSINESS"
  | "FESTIVAL"
  | "CONCERT"
  | "GRADUATION"
  | "WEDDING_SHOW"
  | "TOURNAMENT"
  | "AUCTION";

export type SourceId =
  | "EVENTBRITE"
  | "CONVENTION"
  | "TOURISM"
  | "CHAMBER"
  | "UNIVERSITY"
  | "TICKETMASTER"
  | "WEDDING"
  | "TOURNAMENT";

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
  contact?: Contact;
  /** A line about this one in particular, for the brief. */
  note?: string;
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
};

export type EventLead = Place & {
  kind: "EVENT";
  type: EventType;
  source: SourceId;
  date: string;
  /** For events that run over several days. */
  endDate?: string;
  venue: string;
  organizer: string;
  guests?: number;
  phone?: string;
  website?: string;
};

export type Target = Account | EventLead;

/** A target as one client sees it: how far it is from their base. */
export type Located<T extends Target = Target> = T & { miles: number };

export type LeadStage = "NEW" | "CONTACTED" | "TALKING" | "WON" | "NOT_NOW";

export type ActivityKind =
  | "SAVED"
  | "FOUND"
  | "EMAIL"
  | "TEXT"
  | "CALL"
  | "MET"
  | "NOTE"
  | "STAGE"
  | "WON";

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
  morningEmail: boolean;
  operator: Operator;
};

export type Script = {
  email: { subject: string; body: string };
  text: string;
  call: string;
};
