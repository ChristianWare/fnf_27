import type { Metadata } from "next";
import Billing from "@/components/Dashboard/Billing/Billing";
import { Notice, PageHead } from "@/components/Dashboard/ui/ui";
import { getDashboard, isLive, leadsAccess } from "@/lib/dashboard";
import { LEADS, PLANS } from "@/lib/dashboard/plans";

export const metadata: Metadata = { title: "Billing" };

const BACK: Record<string, { tone: "good" | "info"; text: string }> = {
  setup: {
    tone: "good",
    text: "Setup fee paid. Thank you! Your receipt is on its way by email, and monthly billing starts on the 1st.",
  },
  card: { tone: "good", text: "Card saved. We'll use it from now on." },
  pending: {
    tone: "info",
    text: "Stripe is confirming your payment. This page catches up in a minute.",
  },
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  const { client, now } = await getDashboard();
  const website = client.website;
  const { done, error } = await searchParams;
  const back = done ? BACK[done] : undefined;

  return (
    <>
      <PageHead
        crumb='Account'
        title='Billing'
        text='Your plan, your card and your invoices. Month to month, no contracts, no per-booking fees.'
      />
      {back && <Notice tone={back.tone}>{back.text}</Notice>}
      {error && (
        <Notice tone='bad'>
          {error === "view-as"
            ? "You're viewing as this client, so billing can't be changed here."
            : error}
        </Notice>
      )}
      <Billing
        plan={
          website && {
            id: website.plan,
            name: PLANS[website.plan].name,
            monthly: website.monthly,
            setupFee: website.setupFee,
            setupPaidAt: website.facts.setupFeePaidAt,
            nextBillingAt: website.nextBillingAt,
            live: isLive(client),
            status: website.status,
            agreementSigned: Boolean(website.facts.agreementSignedAt),
            upgradeRequested: Boolean(website.facts.upgradeRequestedAt),
          }
        }
        upgrade={{
          name: PLANS.FULL_PLATFORM.name,
          monthly: PLANS.FULL_PLATFORM.monthly,
        }}
        leads={{
          access: leadsAccess(client),
          monthly: LEADS.monthly,
          trialDays: LEADS.trialDays,
          trialEndsAt: client.leads.trialEndsAt,
        }}
        card={client.card}
        invoices={client.invoices}
        now={now}
      />
    </>
  );
}
