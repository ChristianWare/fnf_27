// The service agreement a client signs, in the proposal's layout: who it's
// between, the plan and what's included, the investment, the terms and the
// signatures. Safe anywhere.
//
// The admin shapes the words before approving a sign-up: start from a
// template (Black car, General business, or one they saved), then edit the
// plan, the list of what's included and any term. The names, the fees and
// the signatures are filled in from the account, so the agreement never
// disagrees with what Stripe charges.

import { PLANS } from "@/lib/dashboard/plans";
import type { PlanId } from "@/lib/dashboard/types";
import { PRESETS } from "@/lib/proposals/types";

export type AgreementTerm = { heading: string; text: string };

/** The part the admin writes. */
export type AgreementDraft = {
  /** The template it started from: BLACK_CAR, GENERAL or a saved one's id. */
  template: string;
  /** The service's name, e.g. "Website Only" or "Custom Booking Website". */
  service: string;
  summary: string;
  included: string[];
  timeline: string;
  terms: AgreementTerm[];
};

/** A saved starting point. */
export type AgreementTemplate = Omit<AgreementDraft, "template"> & {
  id: string;
  name: string;
};

/** The agreement as sent: the draft plus what the account fills in. */
export type AgreementBody = AgreementDraft & {
  v: 2;
  /** When it was sent, or last changed. ISO. */
  date: string;
  parties: { name: string; business: string; email: string; city: string };
  plan: PlanId;
  fees: {
    monthly: number;
    /** What's due to start: 0 when waived. */
    setup: number;
    /** The plan's usual setup fee, shown struck through when waived. */
    listSetup: number;
  };
  /** The account email of whoever signed it. */
  signerEmail?: string;
};

export const BUILT_IN: { id: string; name: string; help: string }[] = [
  {
    id: "BLACK_CAR",
    name: "Black car",
    help: "Fleet, vehicles, airport rides, and booking and dispatch on the Full Platform.",
  },
  {
    id: "GENERAL",
    name: "General business",
    help: "The same terms with no transport language, for any other industry.",
  },
];

export const LIMITS = {
  service: 80,
  summary: 600,
  included: 20,
  item: 200,
  timeline: 160,
  terms: 30,
  heading: 80,
  text: 2000,
  templates: 30,
  templateName: 40,
};

/* ── The terms ── */

const work = (general: boolean): AgreementTerm => ({
  heading: "The work",
  text: `Fonts & Footers will design, build, launch and host the ${general ? "website and services" : "website and software"} described under The plan above. Anything not listed there is outside this agreement, and is quoted and agreed in writing before any work on it starts.`,
});

const fees = (general: boolean): AgreementTerm => ({
  heading: "Fees and payment",
  text: `You'll pay the fees shown under Investment. The monthly fee is charged automatically to the card on file on the 1st of every month, starting the 1st after the setup fee is paid, or after you add your card when the setup fee is waived. Payments are non-refundable once work on the current billing cycle has started.${general ? "" : " There are no per-booking fees."}`,
});

const missed: AgreementTerm = {
  heading: "Missed payments",
  text: "If a charge fails, we'll retry it and let you know. If a payment is still unpaid 14 days after it was due, we may pause your site and your dashboard until it's paid. Nothing is deleted while it's paused.",
};

const provide: AgreementTerm = {
  heading: "What you'll provide",
  text: "Your logo, photos and business details, a completed questionnaire, and one contact who can approve work for your business. You'll review each stage within 5 business days of it being sent to you. The timeline moves with these.",
};

const approvals: AgreementTerm = {
  heading: "Approvals",
  text: "You'll approve the blueprint (every page of your site and its wording) as a whole, choose one of the design directions we send, and approve the preview before launch. One round of revisions to the chosen design is included. Once a stage is approved, reopening it counts as a change.",
};

