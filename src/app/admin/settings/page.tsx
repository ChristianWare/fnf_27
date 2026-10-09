import type { Metadata } from "next";
import Prices, { type PlanPrice } from "@/components/Admin/Settings/Prices";
import Notifications from "@/components/Admin/Settings/Notifications";
import { FinePrint, HowBilling } from "@/components/Admin/Settings/HowBilling";
import styles from "@/components/Admin/Settings/Settings.module.css";
import { PageHead } from "@/components/Dashboard/ui/ui";
import { getAdmin } from "@/lib/admin";
import { LEADS, PLANS } from "@/lib/dashboard/plans";

export const metadata: Metadata = { title: "Plans and billing" };

export default async function SettingsPage() {
  const { user, clients, now } = await getAdmin();

  const on = (id: PlanPrice["id"]) =>
    id === "LEADS"
      ? clients.filter(
          (c) =>
            c.leads.status === "ACTIVE" && c.website?.plan !== "FULL_PLATFORM",
        )
      : clients.filter((c) => c.website?.plan === id);

  const plans: PlanPrice[] = [
    ...(["FULL_PLATFORM", "WEBSITE_ONLY"] as const).map((id) => ({
      id,
      name: PLANS[id].name,
      blurb: PLANS[id].blurb,
      monthly: PLANS[id].monthly,
      setup: PLANS[id].setup,
      clients: on(id).length,
      custom: on(id).filter((c) => c.website!.monthly !== PLANS[id].monthly)
        .length,
    })),
    {
      id: "LEADS",
      name: LEADS.name,
      blurb: "Fresh leads every morning. Free for 30 days, no card.",
      monthly: LEADS.monthly,
      trialDays: LEADS.trialDays,
      clients: on("LEADS").length,
      custom: 0,
    },
  ];

  return (
    <>
      <PageHead
        crumb='Settings'
        title='Plans and billing'
        text='Your prices, and exactly how billing runs. To change one client’s rate, open their Billing tab.'
      />
      <Prices plans={plans} />
      <HowBilling
        now={now}
        setupFee={PLANS.FULL_PLATFORM.setup}
        monthly={PLANS.FULL_PLATFORM.monthly}
        leadsMonthly={LEADS.monthly}
        trialDays={LEADS.trialDays}
      />
      <div className={styles.grid}>
        <FinePrint trialDays={LEADS.trialDays} />
        <Notifications email={user.email} />
      </div>
    </>
  );
}
