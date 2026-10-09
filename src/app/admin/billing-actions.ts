"use server";

// Admin actions for one client's money: rates, the card link, retrying a
// failed payment, cancelling, matching Stripe, and the Leads Tool trial.

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSessionUser } from "@/lib/auth/dal";
import { done, fail, type ActionResult } from "@/lib/actions";
import { addActivity } from "@/lib/data/write";
import { loadClient } from "@/lib/data/clients";
import { url } from "@/lib/server/config";
import { emailClient } from "@/lib/server/notify";
import { errorText, stripe } from "@/lib/billing/stripe";
import {
  changeWebsiteRate,
  restartWebsitePlan,
  retryWebsitePayment,
  setWebsiteCancel,
  syncWithStripe,
} from "@/lib/billing/website";
import { nextFirst } from "@/lib/dashboard/billing";
import { fmtDate, money } from "@/lib/dashboard/format";
import { LEADS, PLANS } from "@/lib/dashboard/plans";
import type { PlanId } from "@/lib/dashboard/types";

const s = schema;

async function admin() {
  const user = await getSessionUser();
  return user?.role === "ADMIN" ? user : undefined;
}

const NOT_ADMIN = "Only admins can do that.";

const refresh = () => {
  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard", "layout");
};

const first = (name: string) => name.split(" ")[0] || name;

export async function saveRates(
  clientId: string,
  input: { plan: PlanId; monthly: number; setup: number },
): Promise<ActionResult> {
  if (!(await admin())) return fail(NOT_ADMIN);
  if (!(input.plan in PLANS)) return fail("Choose a plan.");
  const monthly = Number(input.monthly);
  const setup = Number(input.setup);
  if (!(monthly > 0) || monthly > 100_000)
    return fail("Check the monthly rate.");
  const client = await loadClient(clientId);
  const w = client?.website;
  if (!client || !w) return fail("They don't have a website plan.");

  try {
    if (w.plan !== input.plan || w.monthly !== monthly) {
      await changeWebsiteRate(clientId, input.plan, Math.round(monthly * 100));
    }
    await db
      .update(s.websites)
      .set({
        plan: input.plan,
        monthlyCents: Math.round(monthly * 100),
        // The setup fee can't change once it's paid.
        ...(w.facts.setupFeePaidAt || !(setup >= 0)
          ? {}
          : { setupFeeCents: Math.round(setup * 100) }),
        updatedAt: new Date(),
      })
      .where(eq(s.websites.clientId, clientId));
  } catch (error) {
    return fail(errorText(error));
  }

  if (w.plan !== input.plan || w.monthly !== monthly) {
    const from = fmtDate(w.nextBillingAt ?? nextFirst(new Date()));
    await addActivity(
      clientId,
      "invoice",
      `Your plan changed: ${PLANS[input.plan].name} at ${money(monthly)} a month`,
      "/dashboard/billing",
    );
    await emailClient(clientId, `Your plan from ${from}`, {
      eyebrow: "Billing",
      heading: "Your new rate",
      paragraphs: [
        `From your ${from} bill, ${client.business} is on the ${PLANS[input.plan].name} at ${money(monthly)} a month. Nothing is prorated.`,
      ],
      button: { label: "Open Billing", href: url("/dashboard/billing") },
    });
  }
  refresh();
  return done();
}

/** Emails the client a link to add or replace their card. */
export async function sendCardLink(clientId: string): Promise<ActionResult> {
  if (!(await admin())) return fail(NOT_ADMIN);
  const client = await loadClient(clientId);
  if (!client) return fail("We couldn't find that client.");
  const sent = await emailClient(
    clientId,
    "Update your card for Fonts & Footers",
    {
      eyebrow: "Billing",
      heading: `A quick one, ${first(client.contact.name)}`,
      paragraphs: [
        "Please add or update the card for your plan. It takes a minute on Stripe's secure page, and if a payment is waiting we'll retry it straight away.",
      ],
      button: {
        label: "Update your card",
        href: url("/dashboard/billing/card"),
      },
    },
    { firstOnly: true },
  );
  return sent
    ? done()
    : fail("The email didn't go out. Try again in a minute.");
}

export async function retryPayment(
  clientId: string,
): Promise<ActionResult<{ paid: number }>> {
  if (!(await admin())) return fail(NOT_ADMIN);
  try {
    const result = await retryWebsitePayment(clientId);
    refresh();
    return done(result);
  } catch (error) {
    return fail(`Still declined: ${errorText(error)}`);
  }
}

export async function setPlanCancel(
  clientId: string,
  cancel: boolean,
): Promise<ActionResult> {
  if (!(await admin())) return fail(NOT_ADMIN);
  const client = await loadClient(clientId);
  if (!client?.website) return fail("They don't have a website plan.");
  try {
    const result = await setWebsiteCancel(clientId, cancel);
    const ends = result.endsAt
      ? fmtDate(new Date(new Date(result.endsAt).getTime() - 86_400_000))
      : undefined;
    await addActivity(
      clientId,
      "invoice",
      cancel
        ? ends
          ? `Your plan is cancelled. It ends on ${ends}`
          : "Your plan is cancelled"
        : "Your plan carries on as normal",
      "/dashboard/billing",
    );
    await emailClient(
      clientId,
      cancel ? "Your plan is cancelled" : "Your plan carries on",
      {
        eyebrow: "Billing",
        heading: cancel ? "Your plan is cancelled" : "Your plan carries on",
        paragraphs: [
          cancel
            ? ends
              ? `As agreed, your ${PLANS[client.website.plan].name} plan ends on ${ends}. Nothing more is charged.`
              : `As agreed, your ${PLANS[client.website.plan].name} plan has ended. Nothing more is charged.`
            : "Your cancellation is undone. Billing carries on as normal on the 1st.",
        ],
        button: { label: "Open Billing", href: url("/dashboard/billing") },
      },
    );
    refresh();
    return done();
  } catch (error) {
    return fail(errorText(error));
  }
}

