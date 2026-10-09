"use client";

import Link from "next/link";
import { useState } from "react";
import Icon, { type IconName } from "../icons";
import { Pill, Progress, ui } from "../ui/ui";
import { useAction } from "../useAction";
import styles from "./LeadsTool.module.css";
import { startLeadsTrial } from "@/app/dashboard/actions";
import { fmtDate, money } from "@/lib/dashboard/format";

const features: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "bell",
    title: "Every morning",
    text: "A fresh list of the hotels, venues, offices and planners near you that book rides.",
  },
  {
    icon: "user",
    title: "The right person",
    text: "Who handles transportation at each one, and the best way to reach them.",
  },
  {
    icon: "message",
    title: "What to say",
    text: "A short opener for each lead, written for your business and your fleet.",
  },
  {
    icon: "clock",
    title: "When to follow up",
    text: "The next step for every lead, so none of them go cold.",
  },
];

export default function LeadsTool({
  trialDays,
  monthly,
  now,
}: {
  trialDays: number;
  monthly: number;
  now: string;
}) {
  const { run, pending } = useAction();
  const [ends, setEnds] = useState<string>();

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>Leads Tool</span>
          <h1 className={`h3 ${styles.title}`}>
            {ends ? "You're in" : "Find the companies that book rides"}
          </h1>
          <Pill tone={ends ? "black" : "white"} dot>
            {ends
              ? `Free trial · ${trialDays} days left`
              : `${trialDays} days free`}
          </Pill>
          <p className={styles.copy}>
            {ends
              ? `Your trial runs until ${fmtDate(ends)}. Your first leads land tomorrow morning at 6, with the decision-maker and a script for each one.`
              : `Try it free for ${trialDays} days, no card needed. If it earns its keep, it's ${money(monthly)} a month after that, billed on the 1st.`}
          </p>
        </div>
        <div className={styles.heroActions}>
          {!ends && (
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black}`}
              disabled={pending}
              onClick={() =>
                run(
                  () => startLeadsTrial(),
                  (data) => {
                    setEnds(
                      data?.trialEndsAt ??
                        new Date(
                          new Date(now).getTime() + trialDays * 86_400_000,
                        ).toISOString(),
                    );
                    return {
                      message: `Your ${trialDays}-day free trial has started`,
                      detail: "Your first leads arrive tomorrow morning.",
                    };
                  },
                )
              }
            >
              Start free trial
              <Icon name='arrow' className={ui.btnIcon} />
            </button>
          )}
          <Link
            href='/dashboard/support'
            className={`${ui.btn} ${ui.btn_white}`}
          >
            Ask a question
          </Link>
        </div>
      </section>

      {ends && (
        <section className={styles.panel}>
          <div className={styles.trialHead}>
            <div className={styles.trialText}>
              <h2 className={styles.heading}>
                {trialDays} of {trialDays} days left
              </h2>
              <p>
                Add a card anytime to keep it: the first charge covers the rest
                of that month, then {money(monthly)} on the 1st of every month.
                Nothing is charged before then.
              </p>
            </div>
            <Link
              href='/dashboard/billing#leads'
              className={`${ui.btn} ${ui.btn_light}`}
            >
              Add a card
              <Icon name='arrow' className={ui.btnIcon} />
            </Link>
          </div>
          <Progress
            value={0}
            max={trialDays}
            label='Trial days used'
            tone='purple'
          />
        </section>
      )}

      <section className={styles.features}>
        {features.map((feature) => (
          <div key={feature.title} className={styles.feature}>
            <span className={styles.featureIcon}>
              <Icon name={feature.icon} />
            </span>
            <h2 className={styles.featureTitle}>{feature.title}</h2>
            <p>{feature.text}</p>
          </div>
        ))}
      </section>
    </>
  );
}
