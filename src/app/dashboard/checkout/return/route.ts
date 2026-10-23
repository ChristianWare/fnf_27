// GET /dashboard/checkout/return: back from a bank's own check (3-D
// Secure, say) on our checkout page. Finishes the payment or saved card,
// then shows Billing with what happened. The webhook does the same, and
// whichever comes second changes nothing.

import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/dashboard";
import { finishCheckout } from "@/lib/billing/checkout";

export async function GET(request: Request) {
  const { client } = await getDashboard();
  const params = new URL(request.url).searchParams;
  const id = params.get("payment_intent") ?? params.get("setup_intent") ?? "";
  const back = (path: string) =>
    NextResponse.redirect(new URL(path, request.url), 303);
  try {
    const result = await finishCheckout(id, client.id);
    if (result.done)
      return back(
        `/dashboard/billing?done=${result.done}${result.done === "leads" ? "#leads" : ""}`,
      );
    if (result.pending) return back("/dashboard/billing?done=pending");
    return back(
      `/dashboard/billing?error=${encodeURIComponent(result.error ?? "That didn't go through. Try again.")}`,
    );
  } catch (error) {
    console.error("[billing] return from checkout failed:", error);
    return back("/dashboard/billing?done=pending");
  }
}
