"use client";

// The audit page's hero and the request form under it. Operators don't run
// the audit themselves anymore: they ask for one, Chris runs it and sends
// the report within 24–48 hours. The request lands in Admin → Prospects.

import { useState, type FormEvent } from "react";
import Image from "next/image";
import styles from "./AuditTool.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import Turnstile from "@/components/shared/Turnstile/Turnstile";
import Clock from "@/components/shared/icons/Clock/Clock";
import Money from "@/components/shared/icons/Money/Money";
import Invoice from "@/components/shared/icons/Invoice/Invoice";
import Driver from "@/components/shared/icons/Driver/Driver";
import { ToastProvider, useToast } from "@/components/Dashboard/Toast/Toast";
import { STAMP_FIELD, TRAP_FIELD } from "@/lib/forms/fields";
import { track } from "@/lib/analytics";
import { requestAudit, type RequestField } from "@/app/audit/actions";
import HeroImg from "../../../../public/images/audit.jpg";

// The quick facts along the bottom of the hero's text card.
const heroFacts = [
  { label: "Price", value: "Free, no card" },
  { label: "Your report", value: "In 24–48 hours" },
  { label: "Run by", value: "Me, by hand" },
  { label: "Delivered", value: "By email, as a PDF" },
  { label: "Checks", value: "6, on your live site" },
  { label: "Built for", value: "Black car & limo operators" },
];