/** Billing again after their plan ended, from the next 1st. */
export async function restartPlan(clientId: string): Promise<ActionResult> {
  if (!(await admin())) return fail(NOT_ADMIN);
  const client = await loadClient(clientId);
  if (!client?.website) return fail("They don't have a website plan.");
  try {
    await restartWebsitePlan(clientId);
  } catch (error) {
    return fail(errorText(error));
  }
  const first = fmtDate(nextFirst(new Date()));
  await addActivity(
    clientId,
    "invoice",
    `Your plan starts again on ${first}`,
    "/dashboard/billing",
  );
  await emailClient(clientId, "Your plan is back on", {
    eyebrow: "Billing",
    heading: "Welcome back",
    paragraphs: [
      `Your ${PLANS[client.website.plan].name} plan is back on. The first bill is ${money(client.website.monthly)} on ${first}, then the 1st of every month.`,
    ],
    button: { label: "Open Billing", href: url("/dashboard/billing") },
  });
  refresh();
  return done();
}

/** Copies Stripe's view of the client: card, rate, status, next bill. */
export async function syncStripe(
  clientId: string,
): Promise<ActionResult<{ summary: string }>> {
  if (!(await admin())) return fail(NOT_ADMIN);
  try {
    const summary = await syncWithStripe(clientId);
    refresh();
    return done({ summary });
  } catch (error) {
    return fail(errorText(error));
  }
}

/* ── The Leads Tool trial ── */

export async function extendTrial(
  clientId: string,
  days = 7,
): Promise<ActionResult<{ trialEndsAt: string }>> {
  if (!(await admin())) return fail(NOT_ADMIN);
  const [row] = await db
    .select()
    .from(s.clients)
    .where(eq(s.clients.id, clientId))
    .limit(1);
  if (!row || row.leadsStatus !== "TRIAL")
    return fail("They aren't on a trial.");
  const from =
    row.leadsTrialEndsAt && row.leadsTrialEndsAt > new Date()
      ? row.leadsTrialEndsAt
      : new Date();
  const ends = new Date(
    from.getTime() + Math.min(60, Math.max(1, days)) * 86_400_000,
  );
  await db
    .update(s.clients)
    .set({ leadsTrialEndsAt: ends, updatedAt: new Date() })
    .where(eq(s.clients.id, clientId));
  await addActivity(
    clientId,
    "leads",
    `Your Leads Tool trial now runs until ${fmtDate(ends)}`,
    "/dashboard/leads",
  );
  await emailClient(clientId, "Your Leads Tool trial is longer", {
    eyebrow: LEADS.name,
    heading: "A few more days on us",
    paragraphs: [
      `Your free trial now runs until ${fmtDate(ends)}. Enjoy the leads.`,
    ],
    button: { label: "Open the Leads Tool", href: url("/dashboard/leads") },
  });
  refresh();
  return done({ trialEndsAt: ends.toISOString() });
}

export async function startTrialFor(
  clientId: string,
): Promise<ActionResult<{ trialEndsAt: string }>> {
  if (!(await admin())) return fail(NOT_ADMIN);
  const [row] = await db
    .select()
    .from(s.clients)
    .where(eq(s.clients.id, clientId))
    .limit(1);
  if (!row) return fail("We couldn't find that client.");
  if (row.leadsStatus === "TRIAL" || row.leadsStatus === "ACTIVE")
    return fail("Their Leads Tool is already on.");
  const now = new Date();
  const ends = new Date(now.getTime() + LEADS.trialDays * 86_400_000);
  await db
    .update(s.clients)
    .set({
      leadsStatus: "TRIAL",
      leadsStartedAt: now,
      leadsTrialEndsAt: ends,
      updatedAt: now,
    })
    .where(eq(s.clients.id, clientId));
  await addActivity(
    clientId,
    "leads",
    `Your ${LEADS.trialDays}-day Leads Tool trial started`,
    "/dashboard/leads",
  );
  await emailClient(clientId, "Your Leads Tool trial has started", {
    eyebrow: LEADS.name,
    heading: `${LEADS.trialDays} days of leads, on us`,
    paragraphs: [
      `We've switched on the Leads Tool for you. Your free trial runs until ${fmtDate(ends)}, no card needed.`,
    ],
    button: { label: "Open the Leads Tool", href: url("/dashboard/leads") },
  });
  refresh();
  return done({ trialEndsAt: ends.toISOString() });
}

export async function endLeads(clientId: string): Promise<ActionResult> {
  if (!(await admin())) return fail(NOT_ADMIN);
  const [row] = await db
    .select()
    .from(s.clients)
    .where(eq(s.clients.id, clientId))
    .limit(1);
  if (!row) return fail("We couldn't find that client.");
  try {
    if (row.leadsSubscriptionId) {
      await stripe().subscriptions.update(row.leadsSubscriptionId, {
        cancel_at_period_end: true,
      });
      await db
        .update(s.clients)
        .set({ leadsStatus: "CANCELLING", updatedAt: new Date() })
        .where(eq(s.clients.id, clientId));
    } else {
      await db
        .update(s.clients)
        .set({ leadsStatus: "ENDED", updatedAt: new Date() })
        .where(eq(s.clients.id, clientId));
    }
  } catch (error) {
    return fail(errorText(error));
  }
  await addActivity(
    clientId,
    "leads",
    row.leadsSubscriptionId
      ? "Your Leads Tool ends at the end of the month"
      : "Your Leads Tool trial ended",
    "/dashboard/billing",
  );
  refresh();
  return done();
}
