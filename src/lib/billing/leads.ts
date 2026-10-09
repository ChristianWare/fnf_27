// The Leads Tool in Stripe. Server only.
//
// How it runs: a 30-day trial with no card. Adding a card (Stripe Checkout
// in setup mode) starts a subscription that stays free until the trial
// ends; then the first charge covers the rest of that month (prorated) and
// $125 follows on the 1st of every month, midnight Arizona time. A card
// added after the trial ends starts it again straight away, the same way.
// Cancelling stops it at the end of the month (or the trial). The Full
// Platform includes the Leads Tool, so none of this applies there.

import type Stripe from "stripe";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { url } from "@/lib/server/config";
import { alertAdmins, emailClient } from "@/lib/server/notify";
import { addActivity } from "@/lib/data/write";
import { nextFirst, prorate } from "@/lib/dashboard/billing";
import { fmtDate, money } from "@/lib/dashboard/format";
import { LEADS } from "@/lib/dashboard/plans";
import { recordPaidInvoice } from "./invoices";
import {
  BillingError,
  ensureCustomer,
  periodEnd,
  productFor,
  stripe,
} from "./stripe";

const { clients, websites } = schema;
const DAY = 86_400_000;

async function clientRow(clientId: string) {
  const [row] = await db
    .select({ client: clients, plan: websites.plan, status: websites.status })
    .from(clients)
    .leftJoin(websites, eq(websites.clientId, clients.id))
    .where(eq(clients.id, clientId))
    .limit(1);
  return row;
}

/** The Full Platform includes the Leads Tool, while the plan hasn't ended. */
const included = (row: { plan: string | null; status: string | null }) =>
  row.plan === "FULL_PLATFORM" && row.status !== "CANCELLED";

/** A Stripe page to add the card that keeps the Leads Tool going. */
export async function leadsCheckoutUrl(clientId: string, origin?: string) {
  const row = await clientRow(clientId);
  if (!row) throw new BillingError("We couldn't find your business.");
  if (included(row))
    throw new BillingError("The Leads Tool is included with your plan.");
  const back = (path: string) => (origin ? `${origin}${path}` : url(path));
  const customer = await ensureCustomer(clientId);
  const session = await stripe().checkout.sessions.create({
    mode: "setup",
    customer,
    currency: "usd",
    allowed_payment_method_types: ["card"],
    metadata: { clientId, purpose: "leads" },
    setup_intent_data: { metadata: { clientId, purpose: "leads" } },
    success_url: back(
      "/dashboard/billing/done?session_id={CHECKOUT_SESSION_ID}",
    ),
    cancel_url: back("/dashboard/billing#leads"),
  });
  if (!session.url) throw new BillingError("Stripe didn't open the card page.");
  return session.url;
}

const unix = (date: Date | string) =>
  Math.floor(new Date(date).getTime() / 1000);

/** Stripe is already working on a request with the same key. */
const clashed = (error: unknown) => {
  const e = error as { type?: string; statusCode?: number } | undefined;
  return e?.type === "StripeIdempotencyError" || e?.statusCode === 409;
};

/**
 * Starts the subscription once there's a card: free until the trial ends
 * (if it hasn't), then prorated to the 1st, then monthly. Runs once.
 * `checkout` is the Stripe Checkout session the card came from, when it
 * came from one.
 */
