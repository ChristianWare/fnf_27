// Everything a dashboard page needs: who is signed in, their business, and
// the things worked out from it (the build steps, what needs them next).

import { cache } from "react";
import { requireUser } from "@/lib/auth/dal";
import { demoClient } from "./demo";
import { money } from "./format";
import { LEADS, PLANS } from "./plans";
import { assetsComplete, blueprintCounts } from "./helpers";
import type { Client, Growth } from "./types";

export * from "./helpers";

/** The signed-in user, their business and "now", once per request. */
export const getDashboard = cache(async () => {
  const user = await requireUser();
  const now = new Date();
  // SAMPLE: the sample clients. After the move, read the client from the
  // database here instead.
  const client = demoClient(user.clientId, now);
  if (!client) throw new Error(`No client found for ${user.email}.`);
  return { user, client, now: now.toISOString() };
});

export type LeadsAccess = "INCLUDED" | "TRIAL" | "ACTIVE" | "NONE";

/** Full Platform includes the Leads Tool; anyone else trials or pays. */
export function leadsAccess(client: Client): LeadsAccess {
  if (client.website?.plan === "FULL_PLATFORM") return "INCLUDED";
  return client.leads.status;
}

export const isLive = (client: Client) =>
  Boolean(client.website?.facts.launchedAt);

/* ── The build, step by step ── */

export type StepState = "done" | "you" | "us" | "upcoming";

export type Step = {
  id: string;
  title: string;
  text: string;
  owner: "you" | "us";
  state: StepState;
  doneAt?: string;
  href?: string;
  cta?: string;
};

type StepDef = Omit<Step, "state"> & {
  after: string[];
  /** For your steps: false while we're still preparing it. */
  ready?: boolean;
  /** Shown instead of the text while we're preparing it. */
  waitText?: string;
  done?: boolean;
};

export function projectSteps(client: Client): Step[] {
  const website = client.website;
  if (!website) return [];
  const f = website.facts;
  const full = website.plan === "FULL_PLATFORM";
  const counts = blueprintCounts(client.blueprint);
  const lastAsset = client.assets.at(-1)?.addedAt;

  const defs: StepDef[] = [
    {
      id: "agreement",
      title: "Sign your agreement",
      text: "Your plan, the fees and what we build.",
      owner: "you",
      after: [],
      doneAt: f.agreementSignedAt,
      href: "/dashboard/website/documents",
      cta: "Sign",
    },
    {
      id: "setup",
      title: "Pay the setup fee",
      text: `${money(website.setupFee)}, once. Monthly billing starts at launch.`,
      owner: "you",
      after: ["agreement"],
      doneAt: f.setupFeePaidAt,
      href: "/dashboard/billing",
      cta: "Pay",
    },
    {
      id: "questionnaire",
      title: "Fill in the questionnaire",
      text: "About 20 minutes: your rides, your fleet and your brand.",
      owner: "you",
      after: ["setup"],
      doneAt: f.questionnaireSubmittedAt,
      href: "/dashboard/website/questionnaire",
      cta: "Start",
    },
    {
      id: "assets",
      title: "Upload your brand assets",
      text: "Your logo, fleet photos and a photo of you or a chauffeur.",
      owner: "you",
      after: ["setup"],
      doneAt:
        f.assetsCompleteAt ??
        (assetsComplete(client.assets) ? lastAsset : undefined),
      href: "/dashboard/website/assets",
      cta: "Upload",
    },
    {
      id: "blueprint",
      title: "Approve your blueprint",
      text:
        counts.review > 0
          ? `${counts.review} section${counts.review === 1 ? " is" : "s are"} waiting for you.`
          : "Every page and section, written for the searches riders make.",
      waitText:
        counts.total > 0
          ? "We're working through your notes."
          : "We're writing every page and section of your site.",
      owner: "you",
      after: ["questionnaire"],
      doneAt:
        f.blueprintApprovedAt ??
        (counts.total > 0 && counts.approved === counts.total
          ? f.questionnaireSubmittedAt
          : undefined),
      ready: counts.review > 0,
      href: "/dashboard/website/blueprint",
      cta: "Review",
    },
    {
      id: "design",
      title: "Choose your design",
      text: "Three directions, made for your brand. Pick the one that feels like you.",
      waitText: "We're designing three options for you.",
      owner: "you",
      after: ["questionnaire"],
      doneAt: f.designChosenAt ?? client.designs.chosenAt,
      ready: client.designs.options.length > 0,
      href: "/dashboard/website/design",
      cta: "Choose",
    },
    ...(full
      ? ([
          {
            id: "stripe",
            title: "Connect Stripe",
            text: "Payments go straight to your own account. We send you a secure link.",
            owner: "you",
            after: ["questionnaire"],
            doneAt: f.stripeConnectedAt,
            href: "/dashboard/support",
            cta: "Ask for link",
          },
          {
            id: "rates",
            title: "We set up your vehicles and rates",
            text: "From your questionnaire. You check them on the preview.",
            owner: "us",
            after: ["questionnaire"],
            doneAt: f.ratesSetAt,
          },
          {
            id: "drivers",
            title: "Add your drivers",
            text: "Each one gets the driver app and their trips.",
            owner: "you",
            after: ["stripe"],
            doneAt: f.driversAddedAt,
            href: "/dashboard/support",
            cta: "Send names",
          },
        ] satisfies StepDef[])
      : ([
          {
            id: "booking",
            title: "Add your booking link",
            text: "So every Book now button opens the booking system you use today.",
            owner: "you",
            after: ["questionnaire"],
            doneAt:
              f.bookingLinkAddedAt ??
              (typeof client.answers.bookingLink === "string" &&
              client.answers.bookingLink
                ? f.questionnaireSubmittedAt
                : undefined),
            href: "/dashboard/website/questionnaire?section=booking",
            cta: "Add link",
          },
        ] satisfies StepDef[])),
    {
      id: "build",
      title: "We build your site",
      text: "Every page, the design, the SEO and the speed, built and tested.",
      owner: "us",
      after: full
        ? ["blueprint", "design", "assets", "rates", "drivers"]
        : ["blueprint", "design", "assets", "booking"],
      doneAt: f.previewReadyAt,
    },
    {
      id: "preview",
      title: "Review your preview",
      text: "Click through everything on your private preview link.",
      owner: "you",
      after: ["build"],
      doneAt: f.previewApprovedAt,
      href: "/dashboard/website",
      cta: "Open preview",
    },
    {
      id: "launch",
      title: "Launch day",
      text: "We point your domain at the new site and watch it go live.",
      owner: "us",
      after: ["preview"],
      doneAt: f.launchedAt,
    },
  ];

  const done = new Set(defs.filter((d) => d.doneAt).map((d) => d.id));

  return defs.map(({ after, ready, waitText, ...step }) => {
    if (step.doneAt) return { ...step, state: "done" as const };
    if (!after.every((id) => done.has(id))) {
      return { ...step, state: "upcoming" as const };
    }
    if (step.owner === "you" && ready !== false) {
      return { ...step, state: "you" as const };
    }
    return { ...step, text: waitText ?? step.text, state: "us" as const };
  });
}

