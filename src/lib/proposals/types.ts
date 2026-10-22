// A proposal: what the admin fills in on /admin/proposals, turned into a
// PDF by ProposalPdf. Nothing is saved; the form sends these fields and
// gets the PDF back.
//
// The presets fill the form with the plan's price and what it includes.
// "Custom" starts blank, for work outside the limo plans (another
// industry, a one-off project), and every field stays editable either way.

import { LEADS, PLANS } from "@/lib/dashboard/plans";

export type ProposalPlan = "FULL_PLATFORM" | "WEBSITE_ONLY" | "LEADS" | "CUSTOM";

export type Proposal = {
  /** Who it's for. */
  contactName: string;
  business: string;
  email: string;
  city: string;
  /** YYYY-MM-DD. */
  date: string;
  /** How many days the offer stands. */
  validDays: number;
  plan: ProposalPlan;
  /** The name of the service, e.g. "Full Platform" or "Website redesign". */
  service: string;
  /** One or two sentences under the service name. */
  summary: string;
  /** The one-time fee: setup, or the whole price of a one-off project. */
  setup: number;
  /** Show the one-time fee as waived. */
  waiveSetup: boolean;
  /** The reason shown beside a waived fee, e.g. "Friends and family". */
  waiveReason: string;
  /** 0 for no monthly charge. */
  monthly: number;
  /** Free days before the monthly charge starts (the Leads Tool's trial). */
  trialDays: number;
  /** One item per line. */
  included: string;
  timeline: string;
  /** The personal note at the top. */
  note: string;
  /** Nier Transportation's results; limo work only. */
  caseStudy: boolean;
  /** One term per line. */
  terms: string;
  nextSteps: string;
};

export const PLAN_LABELS: Record<ProposalPlan, string> = {
  FULL_PLATFORM: PLANS.FULL_PLATFORM.name,
  WEBSITE_ONLY: PLANS.WEBSITE_ONLY.name,
  LEADS: LEADS.name,
  CUSTOM: "Custom",
};

// The terms from the Web Services Agreement, in plain words. Edit them per
// proposal; the signed agreement is still what governs.
const LIMO_TERMS = [
  "Month to month. Cancel anytime with 30 days' notice in writing.",
  "The monthly plan is charged automatically to the card on file on the 1st of every month, starting the 1st after your account is activated.",
  "Payments are non-refundable once work on the current billing cycle has started.",
  "You'll provide your logo, photos and details, and review each stage within 5 business days. The timeline moves with them.",
  "One round of revisions after the design review is included. Changes after approval are quoted separately.",
  "Your domain, your phone number and your customer list stay yours.",
].join("\n");

const CUSTOM_TERMS = [
  "Payments are non-refundable once work on the current billing cycle has started.",
  "You'll provide your logo, photos and details, and review each stage within 5 business days. The timeline moves with them.",
  "One round of revisions after the design review is included. Changes after approval are quoted separately.",
  "You own the custom design and content once paid in full.",
].join("\n");

const NEXT_STEPS =
  "Reply to this proposal to accept, and I'll send your sign-up link and a short questionnaire to get started. Questions first? Book a 20-minute call: calendly.com/chris-ware-dev/discovery-call";

type Preset = Pick<
  Proposal,
  | "service"
  | "summary"
  | "setup"
  | "monthly"
  | "trialDays"
  | "included"
  | "timeline"
  | "caseStudy"
  | "terms"
>;

