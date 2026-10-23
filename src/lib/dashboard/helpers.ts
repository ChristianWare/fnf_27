// Small, pure helpers that both server and client components use: the
// build steps, what needs a client next, and so on. Keep this file free of
// anything server-only (cookies, the database).

import { money } from "./format";
import { LEADS, PLANS } from "./plans";
import type { Asset, BlueprintPage, Client } from "./types";

/* ── Brand assets: what we need ── */

export type AssetNeed = {
  id: string;
  label: string;
  text: string;
  have: number;
  need: number;
};

/**
 * What an asset label is called on screen. Clients outside the limo world
 * (their own questions replace the standard ones) see general names; the
 * saved label stays the same.
 */
export const assetLabelName = (label: Asset["label"], general = false) =>
  general && label === "Fleet photo"
    ? "Photo of your work"
    : general && label === "Team photo"
      ? "Photo of you or your team"
      : label;

export function assetNeeds(
  assets: Pick<Asset, "label">[],
  /** A client outside the limo world: no fleet or chauffeur wording. */
  general = false,
): AssetNeed[] {
  const count = (label: Asset["label"]) =>
    assets.filter((asset) => asset.label === label).length;
  return [
    {
      id: "logo",
      label: "Your logo",
      text: "SVG, PNG or PDF. The original file, if you have it.",
      have: count("Logo"),
      need: 1,
    },
    {
      id: "fleet",
      label: general ? "Photos of your work" : "Fleet photos",
      text: general
        ? "At least six: your place, your products or your work."
        : "At least six: each vehicle, outside and in.",
      have: count("Fleet photo"),
      need: 6,
    },
    {
      id: "team",
      label: general ? "You or your team" : "You or a chauffeur",
      text: general
        ? "One photo of a real person. It builds trust."
        : "One photo of a real person by the car. It builds trust.",
      have: count("Team photo"),
      need: 1,
    },
    {
      id: "brand",
      label: "Brand guide or colors",
      text: "Optional. Anything that shows how your brand should look.",
      have: count("Brand guide"),
      need: 0,
    },
  ];
}

export const assetsComplete = (assets: Pick<Asset, "label">[]) =>
  assetNeeds(assets).every((item) => item.have >= item.need);

/* ── The blueprint ── */

export function blueprintCounts(pages: BlueprintPage[]) {
  const sections = pages.flatMap((page) => page.sections);
  return {
    total: sections.length,
    review: sections.filter((s) => s.status === "REVIEW").length,
    approved: sections.filter((s) => s.status === "APPROVED").length,
    draft: sections.filter((s) => s.status === "DRAFT").length,
    changes: sections.filter((s) => s.status === "CHANGES").length,
  };
}

export type PageStatus = "APPROVED" | "CHANGES" | "REVIEW" | "DRAFT";

/**
 * Where the whole blueprint stands. It's sent, approved and changed as
 * one, so its sections move together.
 */
export function blueprintStatus(pages: BlueprintPage[]): PageStatus {
  const all = pages.flatMap((p) => p.sections);
  if (all.length && all.every((s) => s.status === "APPROVED")) return "APPROVED";
  if (all.some((s) => s.status === "CHANGES")) return "CHANGES";
  if (all.some((s) => s.status === "REVIEW")) return "REVIEW";
  return "DRAFT";
}

/**
 * Where a blueprint page stands, from its sections. Clients approve, or ask
 * for changes to, a whole page at a time.
 */
export function pageStatus(page: BlueprintPage): PageStatus {
  const all = page.sections;
  if (all.length && all.every((s) => s.status === "APPROVED")) return "APPROVED";
  if (all.some((s) => s.status === "CHANGES")) return "CHANGES";
  if (all.some((s) => s.status === "REVIEW")) return "REVIEW";
  return "DRAFT";
}

export type LeadsAccess = "INCLUDED" | "TRIAL" | "ACTIVE" | "NONE";

/**
 * Full Platform includes the Leads Tool (until that plan ends); anyone else
 * trials or pays.
 */
export function leadsAccess(client: Client): LeadsAccess {
  if (
    client.website?.plan === "FULL_PLATFORM" &&
    client.website.status !== "CANCELLED"
  )
    return "INCLUDED";
  return client.leads.status;
}

export const isLive = (client: Client) =>
  Boolean(client.website?.facts.launchedAt);

/**
 * Signed up for a website plan and waiting for us to approve them: there's
 * no plan on their account yet, only what they asked for. Until then their
 * dashboard is just the home page.
 */
export const awaitingApproval = (client: Client) =>
  !client.website &&
  !client.approvedAt &&
  client.leads.status === "NONE" &&
  (client.request?.plan === "FULL_PLATFORM" ||
    client.request?.plan === "WEBSITE_ONLY");

/**
 * The build pages (Questionnaire, Brand assets, Blueprint, Design) open
 * once the agreement is signed and billing is set up: the setup fee paid,
 * or the card added when it's waived.
 */
export const buildUnlocked = (client: Client) => {
  const f = client.website?.facts;
  if (!f) return false;
  return Boolean(f.launchedAt || (f.agreementSignedAt && f.setupFeePaidAt));
};

/**
 * Whether the Leads Tool is offered to them at all: included with the Full
 * Platform, theirs already, or their plan on its own. Website Only clients
 * and anyone awaiting approval aren't offered it.
 */