export async function startLeadsSubscription(
  clientId: string,
  paymentMethod: string,
  checkout?: string,
) {
  const row = await clientRow(clientId);
  if (!row || included(row)) return;
  const client = row.client;

  // Already going: just use the new card.
  if (client.leadsSubscriptionId) {
    const sub = await stripe()
      .subscriptions.retrieve(client.leadsSubscriptionId)
      .catch(() => undefined);
    if (
      sub &&
      sub.status !== "canceled" &&
      sub.status !== "incomplete_expired"
    ) {
      await stripe().subscriptions.update(sub.id, {
        default_payment_method: paymentMethod,
      });
      return;
    }
  }

  const now = new Date();
  const trialEnd =
    client.leadsStatus === "TRIAL" &&
    client.leadsTrialEndsAt &&
    client.leadsTrialEndsAt.getTime() > now.getTime() + 60_000
      ? client.leadsTrialEndsAt
      : undefined;
  const anchor = new Date(nextFirst(trialEnd ?? now));
  const customer = await ensureCustomer(clientId);
  let sub: Stripe.Subscription;
  try {
    sub = await stripe().subscriptions.create(
      {
        customer,
        items: [
          {
            price_data: {
              currency: "usd",
              product: await productFor("LEADS"),
              unit_amount: LEADS.monthly * 100,
              recurring: { interval: "month" },
            },
          },
        ],
        ...(trialEnd ? { trial_end: unix(trialEnd) } : {}),
        billing_cycle_anchor: unix(anchor),
        proration_behavior: "create_prorations",
        default_payment_method: paymentMethod,
        // Starting straight away charges now: a declined card says so here.
        ...(trialEnd
          ? {}
          : { payment_behavior: "error_if_incomplete" as const }),
        description: `${LEADS.name} for ${client.business}`,
        metadata: { clientId, fnf_product: "LEADS" },
      },
      {
        // The webhook and the return page both get here with the same
        // Checkout session: that makes them one subscription. Keeping it
        // with the card on file is keyed by the card and the time, so a
        // double click is one too, and another go later is a new request.
        idempotencyKey: checkout
          ? `fnf-leads-sub-${clientId}-${checkout}`
          : `fnf-leads-sub-${clientId}-${unix(anchor)}-${trialEnd ? unix(trialEnd) : Math.floor(now.getTime() / 600_000)}-${paymentMethod}`,
      },
    );
  } catch (error) {
    if (!checkout || !clashed(error)) throw error;
    // The other of the two is starting it right now.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const again = await clientRow(clientId);
    if (again?.client.leadsSubscriptionId) return;
    throw new BillingError(
      "We're still setting up your Leads Tool. Check Billing again in a minute.",
    );
  }

  const [updated] = await db
    .update(clients)
    .set({
      leadsSubscriptionId: sub.id,
      leadsStatus: trialEnd ? "TRIAL" : "ACTIVE",
      leadsStartedAt: client.leadsStartedAt ?? now,
      leadsNextBillingAt: trialEnd ?? periodEnd(sub) ?? anchor,
      leadsEndedAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(clients.id, clientId),
        client.leadsSubscriptionId
          ? eq(clients.leadsSubscriptionId, client.leadsSubscriptionId)
          : isNull(clients.leadsSubscriptionId),
      ),
    )
    .returning();
  if (!updated) return;

  if (trialEnd) {
    await addActivity(
      clientId,
      "leads",
      `Card added: your Leads Tool carries on after ${fmtDate(trialEnd)}`,
      "/dashboard/billing#leads",
    );
  } else {
    await addActivity(
      clientId,
      "leads",
      "Your Leads Tool is back on",
      "/dashboard/leads",
    );
    // The prorated charge for the rest of this month.
    const latest = sub.latest_invoice;
    const invoiceId = typeof latest === "string" ? latest : latest?.id;
    if (invoiceId) await recordPaidInvoice(invoiceId).catch(() => undefined);
  }
  await alertAdmins(
    "payment",
    trialEnd
      ? `${client.business} added a card for the Leads Tool`
      : `${client.business} switched the Leads Tool back on`,
    {
      eyebrow: "Leads Tool",
      heading: trialEnd
        ? `${client.business} is keeping the Leads Tool`
        : `${client.business} is back on the Leads Tool`,
      paragraphs: [
        trialEnd
          ? `Their trial ends ${fmtDate(trialEnd)}: then ${money(prorate(LEADS.monthly, trialEnd.toISOString()))} for the rest of that month, and ${money(LEADS.monthly)} on the 1st.`
          : `Charged for the rest of this month, then ${money(LEADS.monthly)} on the 1st.`,
      ],
      button: {
        label: "Open their billing",
        href: url(`/admin/clients/${clientId}?tab=billing`),
      },
    },
  );
}

