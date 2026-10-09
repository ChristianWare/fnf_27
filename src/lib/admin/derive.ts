// What the admin works out from the clients: each client's plan, stage and
// revenue, the queue of things that need you, the next billing run, and
// revenue by month. Pure functions, safe in server and client components.

import type { IconName } from "@/components/Dashboard/icons";
import { firstOfMonth, nextFirst, prorate } from "@/lib/dashboard/billing";
import { fmtShort, money } from "@/lib/dashboard/format";
import { blueprintCounts, projectSteps } from "@/lib/dashboard/helpers";
import { LEADS, PLANS } from "@/lib/dashboard/plans";
import type { Client, Invoice } from "@/lib/dashboard/types";

/* ── Each client ── */

export type ClientKind = "NEW" | "FULL_PLATFORM" | "WEBSITE_ONLY" | "LEADS";

export function clientKind(client: Client): ClientKind {
  if (client.website) return client.website.plan;
  if (client.leads.status !== "NONE") return "LEADS";
  return "NEW";
}

export const kindLabel: Record<ClientKind, string> = {
  NEW: "New sign-up",
  FULL_PLATFORM: PLANS.FULL_PLATFORM.name,
  WEBSITE_ONLY: PLANS.WEBSITE_ONLY.name,
  LEADS: LEADS.name,
};

export type StageKey = "NEW" | "BUILD" | "LIVE" | "TRIAL" | "LEADS";

export type Stage = {
  key: StageKey;
  label: string;
  /** Build steps done, and how many there are. */
  done?: number;
  total?: number;
};

export function clientStage(client: Client): Stage {
  if (client.website) {
    const steps = projectSteps(client);
    const done = steps.filter((s) => s.state === "done").length;
    return client.website.facts.launchedAt
      ? { key: "LIVE", label: "Live", done, total: steps.length }
      : { key: "BUILD", label: "In build", done, total: steps.length };
  }
  if (client.leads.status === "TRIAL") return { key: "TRIAL", label: "Trial" };
  if (client.leads.status === "ACTIVE")
    return { key: "LEADS", label: "Paying" };
  return { key: "NEW", label: "Waiting for approval" };
}

/** What the client pays each month right now. */
export function clientMrr(client: Client) {
  let mrr = 0;
  const w = client.website;
  if (w && w.facts.setupFeePaidAt && w.status !== "CANCELLING") {
    mrr += w.monthly;
  }
  if (client.leads.status === "ACTIVE" && w?.plan !== "FULL_PLATFORM") {
    mrr += LEADS.monthly;
  }
  return mrr;
}

/** The latest thing that happened with this client. */
export function lastActivity(client: Client) {
  const dates = [
    client.signedUpAt,
    ...client.activity.map((a) => a.at),
    ...client.threads.flatMap((t) => t.messages.map((m) => m.at)),
    ...client.changes.map((c) => c.updatedAt ?? c.submittedAt),
  ];
  return dates.sort().at(-1) ?? client.signedUpAt;
}

const firstName = (client: Client) => client.contact.name.split(" ")[0];

/** A client's activity line, retold for the admin: "You sent your…" → "They sent their…". */
export const inThirdPerson = (text: string) =>
  text
    .replace(/^You /, "They ")
    .replace(/\bYour\b/g, "Their")
    .replace(/\byour\b/g, "their");

/* ── The queue: what needs you ── */

export type QueueTone = "red" | "yellow" | "mint" | "purple" | "gray";

export type QueueItem = {
  id: string;
  clientId: string;
  business: string;
  /** 1 today, 2 this week, 3 when you can. */
  priority: 1 | 2 | 3;
  tone: QueueTone;
  icon: IconName;
  title: string;
  detail: string;
  at: string;
  href: string;
  cta: string;
};

// The build steps that are ours to do, as admin tasks.
const ourSteps: Record<
  string,
  { title: string; tab: string; icon: IconName; cta: string }
> = {
  blueprint: {
    title: "Write the blueprint",
    tab: "blueprint",
    icon: "blueprint",
    cta: "Write",
  },
  design: {
    title: "Design three options",
    tab: "files",
    icon: "palette",
    cta: "Upload",
  },
  rates: {
    title: "Set up vehicles and rates",
    tab: "overview",
    icon: "booking",
    cta: "Open",
  },
  build: {
    title: "Build the site",
    tab: "overview",
    icon: "status",
    cta: "Open",
  },
  launch: {
    title: "Launch the site",
    tab: "overview",
    icon: "globe",
    cta: "Launch",
  },
};

