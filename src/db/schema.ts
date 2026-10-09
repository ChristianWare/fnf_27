// The database, table by table. Money is in cents, times are timestamps
// with time zones, and every id is text so the ids from the old site carry
// over unchanged.
//
// To change it: edit this file, run `npm run db:generate` to write the SQL
// migration into /drizzle, then `npm run db:migrate`.

import type { Growth } from "@/lib/dashboard/types";
import type { Contact, Operator, Script } from "@/lib/leads/types";
import {
  ACCOUNT_CATEGORIES,
  ACTIVITY_KINDS,
  CALENDAR_SOURCES,
  EVENT_KINDS,
  LEAD_STAGES,
  SOURCE_IDS,
} from "../lib/leads/kinds";
import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const at = (name: string) => timestamp(name, { withTimezone: true });
const created = () => at("created_at").notNull().defaultNow();
const updated = () => at("updated_at").notNull().defaultNow();

/* ── People ── */

export const clients = pgTable(
  "clients",
  {
    id: text("id").primaryKey(),
    business: text("business").notNull(),
    city: text("city"),
    state: text("state"),
    phone: text("phone"),
    /** The site they have today, if any. */
    websiteUrl: text("website_url"),
    signedUpAt: at("signed_up_at").notNull().defaultNow(),
    /** When an admin approved them and set their plan. */
    approvedAt: at("approved_at"),
    /** Hidden from lists, signed out, billing stopped. Restorable. */
    archivedAt: at("archived_at"),
    /** What they asked for when they signed up. */
    requestPlan: text("request_plan", {
      enum: ["FULL_PLATFORM", "WEBSITE_ONLY", "LEADS"],
    }),
    requestMessage: text("request_message"),
    /** Admin-only. */
    notes: text("notes"),
    stripeCustomerId: text("stripe_customer_id").unique(),
    /** The card on file, as Stripe last told us. */
    cardBrand: text("card_brand"),
    cardLast4: text("card_last4"),
    cardExpMonth: integer("card_exp_month"),
    cardExpYear: integer("card_exp_year"),
    /** The Leads Tool on its own. The Full Platform includes it. */
    leadsStatus: text("leads_status", {
      enum: ["NONE", "TRIAL", "ACTIVE", "CANCELLING", "PAST_DUE", "ENDED"],
    })
      .notNull()
      .default("NONE"),
    leadsStartedAt: at("leads_started_at"),
    leadsTrialEndsAt: at("leads_trial_ends_at"),
    leadsSubscriptionId: text("leads_subscription_id").unique(),
    /** The next 1st (or when it stops, if cancelling), as Stripe last told us. */
    leadsNextBillingAt: at("leads_next_billing_at"),
    /** When the trial or plan ended. Saved leads are kept 90 days after. */
    leadsEndedAt: at("leads_ended_at"),
    /** The studio's switch: off shows "being set up" instead of the tool. */
    leadsEnabled: boolean("leads_enabled").notNull().default(true),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("clients_archived_idx").on(t.archivedAt)],
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().default(""),
    /** Always lowercase. */
    email: text("email").notNull().unique(),
    emailVerifiedAt: at("email_verified_at"),
    /** A new address they asked to switch to, until they confirm it. */
    pendingEmail: text("pending_email"),
    /** bcrypt. Empty until they set one (an invited admin, say). */
    passwordHash: text("password_hash"),
    phone: text("phone"),
    /** Their role at the business, e.g. "Owner". */
    title: text("title"),
    role: text("role", { enum: ["CLIENT", "ADMIN"] })
      .notNull()
      .default("CLIENT"),
    /** The person who set up the studio. Always an admin. */
    isOwner: boolean("is_owner").notNull().default(false),
    /** The business a client signs in for. */
    clientId: text("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    lastActiveAt: at("last_active_at"),
    /** Sessions signed before this stop working (password reset, say). */
    sessionsValidAfter: at("sessions_valid_after"),
    /** Which emails they get, e.g. { replies: false }. Missing means on. */
    notify: jsonb("notify")
      .$type<Record<string, boolean>>()
      .notNull()
      .default({}),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("users_client_idx").on(t.clientId)],
);