/**
 * Cancels at the end of the month (or of the trial, if they're still on
 * it), or undoes that.
 */
export async function setLeadsCancel(clientId: string, cancel: boolean) {
  const row = await clientRow(clientId);
  if (!row) throw new BillingError("We couldn't find your business.");
  const client = row.client;
  if (!client.leadsSubscriptionId)
    throw new BillingError(
      client.leadsStatus === "TRIAL"
        ? "Your trial just ends on its own if you don't add a card. Nothing to cancel."
        : "There's no Leads Tool plan to change.",
    );
  const sub = await stripe().subscriptions.update(client.leadsSubscriptionId, {
    cancel_at_period_end: cancel,
  });
  const trialing = sub.status === "trialing";
  const endsAt =
    trialing && sub.trial_end ? new Date(sub.trial_end * 1000) : periodEnd(sub);
  const status = cancel
    ? "CANCELLING"
    : trialing
      ? "TRIAL"
      : sub.status === "past_due" || sub.status === "unpaid"
        ? "PAST_DUE"
        : "ACTIVE";
  await db
    .update(clients)
    .set({
      leadsStatus: status,
      leadsNextBillingAt: endsAt ?? null,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, clientId));
  await addActivity(
    clientId,
    "leads",
    cancel
      ? `You cancelled the Leads Tool. It runs until ${endsAt ? fmtDate(endsAt) : "the end of the month"}`
      : "Your Leads Tool stays on",
    "/dashboard/billing#leads",
  );
  return { status, endsAt: endsAt?.toISOString() };
}

/**
 * They've moved to the Full Platform, which includes the Leads Tool: the
 * separate plan stops at the end of what's already paid for (or at the end
 * of the trial), and nothing more is charged for it. Returns when it stops.
 */
export async function stopLeadsPlanForFullPlatform(clientId: string) {
  const row = await clientRow(clientId);
  const subId = row?.client.leadsSubscriptionId;
  if (!subId) return undefined;
  const current = await stripe()
    .subscriptions.retrieve(subId)
    .catch(() => undefined);
  if (
    !current ||
    current.status === "canceled" ||
    current.status === "incomplete_expired"
  ) {
    await db
      .update(clients)
      .set({
        leadsStatus: "NONE",
        leadsSubscriptionId: null,
        leadsNextBillingAt: null,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, clientId));
    return undefined;
  }
  const sub = current.cancel_at_period_end
    ? current
    : await stripe().subscriptions.update(subId, {
        cancel_at_period_end: true,
      });
  const endsAt =
    sub.status === "trialing" && sub.trial_end
      ? new Date(sub.trial_end * 1000)
      : periodEnd(sub);
  await db
    .update(clients)
    .set({
      leadsStatus: "CANCELLING",
      leadsNextBillingAt: endsAt ?? null,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, clientId));
  await addActivity(
    clientId,
    "leads",
    `Your Leads Tool is included with the Full Platform now. The separate ${money(LEADS.monthly)} plan stops${endsAt ? ` on ${fmtDate(endsAt)}` : ""}, and nothing more is charged for it`,
    "/dashboard/billing#leads",
  );
  return endsAt ?? new Date();
}

/** Tries the Leads Tool's unpaid bills again with the card on file. */
export async function retryLeadsPayment(clientId: string) {
  const row = await clientRow(clientId);
  const subId = row?.client.leadsSubscriptionId;
  if (!subId) return { paid: 0 };
  const open = await stripe().invoices.list({
    subscription: subId,
    status: "open",
    limit: 10,
  });
  let paid = 0;
  for (const inv of [...open.data].reverse()) {
    const result = await stripe().invoices.pay(inv.id!);
    if (result.status === "paid") {
      paid++;
      await recordPaidInvoice(result.id!);
    }
  }
  return { paid };
}