export function adminQueue(clients: Client[], now: string): QueueItem[] {
  const items: QueueItem[] = [];
  const nowMs = new Date(now).getTime();

  for (const c of clients) {
    const base = { clientId: c.id, business: c.business };
    const page = `/admin/clients/${c.id}`;

    if (clientKind(c) === "NEW" && !c.approvedAt) {
      const plan = c.request?.plan;
      items.push({
        ...base,
        id: `${c.id}-approve`,
        priority: 1,
        tone: "yellow",
        icon: "user",
        title: `Approve ${c.business}`,
        detail: `New sign-up${plan && plan !== "LEADS" ? ` for the ${PLANS[plan].name}` : ""} · ${c.city}`,
        at: c.signedUpAt,
        href: page,
        cta: "Review",
      });
    }

    if (c.website?.status === "PAST_DUE") {
      const due = c.invoices.find((i) => i.status === "DUE");
      items.push({
        ...base,
        id: `${c.id}-pastdue`,
        priority: 1,
        tone: "red",
        icon: "card",
        title: `Payment failed: ${c.business}`,
        detail: `${due ? `${money(due.amount)} on ${fmtShort(due.date)}` : "Monthly charge"}${c.card?.expired ? " · card expired" : ""}`,
        at: due?.date ?? now,
        href: `${page}?tab=billing`,
        cta: "Fix",
      });
    }

    for (const thread of c.threads) {
      const last = thread.messages.at(-1);
      if (thread.status === "OPEN" && last?.from === "you") {
        items.push({
          ...base,
          id: `${c.id}-${thread.id}`,
          priority: 1,
          tone: "mint",
          icon: "message",
          title: `Reply to ${firstName(c)}`,
          detail: `${thread.subject} · ${c.business}`,
          at: last.at,
          href: `/admin/messages?thread=${c.id}.${thread.id}`,
          cta: "Reply",
        });
      }
    }

    for (const change of c.changes) {
      if (change.status === "PENDING" || change.status === "IN_PROGRESS") {
        items.push({
          ...base,
          id: `${c.id}-${change.id}`,
          priority: 2,
          tone: change.status === "PENDING" ? "yellow" : "mint",
          icon: "pen",
          title: `#${change.number} ${change.title}`,
          detail: `${change.status === "PENDING" ? "New request" : "In progress"} · ${c.business}`,
          at: change.updatedAt ?? change.submittedAt,
          href: `/admin/requests?open=${c.id}.${change.id}`,
          cta: change.status === "PENDING" ? "Start" : "Open",
        });
      }
    }

    for (const step of projectSteps(c)) {
      const task = ourSteps[step.id];
      if (step.state === "us" && task) {
        items.push({
          ...base,
          id: `${c.id}-${step.id}`,
          priority: 2,
          tone: "purple",
          icon: task.icon,
          title: `${task.title} for ${c.business}`,
          detail: step.text,
          at: c.website?.facts.questionnaireSubmittedAt ?? c.signedUpAt,
          href: `${page}?tab=${task.tab}`,
          cta: task.cta,
        });
      }
    }

    // Blueprint sections a client asked to change.
    const revise = c.blueprint
      .flatMap((p) => p.sections)
      .filter((s) => s.status === "DRAFT" && s.comments.at(-1)?.from === "you");
    if (revise.length) {
      items.push({
        ...base,
        id: `${c.id}-revise`,
        priority: 2,
        tone: "purple",
        icon: "blueprint",
        title: `Revise ${revise.length} blueprint section${revise.length === 1 ? "" : "s"}`,
        detail: `${firstName(c)} asked for changes · ${c.business}`,
        at: revise[0].comments.at(-1)!.at,
        href: `${page}?tab=blueprint`,
        cta: "Revise",
      });
    }

    if (c.leads.status === "TRIAL" && c.leads.trialEndsAt && !c.card) {
      const days = Math.ceil(
        (new Date(c.leads.trialEndsAt).getTime() - nowMs) / 86_400_000,
      );
      if (days <= 5) {
        items.push({
          ...base,
          id: `${c.id}-trial`,
          priority: 3,
          tone: "gray",
          icon: "target",
          title: `Trial ends in ${days} day${days === 1 ? "" : "s"}: ${c.business}`,
          detail: "No card yet. A short note usually does it.",
          at: c.leads.trialEndsAt,
          href: `${page}?tab=billing`,
          cta: "Nudge",
        });
      }
    }
  }

  return items.sort(
    (a, b) => a.priority - b.priority || b.at.localeCompare(a.at),
  );
}

