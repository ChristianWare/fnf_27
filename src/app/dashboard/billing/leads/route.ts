// GET /dashboard/billing/leads: off to Stripe to add the card that keeps
// the Leads Tool going after the trial (or switches it back on). The link
// in the trial emails. Signing in comes first if needed.

import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/dashboard";
import { errorText } from "@/lib/billing/stripe";
import { leadsCheckoutUrl } from "@/lib/billing/leads";

export async function GET(request: Request) {
  const { client, viewingAs } = await getDashboard();
  const back = (path: string) =>
    NextResponse.redirect(new URL(path, request.url), 303);
  if (viewingAs) return back("/dashboard/billing?error=view-as");
  try {
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(
      await leadsCheckoutUrl(client.id, origin),
      303,
    );
  } catch (error) {
    return back(
      `/dashboard/billing?error=${encodeURIComponent(errorText(error))}#leads`,
    );
  }
}
