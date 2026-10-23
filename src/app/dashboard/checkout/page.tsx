// Our checkout page: the order on one side, the card on the other. It pays
// the setup fee (or saves the card when it's waived), replaces the card,
// or adds the card that keeps the Leads Tool. Stripe's form sits inside
// the page, so card details never touch our server.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Checkout, {
  type OrderSummary,
} from "@/components/Dashboard/Checkout/Checkout";
import { Notice, PageHead } from "@/components/Dashboard/ui/ui";
import {
  awaitingApproval,
  getDashboard,
  leadsAccess,
} from "@/lib/dashboard";
import { nextFirst } from "@/lib/dashboard/billing";
import { fmtDate, money } from "@/lib/dashboard/format";
import { LEADS, PLANS } from "@/lib/dashboard/plans";
import type { CheckoutPurpose } from "@/lib/billing/checkout";

export const metadata: Metadata = { title: "Checkout" };

const PURPOSES: CheckoutPurpose[] = ["setup", "card", "leads"];

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ for?: string | string[] }>;
}) {
  const { client, now, viewingAs } = await getDashboard();
  if (awaitingApproval(client)) redirect("/dashboard");
  const asked = (await searchParams).for;
  const purpose = PURPOSES.find((p) => p === asked) ?? "card";
  const website = client.website;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  // Stripe's own page, for when this one can't be used.
  const hosted =
    purpose === "setup"
      ? "/dashboard/billing/pay?hosted=1"
      : purpose === "leads"
        ? "/dashboard/billing/leads?hosted=1"
        : "/dashboard/billing/card?hosted=1";

  let order: OrderSummary;
  if (purpose === "setup") {
    if (!website) redirect("/dashboard");
    if (website.facts.setupFeePaidAt) redirect("/dashboard/billing");
    if (!website.facts.agreementSignedAt)
      redirect("/dashboard/website/documents");
    const plan = PLANS[website.plan];
    const waived = website.setupFee <= 0;
    order = {
      eyebrow: "Your order",
      title: plan.name,
      text: "Your custom website and everything in your plan, built together through your dashboard.",
      lines: [
        waived
          ? {
              label: "Setup fee",
              value: "Waived",
              was: money(plan.setup),
            }
          : { label: "Setup fee, one time", value: money(website.setupFee) },
        {
          label: `${plan.name}, monthly`,
          value: `${money(website.monthly)}/mo`,
        },
        {
          label: "First monthly charge",
          value: fmtDate(nextFirst(now)),
        },
        { label: "Per-booking fees", value: "None" },
      ],
      totalLabel: "Due today",
      total: waived ? "$0" : money(website.setupFee),
      button: waived ? "Save card" : `Pay ${money(website.setupFee)}`,
      fine: waived
        ? `Nothing is charged today. Your ${money(website.monthly)} monthly plan is charged to this card on the 1st of every month, starting ${fmtDate(nextFirst(now))}. Month to month, cancel anytime.`
        : `Then ${money(website.monthly)} a month, charged to this card on the 1st of every month, starting ${fmtDate(nextFirst(now))}. Month to month, cancel anytime.`,
    };
  } else if (purpose === "leads") {
    if (leadsAccess(client) === "INCLUDED") redirect("/dashboard/billing");
    const trialEnds =
      client.leads.status === "TRIAL" ? client.leads.trialEndsAt : undefined;
    order = {
      eyebrow: "Keep your leads",
      title: LEADS.name,
      text: "The hotels, venues and companies near you that book rides, every morning, with who to ask for and what to say.",
      lines: [
        { label: `${LEADS.name}, monthly`, value: `${money(LEADS.monthly)}/mo` },
        ...(trialEnds
          ? [{ label: "Free trial ends", value: fmtDate(trialEnds) }]
          : []),
        { label: "Per-lead fees", value: "None" },
      ],
      totalLabel: "Due today",
      total: "$0",
      button: "Save card",
      fine: trialEnds
        ? `Nothing is charged today. When your trial ends on ${fmtDate(trialEnds)}, the first charge covers the rest of that month, then ${money(LEADS.monthly)} on the 1st of every month. Cancel anytime.`
        : `The first charge covers the rest of this month, then ${money(LEADS.monthly)} on the 1st of every month. Cancel anytime.`,
    };
  } else {
    order = {
      eyebrow: "Your card",
      title: client.card ? "Replace your card" : "Add a card",
      text: "The card your plan is charged to on the 1st of every month.",
      lines: [
        ...(client.card
          ? [
              {
                label: "Card on file now",
                value: `${client.card.brand} •••• ${client.card.last4}`,
              },
            ]
          : []),
        ...(website
          ? [
              {
                label: `${PLANS[website.plan].name}, monthly`,
                value: `${money(website.monthly)}/mo`,
              },
            ]
          : []),
      ],
      totalLabel: "Due today",
      total: "$0",
      button: "Save card",
      fine: "Nothing is charged now. The new card is used for everything from here on, and anything unpaid is tried again on it straight away.",
    };
  }

  return (
    <>
      <PageHead
        crumb='Billing'
        title={
          purpose === "setup"
            ? "Checkout"
            : purpose === "leads"
              ? "Keep the Leads Tool"
              : "Your card"
        }
        text='Secure payment by Stripe. Your card details go straight to Stripe, never to us.'
      />
      {viewingAs ? (
        <Notice tone='info'>
          You&apos;re viewing as this client, so nothing can be paid here.
        </Notice>
      ) : !publishableKey ? (
        <Notice tone='info'>
          Payments on this page aren&apos;t switched on yet.{" "}
          <a href={hosted}>Continue on Stripe&apos;s secure page</a> instead.
        </Notice>
      ) : null}
      <Checkout
        purpose={purpose}
        publishableKey={viewingAs ? "" : publishableKey}
        order={order}
        who={{
          name: client.contact.name,
          business: client.business,
          email: client.contact.email,
        }}
        hosted={hosted}
      />
    </>
  );
}
