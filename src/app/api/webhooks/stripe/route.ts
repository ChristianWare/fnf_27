// POST /api/webhooks/stripe: Stripe tells us about payments, failed
// charges, cancellations and card changes. The same address the old site
// used, so the endpoint in Stripe carries on as it is.

import type Stripe from "stripe";
import { handleStripeEvent } from "@/lib/billing/webhook";
import { stripe } from "@/lib/billing/stripe";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) {
    return new Response("Webhook not set up", { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch {
    return new Response("Bad signature", { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (error) {
    console.error(`[stripe] ${event.type} ${event.id} failed:`, error);
    return new Response("Failed, retry later", { status: 500 });
  }
  return Response.json({ received: true });
}
