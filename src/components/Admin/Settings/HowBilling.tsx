// How billing runs, worked out from today with the current prices, and the
// rules in one list. Built on the same helpers that make the invoices, so
// what this page says is what Stripe does.

import type { CSSProperties } from "react";
import Icon from "@/components/Dashboard/icons";
import {
  firstOfMonth,
  lastDayOf,
  nextFirst,
  prorate,
} from "@/lib/dashboard/billing";
import { fmtShort, money } from "@/lib/dashboard/format";
import styles from "./Settings.module.css";

const DAY = 86_400_000;

type Step = {
  when: string;
  amount: string;
  title: string;
  text: string;
  tone: "lime" | "black" | "purple" | "free" | "white";
};

function Timeline({
  title,
  note,
  steps,
}: {
  title: string;
  note: string;
  steps: Step[];
}) {
  return (
    <div className={styles.timeline}>
      <div className={styles.timelineHead}>
        <h3 className={styles.timelineTitle}>{title}</h3>
        <p>{note}</p>
      </div>
      <ol
        className={styles.steps}
        style={{ "--steps": steps.length } as CSSProperties}
      >
        {steps.map((step, i) => (
          <li
            key={step.title}
            className={`${styles.step} ${styles[`step_${step.tone}`]}`}
          >
            <span className={styles.stepWhen}>
              <span className={styles.stepNum}>{i + 1}</span>
              {step.when}
            </span>
            <span className={styles.stepAmount}>{step.amount}</span>
            <span className={styles.stepTitle}>{step.title}</span>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function HowBilling({
  now,
  setupFee,
  monthly,
  leadsMonthly,
  trialDays,
}: {
  now: string;
  setupFee: number;
  monthly: number;
  leadsMonthly: number;
  trialDays: number;
}) {
  // A website plan whose setup fee is paid today.
  const first = nextFirst(now);
  const freeUntil = lastDayOf(firstOfMonth(now));
  const tomorrow = new Date(new Date(now).getTime() + DAY).toISOString();
  // Paid on the last day of a month, there are no free days.
  const freeDays = fmtShort(tomorrow) !== fmtShort(first);

  // A Leads Tool trial that starts today.
  const trialEnds = new Date(
    new Date(now).getTime() + trialDays * DAY,
  ).toISOString();
  const restOfMonth = lastDayOf(firstOfMonth(trialEnds));
  const leadsFirst = nextFirst(trialEnds);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div className={styles.titles}>
          <h2 className={styles.heading}>How billing runs</h2>
          <p>Worked out from today, with your current prices.</p>
        </div>
        <span className={styles.azChip}>
          <Icon name='clock' />
          The 1st, midnight Arizona
        </span>
      </div>

      <Timeline
        title='Website plans'
        note='Say a client pays their setup fee today.'
        steps={[
          {
            when: fmtShort(now),
            amount: money(setupFee),
            title: "Setup fee",
            text: "Paid up front. The only thing that is.",
            tone: "lime",
          },
          ...(freeDays
            ? [
                {
                  when: `${fmtShort(tomorrow)} – ${fmtShort(freeUntil)}`,
                  amount: "Free",
                  title: "Until the 1st",
                  text: "The days before the first charge cost nothing.",
                  tone: "free" as const,
                },
              ]
            : []),
          {
            when: fmtShort(first),
            amount: money(monthly),
            title: "First monthly charge",
            text: "On the 1st after the setup fee.",
            tone: "black",
          },
          {
            when: "Every 1st",
            amount: money(monthly),
            title: "Then every month",
            text: "With a branded invoice by email each time.",
            tone: "white",
          },
        ]}
      />

      <Timeline
        title='Leads Tool'
        note='Say a client starts a free trial today.'
        steps={[
          {
            when: fmtShort(now),
            amount: "Free",
            title: `${trialDays}-day trial`,
            text: "No card needed to start.",
            tone: "purple",
          },
          {
            when: `${fmtShort(trialEnds)} – ${fmtShort(restOfMonth)}`,
            amount: money(prorate(leadsMonthly, trialEnds)),
            title: "The rest of that month",
            text: "If they add a card, prorated from when the trial ends.",
            tone: "white",
          },
          {
            when: fmtShort(leadsFirst),
            amount: money(leadsMonthly),
            title: "Then every 1st",
            text: "Full price, the same day as everyone else.",
            tone: "black",
          },
        ]}
      />
    </section>
  );
}

export function FinePrint({ trialDays }: { trialDays: number }) {
  const rules = [
    [
      "Billing day",
      "The 1st of every month, at midnight Arizona time (UTC-7 all year).",
    ],
    [
      "Setup fee",
      "Paid up front, before work starts. Not refundable once work has begun.",
    ],
    [
      "First month",
      "Charged on the 1st after the setup fee. The days in between are free.",
    ],
    [
      "Leads Tool",
      `${trialDays} days free, no card. Keep it and the first charge covers the rest of that month, then the 1st.`,
    ],
    ["Full Platform", "The Leads Tool is built in. No separate charge."],
    ["Rate changes", "Start on the next 1st. Nothing is prorated."],
    [
      "Cancelling",
      "Anytime, by email or from their dashboard. It takes effect at the end of that month.",
    ],
    [
      "Failed payments",
      "Stripe retries on its own. The client sees a notice, and it goes to the top of your Today.",
    ],
    ["Invoices", "Numbered in order and never reused, as a branded PDF."],
  ];
  return (
    <section className={styles.panel}>
      <div className={styles.titles}>
        <h2 className={styles.heading}>The fine print</h2>
        <p>The same rules as the service agreement clients sign.</p>
      </div>
      <dl className={styles.rules}>
        {rules.map(([term, text]) => (
          <div key={term} className={styles.rule}>
            <dt>{term}</dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