/** Links we email: verify an address, reset a password, accept an invite. */
export const authTokens = pgTable(
  "auth_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["VERIFY", "RESET", "INVITE"] }).notNull(),
    /** sha256 of the token. The token itself only ever lives in the email. */
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: at("expires_at").notNull(),
    usedAt: at("used_at"),
    createdAt: created(),
  },
  (t) => [index("auth_tokens_user_idx").on(t.userId)],
);

/** Counts sign-in and reset attempts, to slow down guessing. */
export const authAttempts = pgTable("auth_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: at("window_start").notNull().defaultNow(),
});

/* ── The website build ── */

export const websites = pgTable("websites", {
  clientId: text("client_id")
    .primaryKey()
    .references(() => clients.id, { onDelete: "cascade" }),
  plan: text("plan", { enum: ["FULL_PLATFORM", "WEBSITE_ONLY"] }).notNull(),
  /** Billing: PAST_DUE when the last charge failed. */
  status: text("status", {
    enum: ["ACTIVE", "PAST_DUE", "CANCELLING", "CANCELLED"],
  })
    .notNull()
    .default("ACTIVE"),
  /** This client's rate. List prices live in src/lib/dashboard/plans.ts. */
  monthlyCents: integer("monthly_cents").notNull(),
  setupFeeCents: integer("setup_fee_cents").notNull(),
  domain: text("domain"),
  liveUrl: text("live_url"),
  previewUrl: text("preview_url"),
  bookingAdminUrl: text("booking_admin_url"),
  startedAt: at("started_at").notNull().defaultNow(),
  targetLaunch: at("target_launch"),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  /** The next 1st, as Stripe last told us. */
  nextBillingAt: at("next_billing_at"),
  /** The build, as a list of things that happened: { stepName: ISO date }. */
  facts: jsonb("facts").$type<Record<string, string>>().notNull().default({}),
  /** The three design options and the one they chose. */
  designs: jsonb("designs")
    .$type<{
      readyAt?: string;
      options: {
        id: string;
        name: string;
        mood: string;
        palette: { name: string; hex: string }[];
        type: string;
        notes: string[];
        images?: string[];
      }[];
      chosen?: string;
      chosenAt?: string;
    }>()
    .notNull()
    .default({ options: [] }),
  /** The Growth page, as entered in the admin. */
  growth: jsonb("growth").$type<Growth>(),
  createdAt: created(),
  updatedAt: updated(),
});

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    kind: text("kind", { enum: ["AGREEMENT", "OTHER"] })
      .notNull()
      .default("OTHER"),
    /** INFO: for their records, nothing to sign. */
    status: text("status", { enum: ["AWAITING", "SIGNED", "INFO"] }).notNull(),
    /** The text, for documents written here. */
    body: jsonb("body").$type<{ heading: string; text: string }[]>(),
    /** The file, for documents uploaded as a PDF. */
    fileUrl: text("file_url"),
    fileName: text("file_name"),
    sentAt: at("sent_at").notNull().defaultNow(),
    signedAt: at("signed_at"),
    /** The name they typed to sign. */
    signedBy: text("signed_by"),
    signedIp: text("signed_ip"),
    visible: boolean("visible").notNull().default(true),
    createdAt: created(),
  },
  (t) => [index("documents_client_idx").on(t.clientId)],
);

export const questionnaires = pgTable("questionnaires", {
  clientId: text("client_id")
    .primaryKey()
    .references(() => clients.id, { onDelete: "cascade" }),
  answers: jsonb("answers")
    .$type<Record<string, string | string[]>>()
    .notNull()
    .default({}),
  /** Answers from the old site's questionnaire, kept for reference. */
  legacyAnswers: jsonb("legacy_answers"),
  savedAt: at("saved_at"),
  submittedAt: at("submitted_at"),
});

