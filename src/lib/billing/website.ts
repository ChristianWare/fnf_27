// The website plans in Stripe: the setup fee, the monthly subscription on
// the 1st, card updates, rate changes and cancelling. Server only.
//
// How it runs: the client pays the setup fee through Stripe Checkout,
// which saves their card. We then start a subscription whose first bill is
// the next 1st (midnight Arizona time) with nothing charged before it, so
// every bill after lands on the 1st. Rate changes apply from the next bill,
// never prorated.

import type Stripe from "stripe";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { url } from "@/lib/server/config";
import { alertAdmins } from "@/lib/server/notify";
import { addActivity, setFact } from "@/lib/data/write";
import { nextFirst } from "@/lib/dashboard/billing";
import { money } from "@/lib/dashboard/format";
import { PLANS } from "@/lib/dashboard/plans";
import { recordPaidInvoice } from "./invoices";
import {
  retryLeadsPayment,
  startLeadsSubscription,
  syncLeadsSubscription,
} from "./leads";
import {
  BillingError,
  cacheCard,
  ensureCustomer,
  errorText,
  periodEnd,
  productFor,
  stripe,
} from "./stripe";

const { websites, clients } = schema;

async function siteOf(clientId: string) {
  const [row] = await db
    .select({ site: websites, client: clients })
    .from(websites)
    .innerJoin(clients, eq(clients.id, websites.clientId))
    .where(eq(websites.clientId, clientId))
    .limit(1);
  return row;
}

/* ── The setup fee ── */

/**
 * A Stripe Checkout page for the setup fee. `origin` is the site they're
 * on, so they come back to the same place (a preview, say).
 */
export async function setupCheckoutUrl(clientId: string, origin?: string) {
  const back = (path: string) => (origin ? `${origin}${path}` : url(path));
  const row = await siteOf(clientId);
  if (!row) throw new BillingError("There's no website plan to pay for yet.");
  if (row.site.facts.setupFeePaidAt)
    throw new BillingError("Your setup fee is already paid.");
  if (!row.site.facts.agreementSignedAt)
    throw new BillingError(
      "Sign your agreement first, then pay the setup fee.",
    );

  const plan = PLANS[row.site.plan].name;
  const customer = await ensureCustomer(clientId);
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          product: await productFor("SETUP"),
          unit_amount: row.site.setupFeeCents,
        },
      },
    ],
    allowed_payment_method_types: ["card"],
    payment_intent_data: {
      setup_future_usage: "off_session",
      description: `${plan} setup for ${row.client.business}`,
      metadata: { clientId, purpose: "setup" },
    },
    invoice_creation: {
      enabled: true,
      invoice_data: {
        description: `${plan} setup`,
        metadata: { clientId, purpose: "setup" },
      },
    },
    metadata: { clientId, purpose: "setup" },
    success_url: back(
      "/dashboard/billing/done?session_id={CHECKOUT_SESSION_ID}",
    ),
    cancel_url: back("/dashboard/billing"),
  });
  if (!session.url)
    throw new BillingError("Stripe didn't open a checkout page.");
  return session.url;
}

/** Starts the monthly plan: first bill on the next 1st. Runs once. */
export async function startWebsiteSubscription(
  clientId: string,
  paymentMethod?: string,
  /** Makes a restart a new request to Stripe, not a repeat of the first. */
  attempt = "",
) {
  const row = await siteOf(clientId);
  if (!row || row.site.stripeSubscriptionId) return;
  const customer = await ensureCustomer(clientId);
  const anchor = Math.floor(new Date(nextFirst(new Date())).getTime() / 1000);
  const sub = await stripe().subscriptions.create(
    {
      customer,
      items: [
        {
          price_data: {
            currency: "usd",
            product: await productFor(row.site.plan),
            unit_amount: row.site.monthlyCents,
            recurring: { interval: "month" },
          },
        },
      ],
      billing_cycle_anchor: anchor,
      proration_behavior: "none",
      ...(paymentMethod ? { default_payment_method: paymentMethod } : {}),
      description: `${PLANS[row.site.plan].name} for ${row.client.business}`,
      metadata: { clientId, fnf_product: "WEBSITE" },
    },
    { idempotencyKey: `fnf-website-sub-${clientId}-${anchor}${attempt}` },
  );
  await db
    .update(websites)
    .set({
      stripeSubscriptionId: sub.id,
      nextBillingAt: periodEnd(sub) ?? new Date(anchor * 1000),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(websites.clientId, clientId),
        isNull(websites.stripeSubscriptionId),
      ),
    );
}