export const PRESETS: Record<ProposalPlan, Preset> = {
  FULL_PLATFORM: {
    service: PLANS.FULL_PLATFORM.name,
    summary:
      "Your website and your booking and dispatch software in one system, with the Leads Tool included. Riders book on your site, under your name, and every ride runs from one dashboard.",
    setup: PLANS.FULL_PLATFORM.setup,
    monthly: PLANS.FULL_PLATFORM.monthly,
    trialDays: 0,
    included: [
      "A custom website designed for your brand, with a page for each airport, route and city you serve",
      "Online booking with instant quotes, built into your site",
      "Dispatch from your admin dashboard: assign drivers and vehicles without conflicts",
      "A driver portal on any phone, with nothing to install",
      "Flight tracking on airport rides",
      "Payments through your own Stripe account, at Stripe's standard rates",
      "The Leads Tool: hotels, venues and companies in your market that book rides, every morning",
      "Unlimited drivers and vehicles, and no per-booking fees",
      "Hosting, security, backups and edits included",
    ].join("\n"),
    timeline: "About 3 weeks from kickoff to launch.",
    caseStudy: true,
    terms: LIMO_TERMS,
  },
  WEBSITE_ONLY: {
    service: PLANS.WEBSITE_ONLY.name,
    summary:
      "A custom website built around the searches your riders make, connected to the booking software you already use.",
    setup: PLANS.WEBSITE_ONLY.setup,
    monthly: PLANS.WEBSITE_ONLY.monthly,
    trialDays: 0,
    included: [
      "A custom website designed for your brand",
      "Airport, route, corporate and wedding pages, and a page for every city you serve",
      "Built for search: page titles, structured data, a sitemap and fast load times",
      "Your current booking system connected to every page",
      "Hosting, security, backups and edits included",
      "Upgrade to the Full Platform anytime, with no rebuild",
    ].join("\n"),
    timeline: "About 3 weeks from kickoff to launch.",
    caseStudy: true,
    terms: LIMO_TERMS,
  },
  LEADS: {
    service: LEADS.name,
    summary:
      "The hotels, venues, companies and events near your base that book rides, every morning, each with the decision-maker's contact and a script written for that business.",
    setup: 0,
    monthly: LEADS.monthly,
    trialDays: LEADS.trialDays,
    included: [
      "New leads in your market every morning, each scored out of 100",
      "The decision-maker to ask for, and how to reach them",
      "Outreach scripts written for each business",
      "A pipeline to track every conversation",
      "No per-lead fees",
    ].join("\n"),
    timeline: "Your first leads the day you sign up.",
    caseStudy: false,
    terms: [
      `Free for the first ${LEADS.trialDays} days, with no card needed.`,
      `Then $${LEADS.monthly} a month, charged automatically on the 1st of every month. Cancel anytime.`,
      "Included at no extra cost with the Full Platform.",
    ].join("\n"),
  },
  CUSTOM: {
    service: "",
    summary: "",
    setup: 0,
    monthly: 0,
    trialDays: 0,
    included: "",
    timeline: "",
    caseStudy: false,
    terms: CUSTOM_TERMS,
  },
};

const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix" }).format(
    new Date(),
  );

/** A fresh form, on the Full Platform. */
export function blankProposal(plan: ProposalPlan = "FULL_PLATFORM"): Proposal {
  return {
    contactName: "",
    business: "",
    email: "",
    city: "",
    date: today(),
    validDays: 14,
    plan,
    waiveSetup: false,
    waiveReason: "",
    note: "",
    nextSteps: NEXT_STEPS,
    ...PRESETS[plan],
  };
}

const str = (value: unknown, max: number) =>
  typeof value === "string" ? value.slice(0, max).trim() : "";

const num = (value: unknown, min: number, max: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};

/** The form's fields, checked and trimmed. Throws when it can't be used. */
export function parseProposal(body: unknown): Proposal {
  const b = (body ?? {}) as Record<string, unknown>;
  const plan = (
    ["FULL_PLATFORM", "WEBSITE_ONLY", "LEADS", "CUSTOM"] as const
  ).includes(b.plan as ProposalPlan)
    ? (b.plan as ProposalPlan)
    : "CUSTOM";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date))
    ? String(b.date)
    : today();

  const proposal: Proposal = {
    contactName: str(b.contactName, 120),
    business: str(b.business, 160),
    email: str(b.email, 200),
    city: str(b.city, 120),
    date,
    validDays: Math.round(num(b.validDays, 1, 365)),
    plan,
    service: str(b.service, 120),
    summary: str(b.summary, 800),
    setup: num(b.setup, 0, 1_000_000),
    waiveSetup: b.waiveSetup === true,
    waiveReason: str(b.waiveReason, 80),
    monthly: num(b.monthly, 0, 1_000_000),
    trialDays: Math.round(num(b.trialDays, 0, 365)),
    included: str(b.included, 4000),
    timeline: str(b.timeline, 400),
    note: str(b.note, 2000),
    caseStudy: b.caseStudy === true,
    terms: str(b.terms, 4000),
    nextSteps: str(b.nextSteps, 800),
  };

  if (!proposal.business && !proposal.contactName)
    throw new Error("Add the client's name or business.");
  if (!proposal.service) throw new Error("Add the name of the service.");
  return proposal;
}

/** The lines of a one-per-line field, without the blanks or bullets. */
export const lines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);

/** The file name: Fonts-and-Footers-Proposal-Acme-Limo.pdf */
export function proposalFileName(p: Proposal) {
  const who = (p.business || p.contactName)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `Fonts-and-Footers-Proposal${who ? `-${who}` : ""}.pdf`;
}

/**
 * The first monthly charge for a start on the proposal's date: the 1st of
 * the month after it, or after the free days when there are some. As
 * YYYY-MM-DD.
 */
export function firstChargeDate(iso: string, trialDays = 0) {
  const [y, m, d] = iso.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d + trialDays));
  const first = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
  );
  return first.toISOString().slice(0, 10);
}