export const assets = pgTable(
  "assets",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    label: text("label").notNull().default("Other"),
    sizeBytes: integer("size_bytes"),
    mimeType: text("mime_type"),
    url: text("url").notNull(),
    /** Cloudinary's id, to delete it later. */
    publicId: text("public_id"),
    createdAt: created(),
  },
  (t) => [index("assets_client_idx").on(t.clientId)],
);

export const blueprintPages = pgTable(
  "blueprint_pages",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    path: text("path").notNull().default("/"),
    purpose: text("purpose").notNull().default(""),
    keyword: text("keyword"),
    position: integer("position").notNull().default(0),
    createdAt: created(),
  },
  (t) => [index("blueprint_pages_client_idx").on(t.clientId)],
);

export const blueprintSections = pgTable(
  "blueprint_sections",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id")
      .notNull()
      .references(() => blueprintPages.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: text("status", { enum: ["DRAFT", "REVIEW", "APPROVED"] })
      .notNull()
      .default("DRAFT"),
    /** Paragraphs. */
    copy: jsonb("copy").$type<string[]>().notNull().default([]),
    position: integer("position").notNull().default(0),
    updatedAt: updated(),
  },
  (t) => [index("blueprint_sections_page_idx").on(t.pageId)],
);

export const blueprintComments = pgTable(
  "blueprint_comments",
  {
    id: text("id").primaryKey(),
    sectionId: text("section_id")
      .notNull()
      .references(() => blueprintSections.id, { onDelete: "cascade" }),
    author: text("author", { enum: ["CLIENT", "STUDIO"] }).notNull(),
    name: text("name").notNull(),
    text: text("text").notNull(),
    createdAt: created(),
  },
  (t) => [index("blueprint_comments_section_idx").on(t.sectionId)],
);

/* ── Talking to clients ── */

export const changeRequests = pgTable(
  "change_requests",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    /** #1, #2… per client. */
    number: integer("number").notNull(),
    title: text("title").notNull(),
    area: text("area").notNull().default("Whole site"),
    details: text("details").notNull().default(""),
    status: text("status", {
      enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "DECLINED"],
    })
      .notNull()
      .default("PENDING"),
    reply: text("reply"),
    submittedAt: at("submitted_at").notNull().defaultNow(),
    updatedAt: at("updated_at"),
    completedAt: at("completed_at"),
  },
  (t) => [uniqueIndex("change_requests_number_idx").on(t.clientId, t.number)],
);

export const threads = pgTable(
  "threads",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    subject: text("subject").notNull(),
    status: text("status", { enum: ["OPEN", "ANSWERED", "CLOSED"] })
      .notNull()
      .default("OPEN"),
    /** A reply the client hasn't seen yet. */
    clientUnread: boolean("client_unread").notNull().default(false),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("threads_client_idx").on(t.clientId)],
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    author: text("author", { enum: ["CLIENT", "STUDIO"] }).notNull(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    text: text("text").notNull(),
    createdAt: created(),
  },
  (t) => [index("messages_thread_idx").on(t.threadId)],
);

/** What happened, newest first, in the client's dashboard ("You signed…"). */
export const activity = pgTable(
  "activity",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: [
        "build",
        "change",
        "document",
        "growth",
        "invoice",
        "leads",
        "support",
      ],
    }).notNull(),
    text: text("text").notNull(),
    href: text("href"),
    createdAt: created(),
  },
  (t) => [index("activity_client_idx").on(t.clientId, t.createdAt)],
);

/* ── Money ── */