const changes = (general: boolean): AgreementTerm => ({
  heading: "Changes",
  text: `While your plan is active, small changes are unlimited: text, photos, prices, hours${general ? ", services" : ", vehicles, service areas"} and new sections on existing pages. Most are done within two business days. New pages, new features or a redesign are quoted before any work starts. Send changes through your dashboard so nothing gets lost.`,
});

const rides: AgreementTerm = {
  heading: "Your rides",
  text: "You set your own rates and run your own rides. Your vehicles, your drivers, their licensing and insurance, and the service you give your riders are your responsibility. Payments from your riders go straight to your own Stripe account, at Stripe's standard rates; Fonts & Footers never holds your money.",
};

const ownership: AgreementTerm = {
  heading: "Ownership",
  text: "Your business name, logo, photos, written content, customer data and domain are yours. The design system, code and software we build with are ours, and you use them as part of your plan while it's active. Fonts & Footers may show your site in its portfolio unless you ask us in writing not to.",
};

const hosting = (general: boolean): AgreementTerm => ({
  heading: "Hosting and other services",
  text: `We host your site, keep it secure and back it up. Some features rely on other companies, such as Stripe for payments, Google for search and maps, your domain registrar${general ? "" : " and flight-data providers"}. We aren't responsible for their outages or changes, but we'll help you work around them.`,
});

const confidential: AgreementTerm = {
  heading: "Confidentiality",
  text: "Both of us will keep private any business information, pricing, plans and technical details the other shares during this agreement. This continues after the agreement ends.",
};

const liability: AgreementTerm = {
  heading: "Limitation of liability",
  text: "Neither of us is liable for indirect, incidental or consequential damages, such as lost profits or lost bookings. Fonts & Footers' total liability under this agreement is limited to the fees you paid in the three months before the claim.",
};

const cancelling: AgreementTerm = {
  heading: "Cancelling",
  text: "Month to month, with no long-term contract. You can cancel anytime from your dashboard or by email, no questions asked. It takes effect at the end of that billing month and you won't be charged again. We can end this agreement with 30 days' written notice, or sooner if fees go unpaid. Either way, we'll export your content and data on request within 30 days.",
};

const law: AgreementTerm = {
  heading: "Law and the whole agreement",
  text: "Arizona law governs this agreement, and any dispute goes to the courts of Maricopa County, Arizona, including small claims where it qualifies. This agreement and the Terms of Service at fontsandfooters.com/terms are the whole agreement between us; where they differ, this agreement wins. Typing your name below is your signature.",
};

function terms(general: boolean, plan: PlanId): AgreementTerm[] {
  return [
    work(general),
    fees(general),
    missed,
    provide,
    approvals,
    changes(general),
    ...(!general && plan === "FULL_PLATFORM" ? [rides] : []),
    ownership,
    hosting(general),
    confidential,
    liability,
    cancelling,
    law,
  ];
}

const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** A built-in template, filled in for a plan. */
export function builtInDraft(id: string, plan: PlanId): AgreementDraft {
  if (id === "GENERAL") {
    const full = plan === "FULL_PLATFORM";
    return {
      template: "GENERAL",
      service: full ? "Custom Website and Booking Software" : "Custom Website",
      summary: full
        ? "A custom website built around the searches your clients make, with your own booking software built in, so clients book on your site, under your name."
        : "A custom website built around the searches your clients make, connected to the booking or scheduling software you already use.",
      included: full
        ? [
            "A custom website designed for your brand",
            "Built for search: page titles, structured data, a sitemap and fast load times",
            "Online booking built into your site, with your own admin dashboard",
            "Payments through your own Stripe account, at Stripe's standard rates",
            "Hosting, security, backups and edits included",
          ]
        : [
            "A custom website designed for your brand",
            "Built for search: page titles, structured data, a sitemap and fast load times",
            "Your current booking or scheduling system connected to every page",
            "Hosting, security, backups and edits included",
          ],
      timeline: "About 3 weeks from kickoff to launch.",
      terms: terms(true, plan),
    };
  }
  const preset = PRESETS[plan];
  return {
    template: "BLACK_CAR",
    service: PLANS[plan].name,
    summary: preset.summary,
    included: lines(preset.included),
    timeline: preset.timeline,
    terms: terms(false, plan),
  };
}

