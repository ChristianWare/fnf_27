// The service agreement on screen, laid out like the PDF and the
// proposal: the letterhead, who it's between, the plan, the investment,
// the terms and the signatures.

import Image from "next/image";
import logo from "../../../../public/logos/fnf_logo_black.png";
import { SUPPORT_EMAIL } from "@/lib/dashboard/plans";
import { docRef, startsWhen, type AgreementBody } from "@/lib/agreements/types";
import styles from "./AgreementDoc.module.css";

const money = (amount: number) =>
  `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

const day = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Phoenix",
  }).format(new Date(iso));

const stamp = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Phoenix",
    timeZoneName: "short",
  }).format(new Date(iso));

export default function AgreementDoc({
  a,
  id,
  signedAt,
  signedBy,
  signedIp,
}: {
  a: AgreementBody;
  id: string;
  signedAt?: string;
  signedBy?: string;
  signedIp?: string;
}) {
  const who = a.parties.business || a.parties.name;
  const waived = a.fees.setup <= 0;
  const hasSetup = a.fees.setup > 0 || a.fees.listSetup > 0;
  const starts = startsWhen(a);

  return (
    <article className={styles.doc}>
      <header className={styles.letterhead}>
        <span className={styles.brand}>
          <Image src={logo} alt='' className={styles.logo} />
          Fonts &amp; Footers
        </span>
        <span className={styles.from}>
          <span>Chris Ware, Founder</span>
          <span>Phoenix, Arizona</span>
          <span>{SUPPORT_EMAIL}</span>
        </span>
      </header>

      <div className={styles.titleBlock}>
        <span className={styles.pill}>Service agreement</span>
        <h3 className={styles.title}>
          {a.service} for
          <br />
          {who}
        </h3>
      </div>

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt className={styles.mono}>Between Fonts &amp; Footers and</dt>
          <dd>
            {a.parties.name && <span>{a.parties.name}</span>}
            {a.parties.business && a.parties.business !== a.parties.name && (
              <span>{a.parties.business}</span>
            )}
            {a.parties.email && (
              <span className={styles.muted}>{a.parties.email}</span>
            )}
            {a.parties.city && (
              <span className={styles.muted}>{a.parties.city}</span>
            )}
          </dd>
        </div>
        <div className={styles.fact}>
          <dt className={styles.mono}>Date</dt>
          <dd>{day(a.date)}</dd>
        </div>
        <div className={styles.fact}>
          <dt className={styles.mono}>Agreement</dt>
          <dd>{docRef(id)}</dd>
        </div>
      </dl>

      <section className={styles.section}>
        <span className={styles.mono}>The plan</span>
        <h4 className={styles.h2}>{a.service}</h4>
        {a.summary && <p className={styles.body}>{a.summary}</p>}
        {a.included.length > 0 && (
          <>
            <span className={styles.mono}>What&apos;s included</span>
            <ul className={styles.bullets}>
              {a.included.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </>
        )}
        {a.timeline && (
          <>
            <span className={styles.mono}>Timeline</span>
            <p>{a.timeline}</p>
          </>
        )}
      </section>

      <section className={styles.section}>
        <span className={styles.mono}>Investment</span>
        <div className={styles.table}>
          <div className={styles.thead}>
            <span className={styles.mono}>Item</span>
            <span className={styles.mono}>Amount</span>
          </div>
          {hasSetup && (
            <div className={styles.trow}>
              <div>
                <span className={styles.lineTitle}>Setup</span>
                <span className={styles.lineDetail}>
                  One time: the design, build and launch.
                </span>
              </div>
              <div className={styles.amount}>
                {waived ? (
                  <>
                    {a.fees.listSetup > 0 && (
                      <s className={styles.struck}>
                        {money(a.fees.listSetup)}
                      </s>
                    )}
                    <span>$0</span>
                    <span className={styles.waived}>Waived</span>
                  </>
                ) : (
                  <span>{money(a.fees.setup)}</span>
                )}
              </div>
            </div>
          )}
          <div className={styles.trow}>
            <div>
              <span className={styles.lineTitle}>{a.service}, monthly</span>
              <span className={styles.lineDetail}>
                Charged automatically to your card on the 1st of every month,
                starting {starts}. Month to month, no long-term contract.
              </span>
            </div>
            <div className={styles.amount}>
              <span>{money(a.fees.monthly)}/mo</span>
            </div>
          </div>
        </div>
        <div className={styles.totals}>
          <div className={styles.grand}>
            <span className={styles.grandLabel}>Due to start</span>
            <span className={styles.grandValue}>{money(a.fees.setup)}</span>
          </div>
          <p className={styles.then}>
            Then {money(a.fees.monthly)} a month, starting {starts}.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <span className={styles.mono}>Terms</span>
        <ol className={styles.terms}>
          {a.terms.map((term, i) => (
            <li key={i} className={styles.term}>
              <span className={styles.num}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className={styles.termBody}>
                <span className={styles.termHead}>{term.heading}</span>
                <p>{term.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.section}>
        <span className={styles.mono}>Signatures</span>
        <div className={styles.signs}>
          <div className={styles.sign}>
            <span className={styles.mono}>Fonts &amp; Footers</span>
            <span className={styles.signName}>Chris Ware</span>
            <span className={styles.signMeta}>
              Chris Ware, Founder · {day(a.date)}
            </span>
          </div>
          <div className={styles.sign}>
            <span className={styles.mono}>{who}</span>
            <span
              className={`${styles.signName} ${signedBy ? "" : styles.unsigned}`}
            >
              {signedBy ?? "Your signature"}
            </span>
            <span className={styles.signMeta}>
              {signedBy && signedAt
                ? `${signedBy}, for ${who} · ${day(signedAt)}`
                : "Type your name below to sign"}
            </span>
          </div>
        </div>
        {signedAt && signedBy && (
          <p className={styles.record}>
            <span className={styles.mono}>Electronic signature record</span>
            Signed electronically by {signedBy}
            {a.signerEmail ? ` (${a.signerEmail})` : ""} on {stamp(signedAt)}
            {signedIp ? `, from ${signedIp}` : ""}, by typing their name and
            agreeing in the Fonts &amp; Footers client portal. Agreement{" "}
            {docRef(id)}.
          </p>
        )}
      </section>
    </article>
  );
}
