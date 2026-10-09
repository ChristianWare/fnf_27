// GET /dashboard/billing/pay: off to Stripe to pay the setup fee.

import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/dashboard";
import { errorText } from "@/lib/billing/stripe";
import { setupCheckoutUrl } from "@/lib/billing/website";

export async function GET(request: Request) {
  const { client, viewingAs } = await getDashboard();
  const back = (path: string) =>
    NextResponse.redirect(new URL(path, request.url), 303);
  if (viewingAs) return back("/dashboard/billing?error=view-as");
  try {
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(
      await setupCheckoutUrl(client.id, origin),
      303,
    );
  } catch (error) {
    const message = encodeURIComponent(errorText(error));
    return back(`/dashboard/billing?error=${message}`);
  }
}
