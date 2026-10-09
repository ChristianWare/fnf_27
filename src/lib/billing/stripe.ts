// The Stripe client, and the few lookups every billing flow shares. Server
// only. Stripe is the source of truth for money; the database keeps a copy
// of what the dashboard shows (status, next bill, the card's last four).

import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { IS_LIVE } from "@/lib/server/email";
import { clientPeople, getSetting, setSetting } from "@/lib/data/write";
import { asBillingDay } from "@/lib/dashboard/billing";

/** A billing problem we can explain to the person who clicked. */
export class BillingError extends Error {}

let client: Stripe | undefined;

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key)
    throw new BillingError("Billing isn't set up: add STRIPE_SECRET_KEY.");
  if (!IS_LIVE && key.startsWith("sk_live_")) {
    throw new BillingError(
      "This isn't the live site, so it won't touch real money: use your Stripe test keys (sk_test_…) here.",
    );
  }
  client ??= new Stripe(key, {
    maxNetworkRetries: 2,
    appInfo: { name: "Fonts & Footers" },
    // For tests only: a stand-in Stripe on this machine.
    ...(process.env.STRIPE_API_HOST
      ? {
          host: process.env.STRIPE_API_HOST,
          port: Number(process.env.STRIPE_API_PORT ?? 443),
          protocol: (process.env.STRIPE_API_PROTOCOL ?? "https") as
            "http" | "https",
        }
      : {}),
  });
  return client;
}

/* ── Our products in Stripe, created once and remembered ── */

export type ProductKey = "FULL_PLATFORM" | "WEBSITE_ONLY" | "SETUP" | "LEADS";

const PRODUCT_NAMES: Record<ProductKey, string> = {
  FULL_PLATFORM: "Full Platform",
  WEBSITE_ONLY: "Website Only",
  SETUP: "Website setup",
  LEADS: "Leads Tool",
};

export async function productFor(key: ProductKey) {
  const mode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
    ? "live"
    : "test";
  const settingKey = `stripe_products_${mode}`;
  const known = (await getSetting<Record<string, string>>(settingKey)) ?? {};
  if (known[key]) return known[key];

  const found = await stripe()
    .products.search({
      query: `metadata['fnf_product']:'${key}' AND active:'true'`,
      limit: 1,
    })
    .catch(() => undefined);
  const id =
    found?.data[0]?.id ??
    (
      await stripe().products.create(
        { name: PRODUCT_NAMES[key], metadata: { fnf_product: key } },
        { idempotencyKey: `fnf-product-${mode}-${key}` },
      )
    ).id;
  await setSetting(settingKey, { ...known, [key]: id });
  return id;
}

/* ── Customers ── */

/** The client's Stripe customer, made the first time they pay. */
export async function ensureCustomer(clientId: string) {
  const [row] = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.id, clientId))
    .limit(1);
  if (!row) throw new BillingError("We couldn't find that business.");
  if (row.stripeCustomerId) return row.stripeCustomerId;

  const [person] = await clientPeople(clientId);
  const customer = await stripe().customers.create(
    {
      name: row.business,
      email: person?.email,
      phone: row.phone ?? person?.phone ?? undefined,
      metadata: { clientId },
    },
    { idempotencyKey: `fnf-customer-${clientId}` },
  );
  await db
    .update(schema.clients)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(schema.clients.id, clientId));
  return customer.id;
}

export async function clientByCustomer(customer: unknown) {
  const id =
    typeof customer === "string"
      ? customer
      : (customer as { id?: string } | null)?.id;
  if (!id) return undefined;
  const [row] = await db
    .select()
    .from(schema.clients)
    .where(eq(schema.clients.stripeCustomerId, id))
    .limit(1);
  return row;
}

/** Keeps a copy of the card's brand and last four for the dashboard. */
export async function cacheCard(
  clientId: string,
  method: Stripe.PaymentMethod | string | null | undefined,
) {
  if (!method) return;
  const pm =
    typeof method === "string"
      ? await stripe().paymentMethods.retrieve(method)
      : method;
  if (!pm.card) return;
  await db
    .update(schema.clients)
    .set({
      cardBrand: pm.card.brand,
      cardLast4: pm.card.last4,
      cardExpMonth: pm.card.exp_month,
      cardExpYear: pm.card.exp_year,
      updatedAt: new Date(),
    })
    .where(eq(schema.clients.id, clientId));
}

/* ── Reading Stripe objects from any API version ── */

/** The subscription an invoice belongs to, old payloads and new. */
export function subscriptionOf(invoice: Stripe.Invoice) {
  const fromParent = invoice.parent?.subscription_details?.subscription;
  const legacy = (invoice as unknown as { subscription?: unknown })
    .subscription;
  const value = fromParent ?? legacy;
  return typeof value === "string"
    ? value
    : (value as { id?: string } | null | undefined)?.id;
}

/** When the subscription's current month ends: its next bill. */
export function periodEnd(sub: Stripe.Subscription) {
  const item = sub.items?.data?.[0] as
    (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
  const legacy = (sub as unknown as { current_period_end?: number })
    .current_period_end;
  const seconds = item?.current_period_end ?? legacy;
  return seconds ? asBillingDay(new Date(seconds * 1000)) : undefined;
}

export const errorText = (error: unknown) =>
  error instanceof BillingError
    ? error.message
    : error instanceof Stripe.errors.StripeError
      ? (error.message ?? "Stripe said no.")
      : "Something went wrong with billing. Try again in a minute.";