/**
 * The setup fee went through (from the webhook, or the page they land on
 * after paying, whichever comes first). Safe to run twice.
 */
export async function completeSetupCheckout(sessionId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent.payment_method", "invoice"],
  });
  const clientId = session.metadata?.clientId;
  if (session.metadata?.purpose !== "setup" || !clientId) return;
  if (session.payment_status !== "paid") return;

  const intent = session.payment_intent as Stripe.PaymentIntent | null;
  const method = intent?.payment_method as Stripe.PaymentMethod | null;
  if (method && session.customer) {
    await stripe().customers.update(String(session.customer), {
      invoice_settings: { default_payment_method: method.id },
    });
    await cacheCard(clientId, method);
  }

  const first = await setFact(
    clientId,
    "setupFeePaidAt",
    new Date().toISOString(),
  );
  await startWebsiteSubscription(clientId, method?.id);
  if (first) {
    await addActivity(
      clientId,
      "build",
      "You paid the setup fee",
      "/dashboard/billing",
    );
  }
  // The receipt, if Stripe's invoice for it is ready.
  const invoice = session.invoice as Stripe.Invoice | string | null;
  const invoiceId = typeof invoice === "string" ? invoice : invoice?.id;
  if (invoiceId) await recordPaidInvoice(invoiceId).catch(() => undefined);
}

/* ── The card ── */

/** A Stripe page to add or replace the card. Card details never touch us. */
export async function cardCheckoutUrl(
  clientId: string,
  purpose: "card" | "leads" = "card",
  origin?: string,
) {
  const back = (path: string) => (origin ? `${origin}${path}` : url(path));
  const customer = await ensureCustomer(clientId);
  const session = await stripe().checkout.sessions.create({
    mode: "setup",
    customer,
    currency: "usd",
    allowed_payment_method_types: ["card"],
    metadata: { clientId, purpose },
    setup_intent_data: { metadata: { clientId, purpose } },
    success_url: back(
      "/dashboard/billing/done?session_id={CHECKOUT_SESSION_ID}",
    ),
    cancel_url: back("/dashboard/billing"),
  });
  if (!session.url) throw new BillingError("Stripe didn't open the card page.");
  return session.url;
}

/** A new card was saved: use it for everything, and retry anything owed. */
export async function completeCardCheckout(sessionId: string) {
  const session = await stripe().checkout.sessions.retrieve(sessionId, {
    expand: ["setup_intent.payment_method"],
  });
  const clientId = session.metadata?.clientId;
  if (session.mode !== "setup" || !clientId || session.status !== "complete")
    return;
  const intent = session.setup_intent as Stripe.SetupIntent | null;
  const method = intent?.payment_method as Stripe.PaymentMethod | null;
  if (!method) return;

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client) return;
  // Already done (the webhook and the return page both get here).
  const already =
    client.cardLast4 === method.card?.last4 &&
    client.cardExpYear === method.card?.exp_year &&
    client.cardExpMonth === method.card?.exp_month;

  await stripe().customers.update(String(session.customer), {
    invoice_settings: { default_payment_method: method.id },
  });
  const row = await siteOf(clientId);
  const subs = [
    row?.site.stripeSubscriptionId,
    client.leadsSubscriptionId,
  ].filter(Boolean) as string[];
  for (const id of subs) {
    const sub = await stripe()
      .subscriptions.retrieve(id)
      .catch(() => undefined);
    if (sub && sub.status !== "canceled")
      await stripe().subscriptions.update(id, {
        default_payment_method: method.id,
      });
  }
  await cacheCard(clientId, method);
  if (!already) {
    await addActivity(
      clientId,
      "invoice",
      "You updated your card",
      "/dashboard/billing",
    );
  }
  if (row?.site.status === "PAST_DUE") await retryWebsitePayment(clientId);
  if (client.leadsStatus === "PAST_DUE")
    await retryLeadsPayment(clientId).catch(() => undefined);
  // Added to keep the Leads Tool: its subscription starts now. A declined
  // card is the client's to fix, not a webhook to retry.
  if (session.metadata?.purpose === "leads") {
    try {
      await startLeadsSubscription(clientId, method.id, session.id);
      return { leads: "ok" as const };
    } catch (error) {
      console.error("[billing] Leads Tool subscription failed:", error);
      return { leads: errorText(error) };
    }
  }
  return {};
}