/** Clients who have steps waiting on them, and what. */
export function waitingOnClients(clients: Client[]) {
  return clients
    .map((c) => {
      const steps = projectSteps(c)
        .filter((s) => s.state === "you")
        .map((s) => s.title);
      const docs = c.documents
        .filter((d) => d.status === "AWAITING")
        .map((d) => `Sign: ${d.title}`);
      return { client: c, waiting: [...steps, ...docs] };
    })
    .filter((row) => row.waiting.length > 0);
}

/* ── Money ── */

export type ForecastLine = {
  clientId: string;
  business: string;
  label: string;
  amount: number;
  /** A retry of a failed payment. */
  retry?: boolean;
};

/** What the next 1st should bring in, client by client. */
export function nextBillingRun(clients: Client[], now: string) {
  const date = nextFirst(now);
  const lines: ForecastLine[] = [];
  for (const c of clients) {
    const w = c.website;
    if (w && w.facts.setupFeePaidAt && w.status !== "CANCELLING") {
      lines.push({
        clientId: c.id,
        business: c.business,
        label: PLANS[w.plan].name,
        amount: w.monthly,
        retry: w.status === "PAST_DUE",
      });
    }
    if (c.leads.status === "ACTIVE" && w?.plan !== "FULL_PLATFORM") {
      lines.push({
        clientId: c.id,
        business: c.business,
        label: LEADS.name,
        amount: LEADS.monthly,
      });
    }
  }
  return {
    date,
    lines,
    total: lines.reduce((sum, line) => sum + line.amount, 0),
  };
}

export type InvoiceRow = Invoice & { clientId: string; business: string };

