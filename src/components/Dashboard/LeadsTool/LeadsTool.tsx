"use client";

import Link from "next/link";
import { useState } from "react";
import Icon, { type IconName } from "../icons";
import { Pill, Progress, ui } from "../ui/ui";
import { useToast } from "../Toast/Toast";
import styles from "./LeadsTool.module.css";
import { fmtDate, money } from "@/lib/dashboard/format";
import type { LeadsAccess } from "@/lib/dashboard";

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
  access,
  trialDays,
  trialEndsAt,
  monthly,
  toolUrl,
  now,
}: {
  access: LeadsAccess;
  trialDays: number;
  trialEndsAt?: string;
  monthly: number;
  toolUrl: string;
  now: string;
}) {
  const toast = useToast();
  const [state, setState] = useState(access);
  const [ends, setEnds] = useState(trialEndsAt);

  const daysLeft = ends
    ? Math.max(
        0,
        Math.ceil(
          (new Date(ends).getTime() - new Date(now).getTime()) / 86_400_000,
        ),
      )
    : trialDays;

  const pill =
    state === "INCLUDED"
      ? { text: "Included in Full Platform", tone: "black" as const }
      : state === "TRIAL"
        ? { text: `Free trial · ${daysLeft} days left`, tone: "black" as const }
        : state === "ACTIVE"
          ? { text: "Active", tone: "black" as const }
          : { text: `${trialDays} days free`, tone: "white" as const };

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>Leads Tool</span>
          <h1 className={`h3 ${styles.title}`}>
            {state === "NONE"
              ? "Find the companies that book rides"
              : "Your Leads Tool"}
          </h1>
          <Pill tone={pill.tone} dot>
            {pill.text}
          </Pill>
          <p className={styles.copy}>
            {state === "NONE"
              ? `Try it free for ${trialDays} days, no card needed. If it earns its keep, it's ${money(monthly)} a month after that.`
              : "The Leads Tool is moving into this dashboard. Until it lands here, it runs on the current site with the same account and the same leads."}
          </p>
        </div>
        <div className={styles.heroActions}>
          {state === "NONE" ? (
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black}`}
              onClick={() => {
                setState("TRIAL");
                setEnds(
                  new Date(
                    new Date(now).getTime() + trialDays * 86_400_000,
                  ).toISOString(),
                );
                toast(`Your ${trialDays}-day free trial has started`, {
                  detail: "Your first leads arrive tomorrow morning.",
                });
              }}
            >
              Start free trial
              <Icon name='arrow' className={ui.btnIcon} />
            </button>
          ) : (
            <a
              href={toolUrl}
              target='_blank'
              rel='noopener noreferrer'
              className={`${ui.btn} ${ui.btn_black}`}
            >
              Open Leads Tool
              <Icon name='arrowUpRight' className={ui.btnIcon} />
            </a>
          )}
          <Link
            href='/dashboard/support'
            className={`${ui.btn} ${ui.btn_white}`}
          >
            Ask a question
          </Link>
        </div>
      </section>

      {state === "TRIAL" && (
        <section className={styles.panel}>
          <div className={styles.trialHead}>
            <div className={styles.trialText}>
              <h2 className={styles.heading}>
                {daysLeft} of {trialDays} days left
              </h2>
              <p>
                Your trial ends {ends ? fmtDate(ends) : "soon"}. Add a card
                anytime to keep it for {money(monthly)} a month; nothing is
                charged before then.
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
            value={trialDays - daysLeft}
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
