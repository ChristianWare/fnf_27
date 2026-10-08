"use client";

// A finished audit: the score and the top three fixes, every check behind
// a button, ways to keep the report, and the next step for this score.

import { useState, type FormEvent } from "react";
import styles from "./AuditResults.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import { checkIcons, topThree, type AuditResult } from "../AuditTool/audit";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";

export default function AuditResults({ result }: { result: AuditResult }) {
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const top = topThree(result);
  const passed = result.checks.filter((check) => check.passed).length;
  const profileFailed = result.checks.some(
    (check) => check.id === "profile" && !check.passed,
  );
  const lowScore = result.score < 60;

  async function copyLink() {
    try {
      // PLACEHOLDER: this becomes the saved report's own link.
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  function sendReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // PLACEHOLDER: send the report to the email.
    if (email.trim()) setSent(true);
  }

  return (
    <section
      className={styles.container}
      id='audit-results'
      aria-labelledby='results-heading'
    >
      <div className={styles.content}>
        {/* The score on the left, the headline on the right. */}
        <div className={styles.top}>
          <div className={styles.scoreBlock}>
            <span className={styles.counter}>
              {passed}/{result.checks.length} checks passed
            </span>
            <p className={styles.score}>
              {result.score}
              <span className={styles.scoreOf}>/100</span>
            </p>
            <span className={styles.scoreLabel}>Your score</span>
          </div>

          <div className={styles.headline}>
            <EyeBrow text='Your results' />
            <h2 id='results-heading' className={styles.heading}>
              The three things costing you the most
            </h2>
            <p className={styles.copy}>
              Each one comes with a line on why it matters. Fix them in this
              order.
            </p>
            <div>
              <Button
                btnType='black'
                text={showAll ? "Hide the full list" : "See every check"}
                onClick={() => setShowAll((open) => !open)}
                arrow
              />
            </div>
          </div>
        </div>

        {/* The top three. */}
        <ol className={styles.cards}>
          {top.map((check, index) => {
            const Icon = checkIcons[check.id];
            return (
              <li className={styles.card} key={check.id}>
                <div className={styles.cardTop}>
                  {/* <Icon className={styles.cardIcon} aria-hidden='true' /> */}
                  <span className={styles.cardNumber}>0{index + 1}</span>
                </div>
                <div className={styles.cardText}>
                  <h3 className={`${styles.cardTitle} h5`}>{check.name}</h3>
                  <p className={styles.cardFound}>{check.found}</p>
                  <p className={styles.cardWhy}>{check.why}</p>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Every check, behind the button. */}
        {showAll && (
          <ul className={styles.checks} aria-label='Every check'>
            {result.checks.map((check) => {
              const Icon = checkIcons[check.id];
              return (
                <li className={styles.check} key={check.id}>
                  <span className={styles.checkIcon} aria-hidden='true'>
                    <Icon className={styles.cardIcon} />
                  </span>
                  <span className={styles.checkText}>
                    <span className={styles.checkName}>{check.name}</span>
                    <span className={styles.checkFound}>{check.found}</span>
                  </span>
                  <span
                    className={`${styles.status} ${
                      check.passed ? styles.statusPass : styles.statusFail
                    }`}
                  >
                    {check.passed ? "Passed" : "Needs work"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {/* Keep the report: the link, or the PDF by email. */}
        <div className={styles.keep}>
          <div className={styles.keepCard}>
            <span className={styles.label}>Saved report link</span>
            <p className={styles.keepText}>
              Save this link, or send it to whoever handles your website.
            </p>
            <div>
              <Button
                btnType='white'
                text={copied ? "Link copied" : "Copy link"}
                onClick={copyLink}
              />
            </div>
          </div>

          <form className={styles.keepCard} onSubmit={sendReport} noValidate>
            <span className={styles.label}>PDF by email</span>
            <p className={styles.keepText}>Get the full report as a PDF.</p>
            {sent ? (
              <p className={styles.sent} role='status'>
                Sent. Check your inbox in a minute or two.
              </p>
            ) : (
              <div className={styles.emailRow}>
                <input
                  className={styles.emailInput}
                  type='email'
                  name='email'
                  autoComplete='email'
                  placeholder='you@yourcompany.com'
                  aria-label='Email'
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <Button
                  type='submit'
                  btnType='black'
                  text='Email me the report'
                />
              </div>
            )}
            <p className={styles.emailNote}>
              I read the audits that come through and sometimes follow up
              personally to walk an operator through the results. No pitch if
              it&apos;s not a fit.
            </p>
          </form>
        </div>

        {/* The next step, by score. */}
        <div className={styles.next}>
          {lowScore ? (
            <div className={`${styles.nextCard} ${styles.nextDark}`}>
              <span className={styles.label}>Next step</span>
              <p className={styles.nextText}>
                Your site is costing you bookings. The fixes above are a good
                start. If you&apos;d rather have it rebuilt around the searches
                riders make, let&apos;s talk.
              </p>
              <div>
                <Button
                  href={CALENDAR}
                  target='_blank'
                  btnType='white'
                  text='Book a 20-minute call'
                  arrow
                />
              </div>
            </div>
          ) : (
            <div className={`${styles.nextCard} ${styles.nextDark}`}>
              <span className={styles.label}>Next step</span>
              <p className={styles.nextText}>
                Your site is in decent shape, so the faster win is more
                accounts. See the hotels, venues and events in your market.
              </p>
              <div>
                <Button
                  href='/leads'
                  btnType='white'
                  text='Get free leads in your city'
                  arrow
                />
              </div>
            </div>
          )}

          {profileFailed && (
            <div className={styles.nextCard}>
              <span className={styles.label}>Your Google Business Profile</span>
              <p className={styles.nextText}>
                Your Google Business Profile needs work. Get the free checklist:
                every field, photo and review step that moves your map ranking.
              </p>
              <div>
                <Button
                  href='/resources'
                  btnType='black'
                  text='Get the checklist'
                  arrow
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
