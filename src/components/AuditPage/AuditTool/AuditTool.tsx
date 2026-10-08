"use client";

// The audit tool: the form at the top of the page, and the results that
// show under it after a run. Until the real audit is connected, a run
// returns the placeholder result in audit.ts.

import { useState, type FormEvent } from "react";
import Image from "next/image";
import styles from "./AuditTool.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import Speedometer from "@/components/shared/icons/Speedometer/Speedometer";
import Money from "@/components/shared/icons/Money/Money";
import Invoice from "@/components/shared/icons/Invoice/Invoice";
import Driver from "@/components/shared/icons/Driver/Driver";
import AuditResults from "../AuditResults/AuditResults";
import { runAudit, type AuditResult } from "./audit";
import HeroImg from "../../../../public/images/audit.jpg";

const facts = [
  {
    id: 1,
    title: "60 seconds",
    sub: "Results right here on the page",
    Icon: Speedometer,
  },
  { id: 2, title: "Free", sub: "No payment and no card", Icon: Money },
  {
    id: 3,
    title: "The full report by email",
    sub: "Sent as a PDF, automatically",
    Icon: Invoice,
  },
  {
    id: 4,
    title: "Built for operators",
    sub: "Black car and limo only",
    Icon: Driver,
  },
];

const youGet = [
  "A score out of 100",
  "Your top three fixes, ranked",
  "The full report as a PDF, in your inbox",
];

// Accepts "yourcompany.com", "www.yourcompany.com" or a full address.
function cleanUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

type Field = "name" | "website" | "email";

export default function AuditTool() {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<{ field: Field; text: string } | null>(
    null,
  );
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = cleanUrl(website);
    if (!name.trim()) {
      setError({ field: "name", text: "Enter your name." });
      return;
    }
    if (!url) {
      setError({
        field: "website",
        text: "Enter your website, like www.yourcompany.com.",
      });
      return;
    }
    if (!isEmail(email.trim())) {
      setError({
        field: "email",
        text: "Enter the email address to send the report to.",
      });
      return;
    }
    setError(null);
    setRunning(true);
    try {
      setResult(
        await runAudit({ name: name.trim(), url, email: email.trim() }),
      );
      // Bring the results into view once they've rendered.
      requestAnimationFrame(() => {
        document
          .getElementById("audit-results")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } finally {
      setRunning(false);
    }
  }

  const invalid = (field: Field) => (error?.field === field ? true : undefined);

  return (
    <>
      <section className={styles.container} aria-labelledby='audit-heading'>
        <Reveal onLoad step={150} />

        {/* The heading card, with the photo on the right. */}
        <div className={styles.intro}>
          <div className={styles.introText}>
            <EyeBrow text='Free website audit' />
            <h1
              id='audit-heading'
              className={`${styles.heading} heading2`}
              data-reveal
              data-reveal-style='fade'
            >
              Free Website Audit for Limo &amp; Black Car Companies
            </h1>
            <p className={styles.copy} data-reveal>
              See what&apos;s costing you bookings in 60 seconds: how you show
              up on Google, how your site works on a phone, whether riders can
              book you online, and whether AI search can read you.
            </p>
          </div>

          <div className={styles.photo} data-reveal>
            <Image
              src={HeroImg}
              alt='A chauffeur in a suit checking his phone'
              fill
              sizes='(max-width: 968px) 100vw, 38rem'
              loading='eager'
              fetchPriority='high'
              className={styles.img}
            />
            <span className={styles.mark} aria-hidden='true'>
              0~100
            </span>
          </div>
        </div>

        {/* The form card: the quick facts on the left, the form on the right. */}
        <div className={styles.tool}>
          <div className={styles.aside} data-reveal>
            <ul className={styles.facts}>
              {facts.map(({ id, title, sub, Icon }) => (
                <li className={styles.fact} key={id}>
                  <span className={styles.factIcon} aria-hidden='true'>
                    <Icon className={styles.icon} />
                  </span>
                  <span className={styles.factText}>
                    <span className={styles.factTitle}>{title}</span>
                    <span className={styles.factSub}>{sub}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className={styles.youGet}>
              <span className={styles.label}>What you get</span>
              <ul className={styles.youGetList}>
                {youGet.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <form
            className={styles.form}
            onSubmit={onSubmit}
            noValidate
            data-reveal
          >
            <label className={styles.field}>
              <span className={styles.label}>Full name*</span>
              <input
                className={styles.input}
                type='text'
                name='name'
                autoComplete='name'
                placeholder='Enter your name'
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={invalid("name")}
                disabled={running}
              />
            </label>

            <div className={styles.row}>
              <label className={styles.field}>
                <span className={styles.label}>Your website*</span>
                <input
                  className={styles.input}
                  type='text'
                  name='website'
                  inputMode='url'
                  autoComplete='url'
                  placeholder='www.yourcompany.com'
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  aria-invalid={invalid("website")}
                  disabled={running}
                />
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Email address*</span>
                <input
                  className={styles.input}
                  type='email'
                  name='email'
                  inputMode='email'
                  autoComplete='email'
                  placeholder='you@yourcompany.com'
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={invalid("email")}
                  aria-describedby='audit-email-note'
                  disabled={running}
                />
              </label>
            </div>

            <p id='audit-email-note' className={styles.emailNote}>
              The full report goes to this address as a PDF. I read the audits
              that come through and sometimes follow up personally to walk an
              operator through the results. No pitch if it&apos;s not a fit.
            </p>

            {error && (
              <p className={styles.error} role='alert'>
                {error.text}
              </p>
            )}

            <div className={styles.submit}>
              <Button
                type='submit'
                btnType='black'
                text={running ? "Running your audit…" : "Run my free audit"}
                disabled={running}
                arrow
              />
            </div>
            <p className={styles.note}>
              Free, and built for black car and limo operators.
            </p>
          </form>
        </div>
      </section>

      {result && <AuditResults result={result} />}
    </>
  );
}