// The facts beside the form.
const facts = [
  {
    id: 1,
    title: "24–48 hours",
    sub: "Your report, by email",
    Icon: Clock,
  },
  { id: 2, title: "Free", sub: "No payment and no card", Icon: Money },
  {
    id: 3,
    title: "Every check, every fix",
    sub: "Ranked, with what to do first",
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
  "How you compare with the operators near you",
];

type Props = {
  /** Cloudflare's site key; without one there's no box. */
  siteKey?: string;
  /** When the page was drawn, signed by the server. */
  stamp: string;
};

export default function AuditTool(props: Props) {
  return (
    <ToastProvider>
      <Tool {...props} />
    </ToastProvider>
  );
}

function Tool({ siteKey, stamp }: Props) {
  const toast = useToast();
  const [error, setError] = useState<{
    field?: RequestField;
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  // Counts the failed sends, so the box asks for a fresh token each time.
  const [failed, setFailed] = useState(0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setBusy(true);
    try {
      const result = await requestAudit(form);
      if (!result.ok) {
        setError({ field: result.field, text: result.error });
        setFailed((n) => n + 1);
        toast("That didn't send", { tone: "error", detail: result.error });
        return;
      }
      track("Audit request");
      setSent(String(form.get("email") ?? ""));
    } catch {
      setError({ text: "That didn't send. Check your connection and try again." });
      setFailed((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  const bad = (f: RequestField) => (error?.field === f ? true : undefined);

  return (
    <>
      {/* The hero: two cards side by side, the text on the left and a photo
          on the right, like the Websites page. */}
      <section className={styles.hero} aria-labelledby='audit-heading'>
        <div className={styles.textCard}>
          <Reveal onLoad step={150} />
          <div className={styles.top}>
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
              Find out what&apos;s costing you bookings: how you show up on
              Google, how your site works on a phone, whether riders can book
              you online, and whether AI search can read you. Tell me where to
              find you, and I&apos;ll run your audit myself and send you the
              report within 24&ndash;48 hours.
            </p>
            <div className={styles.btnContainer} data-reveal>
              <Button
                href='#audit-form'
                btnType='black'
                text='Request my free audit'
                arrow
              />
              <Button
                href='#what-it-checks'
                btnType='gray'
                text='See what it checks'
              />
            </div>
          </div>

          <dl className={styles.heroFacts} data-reveal>
            {heroFacts.map((fact) => (
              <div className={styles.heroFact} key={fact.label}>
                <dt className={styles.heroFactLabel}>{fact.label}:</dt>
                <dd className={styles.heroFactValue}>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className={styles.photo}>
          <Image
            src={HeroImg}
            alt='A chauffeur in a suit checking his phone'
            fill
            sizes='(max-width: 968px) 100vw, 50vw'
            loading='eager'
            fetchPriority='high'
            className={styles.img}
          />
        </div>
      </section>

      {/* The form card: the quick facts on the left, the request on the right. */}
      <section
        className={styles.tool}
        id='audit-form'
        aria-label='Request your free audit'
      >
        <Reveal />
        <div className={styles.aside} data-reveal>
          <ul className={styles.facts}>
            {facts.map(({ id, title, sub, Icon }) => (
              <li className={styles.fact} key={id}>
                <span className={styles.factIcon} aria-hidden='true'>
                  <Icon className={styles.icon} />
                </span>
                <span className={styles.factText}>
                  <span className={`${styles.factTitle} subHeading`}>
                    {title}
                  </span>
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

        {sent ? (
          <div className={styles.thanks} role='status'>
            <span className={styles.label}>Request received</span>
            <p className={`${styles.thanksHeading} h5`}>
              Your audit is on its way
            </p>
            <p className={styles.thanksText}>
              I&apos;ll run it myself and send the report to {sent} within
              24&ndash;48 hours. A confirmation is in your inbox now; reply to
              it if there&apos;s anything you&apos;d like me to look at.
            </p>
          </div>
        ) : (
          <form className={styles.form} onSubmit={onSubmit} noValidate>
            <div className={styles.row}>
              <label className={styles.field}>
                <span className={styles.label}>Your name*</span>
                <input
                  className={styles.input}
                  type='text'
                  name='name'
                  autoComplete='name'
                  aria-invalid={bad("name")}
                  disabled={busy}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Business name*</span>
                <input
                  className={styles.input}
                  type='text'
                  name='business'
                  autoComplete='organization'
                  aria-invalid={bad("business")}
                  disabled={busy}
                />
              </label>
            </div>
            <div className={styles.row}>
              <label className={styles.field}>
                <span className={styles.label}>Email*</span>
                <input
                  className={styles.input}
                  type='email'
                  name='email'
                  autoComplete='email'
                  placeholder='you@company.com'
                  aria-invalid={bad("email")}
                  disabled={busy}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Phone</span>
                <input
                  className={styles.input}
                  type='tel'
                  name='phone'
                  autoComplete='tel'
                  placeholder='Optional'
                  disabled={busy}
                />
              </label>
            </div>
            <div className={styles.row}>
              <label className={styles.field}>
                <span className={styles.label}>Your website</span>
                <input
                  className={styles.input}
                  type='text'
                  name='site'
                  inputMode='url'
                  autoComplete='url'
                  placeholder='www.yourcompany.com'
                  aria-invalid={bad("site")}
                  disabled={busy}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>City</span>
                <input
                  className={styles.input}
                  type='text'
                  name='city'
                  autoComplete='address-level2'
                  placeholder='Phoenix, AZ'
                  aria-invalid={bad("city")}
                  disabled={busy}
                />
              </label>
            </div>
            <p className={styles.emailNote}>
              No website? Leave it blank and add your city. I&apos;ll audit
              your Google listing and where you show up in the map results.
            </p>
            <label className={styles.field}>
              <span className={styles.label}>Anything I should look at?</span>
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                name='note'
                placeholder='Optional'
                disabled={busy}
              />
            </label>

            {/* For bots only: a person never sees this field, so a value
                in it means a bot filled the form. */}
            <div className={styles.srOnly} aria-hidden='true'>
              <label>
                Leave this empty
                <input
                  type='text'
                  name={TRAP_FIELD}
                  tabIndex={-1}
                  autoComplete='off'
                  defaultValue=''
                />
              </label>
            </div>
            <input type='hidden' name={STAMP_FIELD} value={stamp} />

            <Turnstile
              siteKey={siteKey}
              resetKey={failed}
              className={styles.turnstile}
            />

            {error && (
              <p className={styles.error} role='alert'>
                {error.text}
              </p>
            )}

            <div className={styles.submit}>
              <Button
                type='submit'
                btnType='black'
                text={busy ? "Sending…" : "Request my free audit"}
                disabled={busy}
                arrow
              />
            </div>
            <p className={styles.note}>
              Free, and built for black car and limo operators. I run every
              audit myself and email you the report within 24&ndash;48 hours.
            </p>
          </form>
        )}
      </section>
    </>
  );
}
