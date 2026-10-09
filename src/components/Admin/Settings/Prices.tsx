// The list prices new clients see, the same as the pricing page. They're
// set in the code (src/lib/dashboard/plans.ts) so the two always match.
// One client's own rate is set on their Billing tab.

import { money } from "@/lib/dashboard/format";
import styles from "./Settings.module.css";

export type PlanPrice = {
  id: "FULL_PLATFORM" | "WEBSITE_ONLY" | "LEADS";
  name: string;
  blurb: string;
  monthly: number;
  setup?: number;
  trialDays?: number;
  /** Clients on this plan, and how many pay their own rate. */
  clients: number;
  custom: number;
};

export default function Prices({ plans }: { plans: PlanPrice[] }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div className={styles.titles}>
          <h2 className={styles.heading}>Plans and prices</h2>
          <p>
            What new clients see and pay, the same as the pricing page. To give
            one client their own rate, open their Billing tab.
          </p>
        </div>
      </div>

      <div className={styles.plans}>
        {plans.map((plan) => {
          const leads = plan.id === "LEADS";
          return (
            <article
              key={plan.id}
              className={`${styles.plan} ${styles[`plan_${plan.id}`]}`}
            >
              <div className={styles.planTop}>
                <h3 className={styles.planName}>{plan.name}</h3>
                <span className={styles.planPrice}>
                  {money(plan.monthly)}
                  <span>/mo</span>
                </span>
              </div>
              <p className={styles.planBlurb}>{plan.blurb}</p>

              <dl className={styles.planFields}>
                <div className={styles.planFact}>
                  <dt className={`${styles.planLabel}`}>Monthly</dt>
                  <dd>{money(plan.monthly)}</dd>
                </div>
                <div className={styles.planFact}>
                  <dt className={`${styles.planLabel}`}>
                    {leads ? "Free trial" : "Setup fee"}
                  </dt>
                  <dd>
                    {leads ? `${plan.trialDays} days` : money(plan.setup ?? 0)}
                  </dd>
                </div>
              </dl>

              <span className={styles.planFoot}>
                {plan.clients} client{plan.clients === 1 ? "" : "s"}
                {plan.custom ? ` · ${plan.custom} on their own rate` : ""}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
