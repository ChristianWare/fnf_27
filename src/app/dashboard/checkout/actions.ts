"use server";

// The checkout page's two calls: start the payment form, and finish once
// Stripe says it went through.

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/dal";
import { done, fail, VIEW_ONLY, type ActionResult } from "@/lib/actions";
import { errorText } from "@/lib/billing/stripe";
import {
  finishCheckout,
  startCheckout,
  type CheckoutPurpose,
} from "@/lib/billing/checkout";

async function clientId() {
  const user = await getSessionUser();
  if (!user) return { error: "Your session ended. Sign in again." };
  if (user.role === "ADMIN") return { error: VIEW_ONLY };
  if (!user.clientId) return { error: "We couldn't find your business." };
  return { id: user.clientId };
}

export async function beginCheckout(
  purpose: CheckoutPurpose,
): Promise<ActionResult<{ kind: "payment" | "setup"; clientSecret: string }>> {
  const who = await clientId();
  if (!who.id) return fail(who.error!);
  if (!["setup", "card", "leads"].includes(purpose))
    return fail("That isn't something to pay for.");
  try {
    return done(await startCheckout(who.id, purpose));
  } catch (error) {
    return fail(errorText(error));
  }
}

export async function completeCheckout(
  intentId: string,
): Promise<ActionResult<{ done?: string; pending?: boolean }>> {
  const who = await clientId();
  if (!who.id) return fail(who.error!);
  try {
    const result = await finishCheckout(String(intentId), who.id);
    revalidatePath("/dashboard", "layout");
    revalidatePath("/admin", "layout");
    if (result.error) return fail(result.error);
    return done({ done: result.done, pending: result.pending });
  } catch (error) {
    return fail(errorText(error));
  }
}