export const invoices = pgTable(
  "invoices",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    /** In order and never reused, e.g. "INV-2026-0012". */
    number: text("number").notNull().unique(),
    stripeInvoiceId: text("stripe_invoice_id").unique(),
    description: text("description").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: text("status", { enum: ["PAID", "DUE", "VOID"] }).notNull(),
    issuedAt: at("issued_at").notNull().defaultNow(),
    periodStart: at("period_start"),
    periodEnd: at("period_end"),
    paidAt: at("paid_at"),
    /** How it was paid, e.g. "Visa ending 4242". */
    method: text("method"),
    product: text("product", {
      enum: ["WEBSITE", "SETUP", "LEADS", "OTHER"],
    })
      .notNull()
      .default("OTHER"),
    /** When the PDF went to the client. */
    emailedAt: at("emailed_at"),
    createdAt: created(),
  },
  (t) => [index("invoices_client_idx").on(t.clientId)],
);

/** Stripe events we've handled, so a retried webhook does nothing twice. */
export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: at("received_at").notNull().defaultNow(),
});

/** Studio-wide settings: notifications, invoice emails, Stripe product ids. */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updated(),
});

/* ── The Leads Tool ──
 *
 * Shared by everyone: markets (the areas the nightly jobs cover), the
 * places and events found in them, and what we've learned about each
 * business. Per client: their settings, the leads they saved and what
 * they did with them.
 *
 * Google's terms: a place ID can be kept for good; everything else Google
 * tells us about a place (name, address, location, phone, rating) is kept
 * at most 30 days, then refreshed or cleared. */

export const leadsMarkets = pgTable("leads_markets", {
  id: text("id").primaryKey(),
  /** "Phoenix area". */
  name: text("name").notNull(),
  /** The city and state it's searched by: "Phoenix", "AZ". */
  city: text("city").notNull(),
  state: text("state").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  radiusMiles: integer("radius_miles").notNull().default(75),
  /** An admin paused it: no nightly runs, even with clients in it. */
  paused: boolean("paused").notNull().default(false),
  /** Until its first run finishes, its clients see "being set up". */
  firstLoadedAt: at("first_loaded_at"),
  lastRunAt: at("last_run_at"),
  createdAt: created(),
});