/** Starts billing again after a plan ended: first bill on the next 1st. */
export async function restartWebsitePlan(clientId: string) {
  const row = await siteOf(clientId);
  if (!row) throw new BillingError("There's no website plan.");
  if (row.site.status !== "CANCELLED")
    throw new BillingError("Their plan hasn't ended.");
  const customerId = row.client.stripeCustomerId;
  if (!customerId)
    throw new BillingError(
      "They need a card on file first: send them a card link.",
    );
  const customer = await stripe().customers.retrieve(customerId);
  const method =
    !customer.deleted && customer.invoice_settings?.default_payment_method;
  if (!method)
    throw new BillingError(
      "They need a card on file first: send them a card link.",
    );

  await db
    .update(websites)
    .set({
      status: "ACTIVE",
      stripeSubscriptionId: null,
      updatedAt: new Date(),
    })
    .where(eq(websites.clientId, clientId));
  await startWebsiteSubscription(
    clientId,
    typeof method === "string" ? method : method.id,
    `-restart-${Date.now()}`,
  );
}

/* ── Cancelling ── */

/**
 * Cancels at the end of the month (the plan runs to the next 1st), or
 * undoes that. Without a subscription yet, cancelling ends it now.
 */
export async function setWebsiteCancel(clientId: string, cancel: boolean) {
  const row = await siteOf(clientId);
  if (!row) throw new BillingError("There's no website plan.");
  let status: "ACTIVE" | "PAST_DUE" | "CANCELLING" | "CANCELLED";
  let endsAt = row.site.nextBillingAt;
  if (row.site.stripeSubscriptionId) {
    const sub = await stripe().subscriptions.update(
      row.site.stripeSubscriptionId,
      {
        cancel_at_period_end: cancel,
      },
    );
    endsAt = periodEnd(sub) ?? endsAt;
    status = cancel
      ? "CANCELLING"
      : sub.status === "past_due" || sub.status === "unpaid"
        ? "PAST_DUE"
        : "ACTIVE";
  } else {
    status = cancel ? "CANCELLED" : "ACTIVE";
  }
  await db
    .update(websites)
    .set({ status, nextBillingAt: endsAt, updatedAt: new Date() })
    .where(eq(websites.clientId, clientId));
  return { status, endsAt: endsAt?.toISOString() };
}

/** Archiving now: every subscription stops today. */
export async function cancelEverythingNow(clientId: string) {
  const row = await siteOf(clientId);
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  for (const id of [
    row?.site.stripeSubscriptionId,
    client?.leadsSubscriptionId,
  ]) {
    if (!id) continue;
    const sub = await stripe()
      .subscriptions.retrieve(id)
      .catch(() => undefined);
    if (sub && sub.status !== "canceled")
      await stripe().subscriptions.cancel(id);
  }
  if (row) {
    await db
      .update(websites)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(eq(websites.clientId, clientId));
  }
  if (client && client.leadsStatus !== "NONE") {
    await db
      .update(clients)
      .set({ leadsStatus: "ENDED", updatedAt: new Date() })
      .where(eq(clients.id, clientId));
  }
}

/* ── Rates ── */

/** A new plan or rate, from the next bill. Nothing prorated. */
export async function changeWebsiteRate(
  clientId: string,
  plan: "FULL_PLATFORM" | "WEBSITE_ONLY",
  monthlyCents: number,
) {
  const row = await siteOf(clientId);
  if (!row) throw new BillingError("There's no website plan.");
  const subId = row.site.stripeSubscriptionId;
  if (subId) {
    const sub = await stripe().subscriptions.retrieve(subId);
    const item = sub.items.data[0];
    if (sub.status !== "canceled" && item) {
      await stripe().subscriptions.update(subId, {
        items: [
          {
            id: item.id,
            price_data: {
              currency: "usd",
              product: await productFor(plan),
              unit_amount: monthlyCents,
              recurring: { interval: "month" },
            },
          },
        ],
        proration_behavior: "none",
        description: `${PLANS[plan].name} for ${row.client.business}`,
      });
    }
  }
}

