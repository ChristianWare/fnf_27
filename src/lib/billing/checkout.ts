// Our own checkout page (/dashboard/checkout), in place of Stripe's hosted
// one. Stripe's Payment Element takes the card inside our page, so card
// details still never touch our server. Server only.
//
//   setup  the website setup fee: a PaymentIntent that also saves the card,
//          or, when the fee is waived, a SetupIntent that just saves it
//   card   add or replace the card
//   leads  the card that keeps the Leads Tool going
//
// Paying starts the same things Stripe's page did: the monthly plan on the
// next 1st, the receipt, the Leads Tool. Every intent is tagged
// source: "elements", so the webhook only finishes ours.

import type Stripe from "stripe";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { loadClient } from "@/lib/data/clients";
import { addActivity, setFact } from "@/lib/data/write";
import { leadsAccess } from "@/lib/dashboard/helpers";
import { PLANS } from "@/lib/dashboard/plans";
import { recordPaidInvoice } from "./invoices";
import { BillingError, cacheCard, ensureCustomer, stripe } from "./stripe";
import { applyCard, siteOf, startWebsiteSubscription } from "./website";

export type CheckoutPurpose = "setup" | "card" | "leads";

export const SOURCE = "elements";

/** The Payment Element's secret for this purpose. */
export async function startCheckout(
  clientId: string,
  purpose: CheckoutPurpose,
): Promise<{ kind: "payment" | "setup"; clientSecret: string }> {
  const customer = await ensureCustomer(clientId);

  if (purpose === "setup") {
    const row = await siteOf(clientId);
    if (!row) throw new BillingError("There's no website plan to pay for yet.");
    if (row.site.facts.setupFeePaidAt)
      throw new BillingError("Your setup is already paid.");
    if (!row.site.facts.agreementSignedAt)
      throw new BillingError("Sign your agreement first, then set up billing.");
    if (row.site.setupFeeCents > 0) {
      const intent = await stripe().paymentIntents.create({
        customer,
        amount: row.site.setupFeeCents,
        currency: "usd",
        allowed_payment_method_types: ["card"],
        // Saved for the monthly plan.
        setup_future_usage: "off_session",
        description: `${PLANS[row.site.plan].name} setup for ${row.client.business}`,
        metadata: { clientId, purpose: "setup", source: SOURCE },
      });
      return { kind: "payment", clientSecret: intent.client_secret! };
    }
    return setupIntent(clientId, customer, "waived");
  }

  if (purpose === "leads") {
    const client = await loadClient(clientId);
    if (!client) throw new BillingError("We couldn't find your business.");
    if (leadsAccess(client) === "INCLUDED")
      throw new BillingError("The Leads Tool is included with your plan.");
  }
  return setupIntent(clientId, customer, purpose);
}

async function setupIntent(
  clientId: string,
  customer: string,
  purpose: "waived" | "card" | "leads",
) {
  const intent = await stripe().setupIntents.create({
    customer,
    allowed_payment_method_types: ["card"],
    usage: "off_session",
    metadata: { clientId, purpose, source: SOURCE },
  });
  return { kind: "setup" as const, clientSecret: intent.client_secret! };
}

/**
 * Finishes a payment or saved card from our checkout page: from the page
 * itself, the redirect back from a bank check, or the webhook. Safe to run
 * more than once. Returns what got done, for the Billing page's message.
 */
export async function finishCheckout(
  intentId: string,
  /** The signed-in client; the webhook passes nothing and trusts Stripe. */
  clientId?: string,
): Promise<{
  done?: "setup" | "waived" | "card" | "leads";
  error?: string;
  pending?: boolean;
}> {
  if (intentId.startsWith("pi_")) {
    const intent = await stripe().paymentIntents.retrieve(intentId, {
      expand: ["payment_method"],
    });
    const owner = intent.metadata?.clientId;
    if (!owner || (clientId && owner !== clientId)) return {};
    if (intent.metadata?.source !== SOURCE) return {};
    if (intent.status === "processing") return { pending: true };
    if (intent.status !== "succeeded")
      return { error: "That payment didn't go through. Try again." };
    await completeSetupPayment(owner, intent);
    return { done: "setup" };
  }

  if (intentId.startsWith("seti_")) {
    const intent = await stripe().setupIntents.retrieve(intentId, {
      expand: ["payment_method"],
    });
    const owner = intent.metadata?.clientId;
    if (!owner || (clientId && owner !== clientId)) return {};
    if (intent.metadata?.source !== SOURCE) return {};
    if (intent.status === "processing") return { pending: true };
    if (intent.status !== "succeeded")
      return { error: "That card wasn't saved. Try again." };
    const method = intent.payment_method as Stripe.PaymentMethod | null;
    if (!method || !intent.customer) return {};
    const purpose = intent.metadata?.purpose;
    const result = await applyCard(
      owner,
      String(intent.customer),
      method,
      purpose,
      intent.id,
    );
    if (result.leads && result.leads !== "ok") return { error: result.leads };
    return {
      done:
        purpose === "waived" ? "waived" : purpose === "leads" ? "leads" : "card",
    };
  }
  return {};
}

/**
 * The setup fee went through: the card becomes theirs for the monthly plan,
 * the setup step is done, billing starts on the next 1st, and a receipt is
 * recorded (a Stripe invoice marked paid, so it numbers and emails like the
 * rest).
 */
async function completeSetupPayment(
  clientId: string,
  intent: Stripe.PaymentIntent,
) {
  const method = intent.payment_method as Stripe.PaymentMethod | null;
  if (method && intent.customer) {
    await stripe().customers.update(String(intent.customer), {
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
  if (!first) return;

  await addActivity(
    clientId,
    "build",
    "You paid the setup fee",
    "/dashboard/billing",
  );
  const [site] = await db
    .select({ plan: schema.websites.plan })
    .from(schema.websites)
    .where(eq(schema.websites.clientId, clientId))
    .limit(1);
  const name = `${site ? PLANS[site.plan].name : "Website"} setup`;
  const customer = String(intent.customer);
  try {
    const invoice = await stripe().invoices.create(
      {
        customer,
        auto_advance: false,
        collection_method: "charge_automatically",
        pending_invoice_items_behavior: "exclude",
        description: name,
        metadata: { clientId, purpose: "setup", payment_intent: intent.id },
      },
      { idempotencyKey: `fnf-setup-invoice-${intent.id}` },
    );
    await stripe().invoiceItems.create(
      {
        customer,
        invoice: invoice.id,
        amount: intent.amount_received || intent.amount,
        currency: "usd",
        description: name,
      },
      { idempotencyKey: `fnf-setup-item-${intent.id}` },
    );
    await stripe().invoices.finalizeInvoice(invoice.id!, {
      auto_advance: false,
    });
    // Already paid on our checkout page: this records it, it charges nothing.
    await stripe().invoices.pay(invoice.id!, { paid_out_of_band: true });
    await recordPaidInvoice(invoice.id!);
  } catch (error) {
    // The payment itself went through; a missing receipt mustn't undo it.
    console.error("[billing] setup receipt failed:", error);
  }
}
