// GET /dashboard/billing/done?session_id=…: back from Stripe. Records the
// payment or the new card straight away (the webhook does the same, and
// whichever comes second changes nothing), then shows Billing.

import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/dashboard";
import { stripe } from "@/lib/billing/stripe";
import {
  completeCardCheckout,
  completeSetupCheckout,
} from "@/lib/billing/website";

export async function GET(request: Request) {
  const { client } = await getDashboard();
  const id = new URL(request.url).searchParams.get("session_id") ?? "";
  const back = (path: string) =>
    NextResponse.redirect(new URL(path, request.url), 303);
  try {
    const session = await stripe().checkout.sessions.retrieve(id);
    if (session.metadata?.clientId !== client.id) {
      return back("/dashboard/billing");
    }
    if (session.mode === "setup") {
      const result = await completeCardCheckout(id);
      if (session.metadata?.purpose === "leads") {
        return back(
          result?.leads && result.leads !== "ok"
            ? `/dashboard/billing?error=${encodeURIComponent(result.leads)}#leads`
            : "/dashboard/billing?done=leads#leads",
        );
      }
      return back("/dashboard/billing?done=card");
    }
    await completeSetupCheckout(id);
    return back("/dashboard/billing?done=setup");
  } catch (error) {
    console.error("[billing] return from Stripe failed:", error);
    // The webhook will still record it; Billing catches up in a minute.
    return back("/dashboard/billing?done=pending");
  }
}
