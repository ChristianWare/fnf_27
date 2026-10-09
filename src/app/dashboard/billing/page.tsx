import type { Metadata } from "next";
import Billing from "@/components/Dashboard/Billing/Billing";
import { PageHead } from "@/components/Dashboard/ui/ui";
import { getDashboard, isLive, leadsAccess } from "@/lib/dashboard";
import { LEADS, PLANS } from "@/lib/dashboard/plans";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const { client, now } = await getDashboard();
  const website = client.website;

  return (
    <>
      <PageHead
        crumb='Account'
        title='Billing'
        text='Your plan, your card and your invoices. Month to month, no contracts, no per-booking fees.'
      />
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