export function allInvoices(clients: Client[]): InvoiceRow[] {
  return clients
    .flatMap((c) =>
      c.invoices.map((i) => ({ ...i, clientId: c.id, business: c.business })),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}

export type RevenueMonth = {
  month: string;
  recurring: number;
  setup: number;
};

/** Money collected each month, monthly fees and setup fees apart. */
export function revenueByMonth(
  clients: Client[],
  now: string,
  months = 6,
): RevenueMonth[] {
  const rows: RevenueMonth[] = Array.from({ length: months }, (_, i) => ({
    month: firstOfMonth(now, i - months + 1),
    recurring: 0,
    setup: 0,
  }));
  for (const invoice of allInvoices(clients)) {
    if (invoice.status !== "PAID") continue;
    const month = firstOfMonth(invoice.paidAt ?? invoice.date);
    const row = rows.find((r) => r.month === month);
    if (!row) continue;
    if (/setup/i.test(invoice.description)) row.setup += invoice.amount;
    else row.recurring += invoice.amount;
  }
  return rows;
}

export type MixLine = {
  key: "FULL_PLATFORM" | "WEBSITE_ONLY" | "LEADS";
  label: string;
  clients: number;
  mrr: number;
};

/** Monthly revenue by plan. The Full Platform includes the Leads Tool. */
export function planMix(clients: Client[]): MixLine[] {
  const lines: Record<MixLine["key"], MixLine> = {
    FULL_PLATFORM: {
      key: "FULL_PLATFORM",
      label: PLANS.FULL_PLATFORM.name,
      clients: 0,
      mrr: 0,
    },
    WEBSITE_ONLY: {
      key: "WEBSITE_ONLY",
      label: PLANS.WEBSITE_ONLY.name,
      clients: 0,
      mrr: 0,
    },
    LEADS: { key: "LEADS", label: LEADS.name, clients: 0, mrr: 0 },
  };
  for (const c of clients) {
    const w = c.website;
    if (w && w.facts.setupFeePaidAt && w.status !== "CANCELLING") {
      lines[w.plan].clients += 1;
      lines[w.plan].mrr += w.monthly;
    }
    if (c.leads.status === "ACTIVE" && w?.plan !== "FULL_PLATFORM") {
      lines.LEADS.clients += 1;
      lines.LEADS.mrr += LEADS.monthly;
    }
  }
  return Object.values(lines);
}

export type MoneyFlag = {
  id: string;
  clientId: string;
  business: string;
  kind: ClientKind;
  tone: QueueTone;
  icon: IconName;
  title: string;
  detail: string;
  href: string;
  /** Offer the link where they update their card. */
  cardLink?: boolean;
};

/** "08/28" → the last moment that card works, in Arizona. */
function cardRunsOut(exp: string) {
  const [month, year] = exp.split("/").map(Number);
  if (!month || Number.isNaN(year)) return undefined;
  const first = firstOfMonth(new Date(Date.UTC(2000 + year, month - 1, 15)));
  return firstOfMonth(first, 1);
}

/** Money things to look at: failed payments, unpaid setup fees, cards about to run out, trials ending, and plans ending. */
export function billingAttention(clients: Client[], now: string): MoneyFlag[] {
  const flags: MoneyFlag[] = [];
  const order: Record<QueueTone, number> = {
    red: 0,
    yellow: 1,
    purple: 2,
    mint: 3,
    gray: 4,
  };

  for (const c of clients) {
    const w = c.website;
    const base = {
      clientId: c.id,
      business: c.business,
      kind: clientKind(c),
      href: `/admin/clients/${c.id}?tab=billing`,
    };

    if (w?.status === "PAST_DUE") {
      const due = c.invoices.find((i) => i.status === "DUE");
      flags.push({
        ...base,
        id: `${c.id}-failed`,
        tone: "red",
        icon: "card",
        title: "Payment failed",
        detail: `${due ? `${money(due.amount)} due since ${fmtShort(due.date)}` : "The monthly charge"}${c.card?.expired ? ` · ${c.card.brand} ending ${c.card.last4} expired` : " · card declined"}. Stripe keeps retrying.`,
        cardLink: true,
      });
    }

    if (w && !w.facts.setupFeePaidAt) {
      flags.push({
        ...base,
        id: `${c.id}-setup`,
        tone: "yellow",
        icon: "card",
        title: "Setup fee not paid yet",
        detail: `${money(w.setupFee)}. Monthly billing starts the 1st after it's paid.`,
      });
    }

    if (w?.status === "CANCELLING") {
      flags.push({
        ...base,
        id: `${c.id}-cancel`,
        tone: "gray",
        icon: "clock",
        title: "Cancels at the end of the month",
        detail: `No charge on ${w.nextBillingAt ? fmtShort(w.nextBillingAt) : "the 1st"}. ${money(w.monthly)} a month less from then.`,
      });
    }

    if (c.card && !c.card.expired && w?.status !== "PAST_DUE") {
      const runsOut = cardRunsOut(c.card.exp);
      if (runsOut && runsOut <= firstOfMonth(now, 3)) {
        flags.push({
          ...base,
          id: `${c.id}-card`,
          tone: "gray",
          icon: "card",
          title: "Card expires soon",
          detail: `${c.card.brand} ending ${c.card.last4} runs out after ${c.card.exp}. Send the card link before it fails.`,
          cardLink: true,
        });
      }
    }

    if (c.leads.status === "TRIAL" && c.leads.trialEndsAt && !c.card) {
      const days = Math.ceil(
        (new Date(c.leads.trialEndsAt).getTime() - new Date(now).getTime()) /
          86_400_000,
      );
      if (days <= 7) {
        flags.push({
          ...base,
          id: `${c.id}-trial`,
          tone: "purple",
          icon: "target",
          title: `Leads trial ends ${fmtShort(c.leads.trialEndsAt)}`,
          detail: `No card yet. If they keep it: ${money(prorate(LEADS.monthly, c.leads.trialEndsAt))} for the rest of that month, then ${money(LEADS.monthly)} on the 1st.`,
        });
      }
    }
  }

  return flags.sort((a, b) => order[a.tone] - order[b.tone]);
}

/** The headline numbers. */
export function studioStats(clients: Client[]) {
  const stages = clients.map(clientStage);
  const count = (key: StageKey) => stages.filter((s) => s.key === key).length;
  return {
    mrr: clients.reduce((sum, c) => sum + clientMrr(c), 0),
    clients: clients.length,
    newSignups: count("NEW"),
    building: count("BUILD"),
    live: count("LIVE"),
    trials: count("TRIAL"),
    leads: count("LEADS"),
    pastDue: clients.filter((c) => c.website?.status === "PAST_DUE").length,
    openRequests: clients.reduce(
      (n, c) =>
        n +
        c.changes.filter(
          (r) => r.status === "PENDING" || r.status === "IN_PROGRESS",
        ).length,
      0,
    ),
    unread: clients.reduce(
      (n, c) =>
        n +
        c.threads.filter(
          (t) => t.status === "OPEN" && t.messages.at(-1)?.from === "you",
        ).length,
      0,
    ),
    reviewSections: clients.reduce(
      (n, c) => n + blueprintCounts(c.blueprint).review,
      0,
    ),
  };
}