/** Stripe says the Leads subscription changed: copy what the dashboard shows. */
export async function syncLeadsSubscription(sub: Stripe.Subscription) {
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.leadsSubscriptionId, sub.id))
    .limit(1);
  if (!client) return false;
  if (sub.status === "canceled" || sub.status === "incomplete_expired") {
    // Moved to the Full Platform: the tool carries on, included.
    const row = await clientRow(client.id);
    const stillIncluded = Boolean(row && included(row));
    await db
      .update(clients)
      .set({
        leadsStatus: stillIncluded ? "NONE" : "ENDED",
        leadsEndedAt: stillIncluded ? null : new Date(),
        leadsSubscriptionId: null,
        leadsNextBillingAt: null,
        updatedAt: new Date(),
      })
      .where(eq(clients.id, client.id));
    if (!stillIncluded && client.leadsStatus !== "ENDED") {
      await addActivity(
        client.id,
        "leads",
        "Your Leads Tool ended. Your saved leads are kept for 90 days.",
        "/dashboard/leads",
      );
      await alertAdmins("failed", `${client.business}'s Leads Tool ended`, {
        eyebrow: "Leads Tool",
        heading: `${client.business}'s Leads Tool has ended`,
        paragraphs: [
          "Their subscription is cancelled in Stripe. Nothing more will be charged.",
        ],
        button: {
          label: "Open their billing",
          href: url(`/admin/clients/${client.id}?tab=billing`),
        },
      });
    }
    return true;
  }
  const trialing = sub.status === "trialing";
  const leadsStatus =
    sub.status === "past_due" || sub.status === "unpaid"
      ? "PAST_DUE"
      : sub.cancel_at_period_end || sub.cancel_at
        ? "CANCELLING"
        : trialing
          ? "TRIAL"
          : "ACTIVE";
  const next =
    trialing && sub.trial_end ? new Date(sub.trial_end * 1000) : periodEnd(sub);
  await db
    .update(clients)
    .set({
      leadsStatus,
      ...(next ? { leadsNextBillingAt: next } : {}),
      updatedAt: new Date(),
    })
    .where(eq(clients.id, client.id));
  return true;
}

/* ── Trials, every morning ── */

const azDay = (date: Date) =>
  new Date(date.getTime() - 7 * 3_600_000).toISOString().slice(0, 10);

/**
 * Trials that ended without a card: the tool pauses (saved leads are kept
 * 90 days). Returns how many ended.
 */
export async function endLapsedTrials(now = new Date()) {
  const ended = await db
    .update(clients)
    .set({ leadsStatus: "ENDED", leadsEndedAt: now, updatedAt: now })
    .where(
      and(
        eq(clients.leadsStatus, "TRIAL"),
        isNull(clients.leadsSubscriptionId),
        sql`${clients.leadsTrialEndsAt} <= ${now}`,
      ),
    )
    .returning();
  for (const client of ended) {
    // Full Platform clients keep it: it's included.
    const [site] = await db
      .select({ plan: websites.plan })
      .from(websites)
      .where(eq(websites.clientId, client.id))
      .limit(1);
    if (site?.plan === "FULL_PLATFORM") continue;
    await addActivity(
      client.id,
      "leads",
      "Your Leads Tool trial ended. Your saved leads are kept for 90 days.",
      "/dashboard/leads",
    );
    await emailClient(client.id, "Your Leads Tool trial has ended", {
      eyebrow: LEADS.name,
      heading: "Your free trial has ended",
      paragraphs: [
        "Your Leads Tool is paused. Your saved leads, notes and scripts are kept for 90 days, so you can pick up right where you left off.",
        `Add a card to switch it back on: the first charge covers just the rest of the month you do it in, then ${money(LEADS.monthly)} on the 1st.`,
      ],
      button: { label: "Add a card", href: url("/dashboard/billing/leads") },
    });
  }
  return ended.length;
}

/** The days before a trial ends that get a reminder: 3 days out, and the day. */
export function trialReminder(trialEndsAt: Date, now: Date) {
  const days = Math.round(
    (new Date(azDay(trialEndsAt)).getTime() - new Date(azDay(now)).getTime()) /
      DAY,
  );
  return days === 3 ? "THREE_DAYS" : days === 0 ? "TODAY" : undefined;
}