export const leadsOffered = (client: Client) =>
  leadsAccess(client) !== "NONE" ||
  (!client.website && !awaitingApproval(client));

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
  /**
   * The link on Project status, whatever the step's state: the step's own
   * page ("Fill in the questionnaire", "View your answers"…), or a note
   * when its page isn't open yet.
   */
  link?:
    | { href: string; label: string; external?: boolean }
    | { locked: string };
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
    website.setupFee > 0
      ? {
          id: "setup",
          title: "Pay the setup fee",
          text: `${money(website.setupFee)}, once. Monthly billing starts on the 1st after it.`,
          owner: "you",
          after: ["agreement"],
          doneAt: f.setupFeePaidAt,
          href: "/dashboard/billing",
          cta: "Pay",
        }
      : {
          id: "setup",
          title: "Add your card",
          text: "Your setup fee is waived. Add the card for your monthly plan; billing starts on the 1st after.",
          owner: "you",
          after: ["agreement"],
          doneAt: f.setupFeePaidAt,
          href: "/dashboard/billing",
          cta: "Add card",
        },
    {
      id: "questionnaire",
      title: "Fill in the questionnaire",
      text: client.customQuestions?.mode === "replace"
        ? "About 30 minutes on your business, your customers and your brand."
        : "About 30 minutes: your story, your rides, your fleet and your brand.",
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
        blueprintStatus(client.blueprint) === "REVIEW"
          ? `Every page of your site, ${client.blueprint.length} in all, ready for you to read and approve.`
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
      ready: blueprintStatus(client.blueprint) === "REVIEW",
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

  const states = defs.map(({ after, ready, waitText, ...step }) => {
    if (step.doneAt) return { ...step, state: "done" as const };
    if (!after.every((id) => done.has(id))) {
      return { ...step, state: "upcoming" as const };
    }
    if (step.owner === "you" && ready !== false) {
      return { ...step, state: "you" as const };
    }
    return { ...step, text: waitText ?? step.text, state: "us" as const };
  });
  return states.map((step) => ({ ...step, link: stepLink(client, step) }));
}

// The build pages that open once they've signed and set up billing.
const BUILD_PAGES = [
  "/dashboard/website/questionnaire",
  "/dashboard/website/assets",
  "/dashboard/website/blueprint",
  "/dashboard/website/design",
];

// What a finished step's link says.
const VIEW: Record<string, string> = {
  agreement: "View agreement",
  setup: "View billing",
  questionnaire: "View your answers",
  assets: "View your assets",
  blueprint: "View blueprint",
  design: "View your design",
  booking: "View your answers",
};

/** The link a step shows on Project status, for any state. */
function stepLink(client: Client, step: Step): Step["link"] {
  const website = client.website;
  const page = step.href?.split("?")[0];
  // Preview and launch: the sites themselves, once they exist.
  if (step.id === "build" || step.id === "preview") {
    return website?.previewUrl
      ? { href: website.previewUrl, label: "Open preview", external: true }
      : undefined;
  }
  if (step.id === "launch") {
    return website?.liveUrl && step.state === "done"
      ? { href: website.liveUrl, label: "Visit your site", external: true }
      : undefined;
  }
  if (!step.href || !page) return undefined;
  if (BUILD_PAGES.includes(page) && !buildUnlocked(client)) {
    return { locked: "Opens after billing" };
  }
  if (step.state === "you")
    return { href: step.href, label: step.cta ?? "Open" };
  if (step.state === "done")
    return VIEW[step.id] ? { href: step.href, label: VIEW[step.id] } : undefined;
  // Waiting on us: somewhere to look while we work, where there's
  // something to see.
  if (step.id === "blueprint" && client.blueprint.length > 0)
    return { href: step.href, label: "View blueprint" };
  if (step.id === "questionnaire" || step.id === "assets")
    return { href: step.href, label: "Open" };
  // The design page, always: the options show up there when they're ready.
  if (step.id === "design")
    return { href: step.href, label: "View design page" };
  if (step.state === "upcoming" && step.id === "booking")
    return { href: step.href, label: "Open the questionnaire" };
  return undefined;
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

  if (
    client.leads.status === "TRIAL" &&
    client.leads.trialEndsAt &&
    !client.leads.subscribed &&
    client.website?.plan !== "FULL_PLATFORM"
  ) {
    const days = trialDaysLeft(client, now);
    list.push({
      id: "leads-trial",
      title: `Your Leads Tool trial ends in ${days} days`,
      text: `Add a card anytime to keep it: the first charge covers the rest of that month, then ${money(LEADS.monthly)} on the 1st.`,
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
  client.website
    ? PLANS[client.website.plan].name
    : awaitingApproval(client) &&
        (client.request?.plan === "FULL_PLATFORM" ||
          client.request?.plan === "WEBSITE_ONLY")
      ? `${PLANS[client.request.plan].name} · Pending`
      : LEADS.name;

/** The Monday that starts this week in Arizona, e.g. "2026-10-05". */
export function weekOf(now: string) {
  const local = new Date(new Date(now).getTime() - 7 * 3_600_000);
  const day = (local.getUTCDay() + 6) % 7;
  const monday = new Date(local.getTime() - day * 86_400_000);
  return monday.toISOString().slice(0, 10);
}