/** Tries the unpaid bills again with the card on file. */
export async function retryWebsitePayment(clientId: string) {
  const row = await siteOf(clientId);
  const subId = row?.site.stripeSubscriptionId;
  if (!subId) throw new BillingError("There's no subscription to retry.");
  const open = await stripe().invoices.list({
    subscription: subId,
    status: "open",
    limit: 10,
  });
  if (!open.data.length) return { paid: 0 };
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

/* ── Matching the database to Stripe ── */

/**
 * Reads the client's customer and subscription from Stripe and copies what
 * the dashboard shows: the card, the status, the rate and the next bill.
 */
export async function syncWithStripe(clientId: string) {
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client?.stripeCustomerId)
    throw new BillingError("They haven't paid anything through Stripe yet.");
  const customer = await stripe().customers.retrieve(client.stripeCustomerId, {
    expand: ["invoice_settings.default_payment_method"],
  });
  if (customer.deleted)
    throw new BillingError("That Stripe customer was deleted.");

  const row = await siteOf(clientId);
  const subs = await stripe().subscriptions.list({
    customer: client.stripeCustomerId,
    status: "all",
    limit: 20,
    expand: ["data.default_payment_method"],
  });
  const live = subs.data.filter(
    (s) => s.status !== "canceled" && s.status !== "incomplete_expired",
  );
  const isLeads = (s: Stripe.Subscription) =>
    s.id === client.leadsSubscriptionId ||
    /leads/i.test(
      String(s.metadata?.fnf_product ?? s.metadata?.productType ?? ""),
    );
  const website =
    subs.data.find((s) => s.id === row?.site.stripeSubscriptionId) ??
    live.find((s) => !isLeads(s));

  const lines: string[] = [];
  const method =
    (website?.default_payment_method as Stripe.PaymentMethod | null) ??
    (customer.invoice_settings
      ?.default_payment_method as Stripe.PaymentMethod | null);
  if (method && typeof method !== "string") {
    await cacheCard(clientId, method);
    if (method.card)
      lines.push(`Card: ${method.card.brand} ending ${method.card.last4}`);
  }

  if (row && website) {
    const item = website.items.data[0];
    const cents = item?.price?.unit_amount ?? row.site.monthlyCents;
    const status =
      website.status === "canceled"
        ? "CANCELLED"
        : website.status === "past_due" || website.status === "unpaid"
          ? "PAST_DUE"
          : website.cancel_at_period_end || website.cancel_at
            ? "CANCELLING"
            : "ACTIVE";
    const next = periodEnd(website);
    await db
      .update(websites)
      .set({
        stripeSubscriptionId: website.id,
        status,
        monthlyCents: cents,
        ...(next ? { nextBillingAt: next } : {}),
        updatedAt: new Date(),
      })
      .where(eq(websites.clientId, clientId));
    lines.push(
      `Plan: ${money(cents / 100)} a month, ${status.toLowerCase().replace("_", " ")}${next ? `, next bill ${next.toISOString().slice(0, 10)}` : ""}`,
    );
  } else if (row) {
    lines.push("No website subscription in Stripe.");
  }
  return lines.join(". ");
}

/** A subscription changed in Stripe (cancelled, past due, renewed). */
export async function syncSubscription(subId: string) {
  const sub = await stripe().subscriptions.retrieve(subId);
  const [site] = await db
    .select()
    .from(websites)
    .where(eq(websites.stripeSubscriptionId, subId))
    .limit(1);
  if (site) {
    const status =
      sub.status === "canceled"
        ? "CANCELLED"
        : sub.status === "past_due" || sub.status === "unpaid"
          ? "PAST_DUE"
          : sub.cancel_at_period_end || sub.cancel_at
            ? "CANCELLING"
            : "ACTIVE";
    const next = periodEnd(sub);
    await db
      .update(websites)
      .set({
        status,
        ...(next && status !== "CANCELLED" ? { nextBillingAt: next } : {}),
        updatedAt: new Date(),
      })
      .where(eq(websites.clientId, site.clientId));
    if (status === "CANCELLED" && site.status !== "CANCELLED") {
      await addActivity(
        site.clientId,
        "invoice",
        "Your plan ended",
        "/dashboard/billing",
      );
      const [client] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, site.clientId))
        .limit(1);
      await alertAdmins(
        "payment",
        `${client?.business ?? "A client"}'s plan ended`,
        {
          eyebrow: "Billing",
          heading: `${client?.business ?? "A client"}'s plan has ended`,
          paragraphs: [
            "Their subscription is cancelled in Stripe. Nothing more will be charged.",
          ],
          button: {
            label: "Open their billing",
            href: url(`/admin/clients/${site.clientId}?tab=billing`),
          },
        },
      );
    }
    return;
  }
  await syncLeadsSubscription(sub);
}