/** A saved template, as a draft. */
export function fromTemplate(t: AgreementTemplate): AgreementDraft {
  return {
    template: t.id,
    service: t.service,
    summary: t.summary,
    included: [...t.included],
    timeline: t.timeline,
    terms: t.terms.map((x) => ({ ...x })),
  };
}

// Words that say "black car" in a business name or a sign-up note.
const LIMO =
  /\b(limo|limos|limousine|limousines|chauffeur|chauffeured|black ?car|car service|sedan|suv|transport|transportation|transfers?|shuttle|livery|rides?|coach|executive cars?|airport)\b/i;

/** Black car if their name or note sounds like it, otherwise General. */
export function guessTemplate(...text: (string | undefined)[]) {
  return LIMO.test(text.filter(Boolean).join(" ")) ? "BLACK_CAR" : "GENERAL";
}

export function isAgreementBody(value: unknown): value is AgreementBody {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (value as { v?: unknown }).v === 2
  );
}

const str = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim().slice(0, max) : "";

/** A draft from the form, trimmed to size. Throws when it can't be sent. */
export function cleanDraft(input: unknown): AgreementDraft {
  const d = (input ?? {}) as Record<string, unknown>;
  const included = (Array.isArray(d.included) ? d.included : [])
    .map((x) => str(x, LIMITS.item).replace(/\n+/g, " "))
    .filter(Boolean)
    .slice(0, LIMITS.included);
  const terms = (Array.isArray(d.terms) ? d.terms : [])
    .map((t) => {
      const term = (t ?? {}) as Record<string, unknown>;
      return {
        heading: str(term.heading, LIMITS.heading).replace(/\n+/g, " "),
        text: str(term.text, LIMITS.text),
      };
    })
    .filter((t) => t.heading || t.text)
    .slice(0, LIMITS.terms);
  const draft: AgreementDraft = {
    template: str(d.template, 40) || "GENERAL",
    service: str(d.service, LIMITS.service).replace(/\n+/g, " "),
    summary: str(d.summary, LIMITS.summary),
    included,
    timeline: str(d.timeline, LIMITS.timeline).replace(/\n+/g, " "),
    terms,
  };
  if (!draft.service) throw new Error("Give the service a name.");
  if (!draft.terms.length) throw new Error("Add at least one term.");
  const untitled = draft.terms.findIndex((t) => !t.heading || !t.text);
  if (untitled >= 0)
    throw new Error(`Term ${untitled + 1} needs a heading and its wording.`);
  return draft;
}

/** The agreement, ready to store: the draft plus the account's details. */
export function buildAgreement(
  draft: AgreementDraft,
  account: {
    parties: AgreementBody["parties"];
    plan: PlanId;
    monthly: number;
    setup: number;
    date?: Date;
  },
): AgreementBody {
  return {
    v: 2,
    ...draft,
    date: (account.date ?? new Date()).toISOString(),
    parties: account.parties,
    plan: account.plan,
    fees: {
      monthly: account.monthly,
      setup: account.setup,
      listSetup: PLANS[account.plan].setup,
    },
  };
}

/** What starts the monthly charge, for the Investment table. */
export function startsWhen(body: Pick<AgreementBody, "fees">) {
  return body.fees.setup > 0
    ? "the 1st after your setup fee is paid"
    : "the 1st after you add your card";
}

/** A short reference for the document, from its id. */
export const docRef = (id: string) => id.slice(0, 8).toUpperCase();

/** The agreement's file name. */
export const agreementFileName = (business: string) =>
  `Fonts-and-Footers-Agreement-${
    business
      .normalize("NFKD")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "Client"
  }.pdf`;