/* ── What needs the client next ── */

export type Todo = {
  id: string;
  title: string;
  text: string;
  href: string;
  cta: string;
  external?: boolean;
};

export function todos(client: Client, now: string): Todo[] {
  const list: Todo[] = projectSteps(client)
    .filter((step) => step.state === "you" && step.href)
    .map((step) => ({
      id: step.id,
      title: step.title,
      text: step.text,
      href: step.href!,
      cta: step.cta ?? "Open",
    }));

  // Documents to sign after the build (the agreement is a build step).
  for (const doc of client.documents) {
    if (doc.status === "AWAITING" && doc.id !== "agreement") {
      list.push({
        id: `doc-${doc.id}`,
        title: `Sign: ${doc.title}`,
        text: doc.summary,
        href: "/dashboard/website/documents",
        cta: "Sign",
      });
    }
  }

  for (const thread of client.threads) {
    if (thread.unread) {
      list.push({
        id: `thread-${thread.id}`,
        title: "New reply from Chris",
        text: thread.subject,
        href: "/dashboard/support",
        cta: "Read",
      });
    }
  }

  if (client.leads.status === "TRIAL" && client.leads.trialEndsAt) {
    const days = trialDaysLeft(client, now);
    list.push({
      id: "leads-trial",
      title: `Your Leads Tool trial ends in ${days} days`,
      text: `Add a card anytime to keep it for ${money(LEADS.monthly)} a month. No charge until the trial ends.`,
      href: "/dashboard/billing#leads",
      cta: "Add a card",
    });
  }

  return list;
}

/** Days left in a Leads Tool trial. */
export function trialDaysLeft(client: Client, now: string) {
  if (!client.leads.trialEndsAt) return 0;
  return Math.max(
    0,
    Math.ceil(
      (new Date(client.leads.trialEndsAt).getTime() - new Date(now).getTime()) /
        86_400_000,
    ),
  );
}

export const planName = (client: Client) =>
  client.website ? PLANS[client.website.plan].name : LEADS.name;

/** This month so far: the target, and where the month is heading. */
export function growthNow(growth: Growth, now: string) {
  const current = growth.months.find((m) => m.actual === undefined);
  // The day of the month in Arizona (UTC-7 all year).
  const local = new Date(new Date(now).getTime() - 7 * 3_600_000);
  const day = local.getUTCDate();
  const daysInMonth = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const pace = Math.round((growth.monthToDate * daysInMonth) / day);
  return { current, pace, day, daysInMonth };
}
