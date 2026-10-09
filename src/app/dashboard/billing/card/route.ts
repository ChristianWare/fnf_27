// GET /dashboard/billing/card: off to Stripe to add or replace the card.
// The link in "your payment didn't go through" emails, and the one admins
// send. Signing in comes first if needed.

import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/dashboard";
import { errorText } from "@/lib/billing/stripe";
import { cardCheckoutUrl } from "@/lib/billing/website";

export async function GET(request: Request) {
  const { client, viewingAs } = await getDashboard();
  const back = (path: string) =>
    NextResponse.redirect(new URL(path, request.url), 303);
  if (viewingAs) return back("/dashboard/billing?error=view-as");
  try {
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(
      await cardCheckoutUrl(client.id, "card", origin),
      303,
    );
  } catch (error) {
    const message = encodeURIComponent(errorText(error));
    return back(`/dashboard/billing?error=${message}`);
  }
}