/** Accounts: businesses found on Google, by place ID. */
export const leadsPlaces = pgTable(
  "leads_places",
  {
    /** Google's place ID. */
    id: text("id").primaryKey(),
    marketId: text("market_id")
      .notNull()
      .references(() => leadsMarkets.id, { onDelete: "cascade" }),
    category: text("category", { enum: ACCOUNT_CATEGORIES }).notNull(),
    firstSeenAt: at("first_seen_at").notNull().defaultNow(),
    /** The last night a search still returned it. */
    lastSeenAt: at("last_seen_at").notNull().defaultNow(),
    /** Google's details, all cleared together after 30 days. */
    name: text("name"),
    address: text("address"),
    city: text("city"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    rating: doublePrecision("rating"),
    reviews: integer("reviews"),
    phone: text("phone"),
    website: text("website"),
    types: jsonb("types").$type<string[]>(),
    detailsAt: at("details_at"),
    /** Closed for good, says Google. Hidden. */
    closed: boolean("closed").notNull().default(false),
    /** In the news lately (an opening, a move), from the weekly check. */
    news: jsonb("news").$type<{ title: string; url: string; at: string }>(),
  },
  (t) => [
    index("leads_places_market_idx").on(t.marketId),
    index("leads_places_details_idx").on(t.detailsAt),
  ],
);

/** Events: dates with an organizer to pitch, from every source. */
export const leadsEvents = pgTable(
  "leads_events",
  {
    id: text("id").primaryKey(),
    marketId: text("market_id")
      .notNull()
      .references(() => leadsMarkets.id, { onDelete: "cascade" }),
    type: text("type", { enum: EVENT_KINDS }).notNull(),
    source: text("source", { enum: SOURCE_IDS }).notNull(),
    /** Each source's id for it ("TICKETMASTER:abc"), so it's added once. */
    keys: jsonb("keys").$type<string[]>().notNull().default([]),
    name: text("name").notNull(),
    startsAt: at("starts_at").notNull(),
    endsAt: at("ends_at"),
    /** Only the day is known. */
    allDay: boolean("all_day").notNull().default(false),
    venue: text("venue").notNull().default(""),
    address: text("address"),
    city: text("city").notNull().default(""),
    /** From the source, or from Google for the venue (then 30 days). */
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    geoFromGoogleAt: at("geo_from_google_at"),
    /** The venue on Google, for its photo and the map. Kept for good. */
    venuePlaceId: text("venue_place_id"),
    organizer: text("organizer").notNull().default(""),
    organizerUrl: text("organizer_url"),
    url: text("url"),
    guests: integer("guests"),
    phone: text("phone"),
    description: text("description"),
    foundAt: at("found_at").notNull().defaultNow(),
    updatedAt: updated(),
  },
  (t) => [index("leads_events_market_idx").on(t.marketId, t.startsAt)],
);

/** Venues we've looked up on Google, so each one is looked up once. */
export const leadsVenues = pgTable("leads_venues", {
  /** The venue's name and city, lowercased. */
  key: text("key").primaryKey(),
  placeId: text("place_id"),
  lastLookedAt: at("last_looked_at").notNull().defaultNow(),
});

/**
 * What we've learned about a business, shared by every client and
 * refreshed every 90 days: whether they have a car service, a line about
 * them, and the decision-maker. Keyed by place ID, or "org:" and the
 * organizer's website for events.
 */
export const leadsResearch = pgTable("leads_research", {
  key: text("key").primaryKey(),
  domain: text("domain"),
  carService: text("car_service", { enum: ["NONE", "HAS", "UNKNOWN"] }),
  carServiceNote: text("car_service_note"),
  /** A line or two about them, from their website. */
  brief: text("brief"),
  checkedAt: at("checked_at"),
  /** The person who books the rides. Work emails only. */
  contact: jsonb("contact").$type<
    Contact & { source: "TEAM_PAGE" | "APOLLO" }
  >(),
  contactCheckedAt: at("contact_checked_at"),
  error: text("error"),
});

/** Calendars an admin added for a market: iCal, RSS or event pages. */
export const leadsSources = pgTable(
  "leads_sources",
  {
    id: text("id").primaryKey(),
    marketId: text("market_id")
      .notNull()
      .references(() => leadsMarkets.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    url: text("url").notNull(),
    /** How it's labeled on the leads it finds. */
    source: text("source", { enum: CALENDAR_SOURCES }).notNull(),
    /** The kind of event, when its titles don't say. */
    eventType: text("event_type", { enum: EVENT_KINDS }),
    enabled: boolean("enabled").notNull().default(true),
    lastRunAt: at("last_run_at"),
    lastCount: integer("last_count"),
    lastError: text("last_error"),
    createdAt: created(),
  },
  (t) => [index("leads_sources_market_idx").on(t.marketId)],
);

/** Each market's nightly run (or "Run now"), step by step. */
export const leadsRuns = pgTable(
  "leads_runs",
  {
    id: text("id").primaryKey(),
    marketId: text("market_id")
      .notNull()
      .references(() => leadsMarkets.id, { onDelete: "cascade" }),
    /** The Arizona date it ran for, "2026-10-09". */
    day: text("day").notNull(),
    trigger: text("trigger", { enum: ["NIGHTLY", "MANUAL"] }).notNull(),
    status: text("status", { enum: ["RUNNING", "DONE", "FAILED"] })
      .notNull()
      .default("RUNNING"),
    /** The steps finished so far, and where the current one got to. */
    cursor: jsonb("cursor")
      .$type<{ done: string[]; queue?: unknown[] }>()
      .notNull()
      .default({ done: [] }),
    counts: jsonb("counts")
      .$type<Record<string, number>>()
      .notNull()
      .default({}),
    errors: jsonb("errors").$type<string[]>().notNull().default([]),
    /** One worker at a time: whoever holds this, until it passes. */
    lockedUntil: at("locked_until"),
    startedAt: at("started_at").notNull().defaultNow(),
    finishedAt: at("finished_at"),
  },
  (t) => [
    index("leads_runs_market_idx").on(t.marketId, t.startedAt),
    // One run under way per market at a time.
    uniqueIndex("leads_runs_one_running_idx")
      .on(t.marketId)
      .where(sql`${t.status} = 'RUNNING'`),
  ],
);

/** A client's Leads Tool settings. */
export const leadsSettings = pgTable("leads_settings", {
  clientId: text("client_id")
    .primaryKey()
    .references(() => clients.id, { onDelete: "cascade" }),
  baseCity: text("base_city").notNull(),
  baseLat: doublePrecision("base_lat").notNull(),
  baseLng: doublePrecision("base_lng").notNull(),
  radius: integer("radius").notNull().default(50),
  categories: jsonb("categories")
    .$type<(typeof ACCOUNT_CATEGORIES)[number][]>()
    .notNull(),
  eventTypes: jsonb("event_types")
    .$type<(typeof EVENT_KINDS)[number][]>()
    .notNull(),
  /** How their scripts introduce them. */
  operator: jsonb("operator").$type<Operator>().notNull(),
  marketId: text("market_id").references(() => leadsMarkets.id, {
    onDelete: "set null",
  }),
  updatedAt: updated(),
});

/** The leads a client saved. */
export const leadsSaved = pgTable(
  "leads_saved",
  {
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    /** A place ID (account) or an event id. */
    targetId: text("target_id").notNull(),
    kind: text("kind", { enum: ["ACCOUNT", "EVENT"] }).notNull(),
    stage: text("stage", { enum: LEAD_STAGES }).notNull().default("NEW"),
    savedAt: at("saved_at").notNull().defaultNow(),
    remindAt: at("remind_at"),
    valueCents: integer("value_cents"),
    per: text("per", { enum: ["MONTH", "ONCE"] }),
    wonAt: at("won_at"),
    /** The email, text and call opener, written for this client. */
    scripts: jsonb("scripts").$type<Script>(),
    scriptsAt: at("scripts_at"),
    /** How many times they asked for new scripts today, and which day. */
    rewrites: jsonb("rewrites").$type<{ day: string; count: number }>(),
    updatedAt: updated(),
  },
  (t) => [primaryKey({ columns: [t.clientId, t.targetId] })],
);

export const leadsActivity = pgTable(
  "leads_activity",
  {
    id: text("id").primaryKey(),
    clientId: text("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    targetId: text("target_id").notNull(),
    kind: text("kind", { enum: ACTIVITY_KINDS }).notNull(),
    text: text("text").notNull(),
    at: at("at").notNull().defaultNow(),
  },
  (t) => [index("leads_activity_lead_idx").on(t.clientId, t.targetId)],
);

/** Drive times from a base to a lead, from Google (kept 30 days). */
export const leadsDrives = pgTable(
  "leads_drives",
  {
    /** The base, rounded: "33.449,-112.074". */
    fromKey: text("from_key").notNull(),
    targetId: text("target_id").notNull(),
    minutes: integer("minutes").notNull(),
    miles: integer("miles").notNull(),
    at: at("at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.fromKey, t.targetId] })],
);

/**
 * What the Leads Tool's outside services were used for, per day: by a
 * client (saving a lead) or by a market's nightly run (clientId empty).
 * Costs are estimates, in millionths of a dollar.
 */
export const leadsUsage = pgTable(
  "leads_usage",
  {
    /** Arizona date. */
    day: text("day").notNull(),
    clientId: text("client_id").notNull().default(""),
    marketId: text("market_id").notNull().default(""),
    api: text("api").notNull(),
    calls: integer("calls").notNull().default(0),
    costMicros: integer("cost_micros").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.clientId, t.marketId, t.api] })],
);

/** Emails that go out once (a reminder, a morning email), by a key. */
export const sentNotices = pgTable("sent_notices", {
  key: text("key").primaryKey(),
  sentAt: at("sent_at").notNull().defaultNow(),
});
