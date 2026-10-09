// Stripe's events, each handled once. Every handler re-reads the object
// from Stripe, so it doesn't matter which API version the webhook endpoint
// was set up with. Server only.

import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { recordFailedInvoice, recordPaidInvoice } from "./invoices";
import { cacheCard, clientByCustomer, stripe } from "./stripe";
import {
  completeCardCheckout,
  completeSetupCheckout,
  syncSubscription,
} from "./website";

/** Handles one event. False when it had already been handled. */
export async function handleStripeEvent(event: Stripe.Event) {
  const [fresh] = await db
    .insert(schema.stripeEvents)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing()
    .returning({ id: schema.stripeEvents.id });
  if (!fresh) return false;

  const object = event.data.object as {
    id?: string;
    mode?: string;
    metadata?: Record<string, string> | null;
    customer?: unknown;
  };
  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        if (object.mode === "setup") await completeCardCheckout(object.id!);
        else if (object.metadata?.purpose === "setup")
          await completeSetupCheckout(object.id!);
        break;
      case "invoice.paid":
      case "invoice.payment_succeeded":
        await recordPaidInvoice(object.id!);
        break;
      case "invoice.payment_failed":
        await recordFailedInvoice(object.id!);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(object.id!);
        break;
      case "customer.updated": {
        const client = await clientByCustomer(object.id);
        if (!client) break;
        const customer = await stripe().customers.retrieve(object.id!, {
          expand: ["invoice_settings.default_payment_method"],
        });
        if (!customer.deleted) {
          await cacheCard(
            client.id,
            customer.invoice_settings?.default_payment_method as
              Stripe.PaymentMethod | string | null,
          );
        }
        break;
      }
    }
  } catch (error) {
    // Forget it, so Stripe's retry gets another go.
    await db
      .delete(schema.stripeEvents)
      .where(eq(schema.stripeEvents.id, event.id));
    throw error;
  }
  return true;
}
