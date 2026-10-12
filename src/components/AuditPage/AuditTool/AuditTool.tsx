"use client";

// The audit page's hero and the form under it. An operator types their
// website (or their business name, if they don't have one), says which
// Google listing is theirs, and goes to their report's own page, where the
// checks come in as they finish. The score and top three are free; the
// full report goes to their email when they ask for it there.

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
import { RESULTS_IN } from "@/lib/audit";
import { track } from "@/lib/analytics";
import { pickAudit, startAudit, type StartField } from "@/app/audit/actions";
import type { Candidate } from "@/lib/audit/start";
import HeroImg from "../../../../public/images/audit.jpg";

const ResultsIn = RESULTS_IN[0].toUpperCase() + RESULTS_IN.slice(1);

// The quick facts along the bottom of the hero's text card.
const heroFacts = [
  { label: "Price", value: "Free, no card" },
  { label: "Your score", value: ResultsIn },
  { label: "Read by", value: "Me, every one" },
  { label: "Full report", value: "By email, as a PDF" },
  { label: "Checks", value: "6, on your live site" },
  { label: "Built for", value: "Black car & limo operators" },
];

// The facts beside the form.
const facts = [
  {
    id: 1,
    title: ResultsIn,
    sub: "Your score, right on the page",
    Icon: Clock,
  },
  { id: 2, title: "Free", sub: "No payment and no card", Icon: Money },
  {
    id: 3,
    title: "The full report by email",
    sub: "Every check and every fix, as a PDF",
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

type Pick = { id: string; candidates: Candidate[]; askCity: boolean };

export default function AuditTool(props: Props) {
  return (
    <ToastProvider>
      <Tool {...props} />
    </ToastProvider>
  );
}

function Tool({ siteKey, stamp }: Props) {
  const toast = useToast();
  const router = useRouter();
  const [site, setSite] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState<{
    field?: StartField;
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<Pick | null>(null);
  const [none, setNone] = useState(false);
  // Past the first step: what shows next appears as it is, with no fade-in
  // (<Reveal /> only knows the elements it found when the page loaded).
  const [moved, setMoved] = useState(false);
  // Counts the failed sends, so the box asks for a fresh token each time.
  const [failed, setFailed] = useState(0);

  function fail(text: string, field?: StartField) {
    setError({ field, text });
    setFailed((n) => n + 1);
    toast("That didn't start", { tone: "error", detail: text });
  }

  function open(id: string) {
    track("Audit run");
    router.push(`/audit/report/${id}`);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (site.trim().length < 3) {
      setError({
        field: "site",
        text: "Enter your website, or your business name.",
      });
      return;
    }
    setError(null);
    setBusy(true);
    try {
      // Everything in the form, the hidden fields and Cloudflare's token included.
      const result = await startAudit(new FormData(event.currentTarget));
      if (!result.ok) {
        fail(result.error, result.field);
        return;
      }
      if (result.next === "report") {
        open(result.id);
        return;
      }
      setMoved(true);
      setPick({
        id: result.id,
        candidates: result.candidates,
        askCity: result.askCity,
      });
      setNone(result.candidates.length === 0);
    } catch {
      fail("That didn't start. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function choose(choice: {
    placeId?: string;
    city?: string;
    notOnGoogle?: boolean;
  }) {
    if (!pick) return;
    setError(null);
    setBusy(true);
    try {
      const result = await pickAudit(pick.id, choice);
      if (!result.ok) {
        setError({ field: result.field, text: result.error });
        toast("That didn't start", { tone: "error", detail: result.error });
        return;
      }
      open(pick.id);
    } catch {
      setError({
        text: "That didn't start. Check your connection and try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  function startOver() {
    setPick(null);
    setNone(false);
    setError(null);
    setFailed((n) => n + 1);
  }

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
              you online, and whether AI search can read you. Your score comes
              back in {RESULTS_IN}, and I read every audit that comes through.
            </p>
            <div className={styles.btnContainer} data-reveal>
              <Button
                href='#audit-form'
                btnType='black'
                text='Run my free audit'
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
        aria-label='Run your free audit'
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

        {pick ? (
          <div className={styles.form}>
            <div className={styles.pickHead}>
              <span className={styles.label}>Step 2 of 2</span>
              <p className={`${styles.pickHeading} h5`}>
                {pick.candidates.length && !none
                  ? "Is this your Google listing?"
                  : "We couldn't find your Google listing"}
              </p>
              <p className={styles.pickText}>
                {pick.candidates.length && !none
                  ? "Pick yours, so the audit checks the right reviews and map results."
                  : "Enter the city you're based in, so the audit runs the searches riders make there."}
              </p>
            </div>

            {pick.candidates.length > 0 && !none && (
              <ul className={styles.candidates}>
                {pick.candidates.map((c) => (
                  <li key={c.placeId}>
                    <button
                      type='button'
                      className={styles.candidate}
                      onClick={() => choose({ placeId: c.placeId })}
                      disabled={busy}
                    >
                      <span className={styles.candidateName}>{c.name}</span>
                      {c.address && (
                        <span className={styles.candidateSub}>{c.address}</span>
                      )}
                      <span className={styles.candidateMeta}>
                        {c.rating ? `${c.rating.toFixed(1)}★ · ` : ""}
                        {c.reviews} {c.reviews === 1 ? "review" : "reviews"}
                        {c.website ? ` · ${c.website}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {none ? (
              <form
                className={styles.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  void choose({ city });
                }}
                noValidate
              >
                <label className={styles.field}>
                  <span className={styles.label}>Your city*</span>
                  <input
                    className={styles.input}
                    type='text'
                    name='city'
                    autoComplete='address-level2'
                    placeholder='Phoenix, AZ'
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    aria-invalid={error?.field === "city" ? true : undefined}
                    disabled={busy}
                  />
                </label>
                {error && (
                  <p className={styles.error} role='alert'>
                    {error.text}
                  </p>
                )}
                <div className={styles.submit}>
                  <Button
                    type='submit'
                    btnType='black'
                    text={busy ? "Starting your audit…" : "Run the audit"}
                    disabled={busy}
                    arrow
                  />
                </div>
              </form>
            ) : (
              <>
                {error && (
                  <p className={styles.error} role='alert'>
                    {error.text}
                  </p>
                )}
                <div className={styles.pickLinks}>
                  <button
                    type='button'
                    className={styles.textButton}
                    onClick={() => (pick.askCity ? setNone(true) : choose({}))}
                    disabled={busy}
                  >
                    None of these is me
                  </button>
                  <button
                    type='button'
                    className={styles.textButton}
                    onClick={() => choose({ notOnGoogle: true })}
                    disabled={busy}
                  >
                    I&apos;m not on Google Maps yet
                  </button>
                </div>
              </>
            )}
            <button
              type='button'
              className={styles.textButton}
              onClick={startOver}
              disabled={busy}
            >
              ← Start over
            </button>
          </div>
        ) : (
          <form
            className={styles.form}
            onSubmit={onSubmit}
            noValidate
            data-reveal={moved ? undefined : true}
          >
            <label className={styles.field}>
              <span className={styles.label}>Your website*</span>
              <input
                className={styles.input}
                type='text'
                name='site'
                inputMode='url'
                autoComplete='url'
                placeholder='www.yourcompany.com'
                value={site}
                onChange={(event) => setSite(event.target.value)}
                aria-invalid={error?.field === "site" ? true : undefined}
                aria-describedby='audit-site-note'
                disabled={busy}
              />
            </label>
            <p id='audit-site-note' className={styles.emailNote}>
              No website? Type your business name and city instead, like
              &ldquo;Better Line Limo, Phoenix&rdquo;.
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
                text={busy ? "Finding your business…" : "Run my free audit"}
                disabled={busy}
                arrow
              />
            </div>
            <p className={styles.note}>
              Free, and built for black car and limo operators. Your score shows
              here; the full report goes to your email if you want it.
            </p>
          </form>
        )}
      </section>
    </>
  );
}
