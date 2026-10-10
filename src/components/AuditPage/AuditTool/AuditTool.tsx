"use client";

// The audit page's hero and the request form under it. An operator asks
// for the free audit here; the request goes to the studio inbox
// (requestAudit), and we check the site by hand and email the audit back
// within TURNAROUND. The automatic audit, with the score on the page, comes
// later; its results view is in ../AuditResults.

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
import { cleanUrl, hostOf, TURNAROUND } from "@/lib/audit";
import { track } from "@/lib/analytics";
import { requestAudit, type AuditField } from "@/app/audit/actions";
import HeroImg from "../../../../public/images/audit.jpg";

const Turnaround = TURNAROUND[0].toUpperCase() + TURNAROUND.slice(1);

// The quick facts along the bottom of the hero's text card.
const heroFacts = [
  { label: "Price", value: "Free, no card" },
  { label: "Turnaround", value: Turnaround },
  { label: "Checked by", value: "A person, not a script" },
  { label: "Report", value: "By email, fixes ranked" },
  { label: "Checks", value: "6, on your live site" },
  { label: "Built for", value: "Black car & limo operators" },
];

// The facts beside the form.
const facts = [
  {
    id: 1,
    title: Turnaround,
    sub: "Checked by a person, not a script",
    Icon: Clock,
  },
  { id: 2, title: "Free", sub: "No payment and no card", Icon: Money },
  {
    id: 3,
    title: "The audit by email",
    sub: "Your fixes, ranked, in plain English",
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
  "Where you stand on all six checks",
  "Your top three fixes, ranked",
  "Plain English you can hand to any developer",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<{
    field?: AuditField;
    text: string;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // Counts the failed sends, so the box asks for a fresh token each time.
  const [failed, setFailed] = useState(0);

  function fail(text: string, field?: AuditField) {
    setError({ field, text });
    setFailed((n) => n + 1);
    toast("That didn't send", { tone: "error", detail: text });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!name.trim()) {
      setError({ field: "name", text: "Enter your name." });
      return;
    }
    if (!cleanUrl(website)) {
      setError({
        field: "website",
        text: "Enter your website, like www.yourcompany.com.",
      });
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError({
        field: "email",
        text: "Enter the email address to send the audit to.",
      });
      return;
    }
    setError(null);
    setSending(true);
    try {
      // Everything in the form, the hidden fields and Cloudflare's token
      // included.
      const result = await requestAudit(new FormData(form));
      if (result.ok) {
        setSent(true);
        track("Audit request");
        toast("Request sent", {
          detail: `Your audit comes to ${email.trim()} within ${TURNAROUND}.`,
        });
      } else {
        fail(result.error, result.field);
      }
    } catch {
      fail("That didn't send. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  const invalid = (field: AuditField) =>
    error?.field === field ? true : undefined;
  const site = cleanUrl(website);

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
              you online, and whether AI search can read you. We check it by
              hand and email you the fixes, ranked, within {TURNAROUND}.
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

      {/* The form card: the quick facts on the left, the form on the right. */}
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
          <div className={styles.thanks} role='status' data-reveal>
            <span className={styles.label}>Request sent</span>
            <p className={`${styles.thanksHeading} h4`}>
              Thanks, {name.trim().split(" ")[0]}.
            </p>
            <p className={styles.thanksText}>
              We&apos;ll check {site ? hostOf(site) : "your site"} and your
              Google listing by hand, and email the audit to {email.trim()}{" "}
              within {TURNAROUND}. If anything comes up before then, reply to
              that email or write to hello@fontsandfooters.com.
            </p>
          </div>
        ) : (
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
                disabled={sending}
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
                  disabled={sending}
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
                  disabled={sending}
                />
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>
                Anything we should look at? (optional)
              </span>
              <textarea
                className={`${styles.input} ${styles.textarea}`}
                name='note'
                rows={3}
                placeholder='A city you want to rank in, a page you’re unsure about, your Google listing…'
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={sending}
              />
            </label>

            <p className={styles.emailNote}>
              We&apos;ll email the audit to the address above. If you want, we
              can walk you through it on a short call. No pitch if it&apos;s not
              a fit.
            </p>

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
                text={
                  sending ? "Sending your request…" : "Request my free audit"
                }
                disabled={sending}
                arrow
              />
            </div>
            <p className={styles.note}>
              Free, and built for black car and limo operators.
            </p>
          </form>
        )}
      </section>
    </>
  );
}
