"use client";

// A finished audit: the score and the top three fixes, every check, the
// report link, and the next step for this score. The full report goes to
// the email from the form on its own.

import { useState } from "react";
import styles from "./AuditResults.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import { checkIcons, topThree, type AuditResult } from "../AuditTool/audit";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";

export default function AuditResults({ result }: { result: AuditResult }) {
  const [copied, setCopied] = useState(false);

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
              order. Every check is listed underneath.
            </p>
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

        {/* Every check. */}
        <div className={styles.all}>
          <span className={styles.label}>Every check</span>
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
        </div>

        {/* Keep the report: the PDF is on its way, and the link is here. */}
        <div className={styles.keep}>
          <div className={styles.keepCard}>
            <span className={styles.label}>Your report</span>
            <p className={styles.keepText}>
              The full report is on its way to {result.email} as a PDF. Save
              this link too, or send it to whoever handles your website.
            </p>
            <div className={styles.btnContainer}>
              <Button
                btnType='white'
                text={copied ? "Link copied" : "Copy link"}
                onClick={copyLink}
              />
            </div>
          </div>
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
                <div className={styles.btnContainer}>
                  <Button
                    href={CALENDAR}
                    target='_blank'
                    btnType='white'
                    text='Book a 20-minute call'
                    arrow
                  />
                </div>
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
                <div className={styles.btnContainer}>
                  <Button
                    href='/leads'
                    btnType='white'
                    text='Get free leads in your city'
                    arrow
                  />
                </div>
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
              <div className={styles.btnContainer}>
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
