"use client";

// The list prices new clients see. Current clients keep the rate they
// signed up at; change one client's rate on their Billing tab. SAMPLE:
// saving shows the toast; after the move it saves the prices and the
// pricing page reads them.

import { useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { ui } from "@/components/Dashboard/ui/ui";
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

type Values = Record<PlanPrice["id"], { monthly: string; extra: string }>;

const toValues = (plans: PlanPrice[]) =>
  Object.fromEntries(
    plans.map((p) => [
      p.id,
      {
        monthly: String(p.monthly),
        extra: String(p.setup ?? p.trialDays ?? ""),
      },
    ]),
  ) as Values;

const digits = (value: string) => value.replace(/[^\d.]/g, "");

export default function Prices({ plans }: { plans: PlanPrice[] }) {
  const toast = useToast();
  const [saved, setSaved] = useState(() => toValues(plans));
  const [values, setValues] = useState(saved);

  const changed = plans.filter(
    (p) =>
      values[p.id].monthly !== saved[p.id].monthly ||
      values[p.id].extra !== saved[p.id].extra,
  );
  const invalid = plans.some(
    (p) => !Number(values[p.id].monthly) || values[p.id].extra === "",
  );

  const set = (id: PlanPrice["id"], key: "monthly" | "extra", value: string) =>
    setValues((v) => ({ ...v, [id]: { ...v[id], [key]: digits(value) } }));

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div className={styles.titles}>
          <h2 className={styles.heading}>Plans and prices</h2>
          <p>
            What new clients see and pay. Everyone already signed up keeps their
            rate.
          </p>
        </div>
        {changed.length > 0 && (
          <div className={styles.saveBar}>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
              onClick={() => setValues(saved)}
            >
              Undo
            </button>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              disabled={invalid}
              onClick={() => {
                setSaved(values);
                toast("Prices saved", {
                  detail: `${changed.map((p) => p.name).join(", ")}: new sign-ups see ${changed.length === 1 ? "it" : "them"} right away. Current clients keep their rates.`,
                });
              }}
            >
              Save prices
              <Icon name='check' className={ui.btnIcon} />
            </button>
          </div>
        )}
      </div>

      <div className={styles.plans}>
        {plans.map((plan) => {
          const v = values[plan.id];
          const leads = plan.id === "LEADS";
          return (
            <article
              key={plan.id}
              className={`${styles.plan} ${styles[`plan_${plan.id}`]}`}
            >
              <div className={styles.planTop}>
                <h3 className={styles.planName}>{plan.name}</h3>
                <span className={styles.planPrice}>
                  {money(Number(v.monthly) || 0)}
                  <span>/mo</span>
                </span>
              </div>
              <p className={styles.planBlurb}>{plan.blurb}</p>

              <div className={styles.planFields}>
                <label className={ui.field}>
                  <span className={`${ui.label} ${styles.planLabel}`}>
                    Monthly
                  </span>
                  <span className={styles.money}>
                    <span aria-hidden='true'>$</span>
                    <input
                      className={ui.input}
                      inputMode='decimal'
                      value={v.monthly}
                      onChange={(e) => set(plan.id, "monthly", e.target.value)}
                    />
                  </span>
                </label>
                <label className={ui.field}>
                  <span className={`${ui.label} ${styles.planLabel}`}>
                    {leads ? "Free trial" : "Setup fee"}
                  </span>
                  {leads ? (
                    <span className={styles.days}>
                      <input
                        className={ui.input}
                        inputMode='numeric'
                        value={v.extra}
                        onChange={(e) => set(plan.id, "extra", e.target.value)}
                      />
                      <span aria-hidden='true'>days</span>
                    </span>
                  ) : (
                    <span className={styles.money}>
                      <span aria-hidden='true'>$</span>
                      <input
                        className={ui.input}
                        inputMode='decimal'
                        value={v.extra}
                        onChange={(e) => set(plan.id, "extra", e.target.value)}
                      />
                    </span>
                  )}
                </label>
              </div>

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
