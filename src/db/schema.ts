// The database, table by table. Money is in cents, times are timestamps
// with time zones, and every id is text so the ids from the old site carry
// over unchanged.
//
// To change it: edit this file, run `npm run db:generate` to write the SQL
// migration into /drizzle, then `npm run db:migrate`.

import type { Growth } from "@/lib/dashboard/types";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
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
