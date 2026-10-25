// A report's page: the checks coming in while it runs, then the score, the
// three things costing the most and the six checks' scores. Until they give
// an email the details stay locked; after, every part of every check shows,
// with what it was based on, the searches, the operators near them and
// their homepage on a phone. The same view for admins, always unlocked.

import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import { checkIcons } from "../checkIcons";
import { CALL_BELOW, CHECKS } from "@/lib/audit/kinds";
import { fmtDate } from "@/lib/dashboard/format";
import type { AuditView, CheckResult, Part } from "@/lib/audit/types";
import Progress from "./Progress";
import FullReportForm from "./FullReportForm";
import CopyLink from "./CopyLink";
import SemrushDeepDive from "../SemrushDeepDive/SemrushDeepDive";
import styles from "./AuditReport.module.css";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";

const STATE: Record<Part["state"], { label: string; className: string }> = {
  good: { label: "Good", className: styles.good },
  partial: { label: "Needs work", className: styles.partial },
  missing: { label: "Fix this", className: styles.missing },
  unknown: { label: "Couldn't tell", className: styles.unknown },
};

/** A check whose one part only repeats it (no website, no listing). */
const echo = (r: CheckResult) =>
  r.parts.length === 1 && r.parts[0].found === r.found;

function status(result?: CheckResult) {
  if (!result || result.score === null)
    return { label: "Not checked", className: styles.unknown };
  if (result.score >= 80) return { label: "Good", className: styles.good };
  if (result.score >= 50)
    return { label: "Needs work", className: styles.partial };
  return { label: "Costing you", className: styles.missing };
}

type Props = {
  view: AuditView;
  /** For the full-report form's hidden stamp. */
  stamp: string;
  /** Shown inside the admin: no forms, no next step. */
  admin?: boolean;
};

export default function AuditReport({ view, stamp, admin }: Props) {
  if (view.status === "QUEUED" || view.status === "RUNNING")
    return <Running view={view} admin={admin} />;
  if (view.status === "FAILED") return <Failed view={view} admin={admin} />;
  return <Done view={view} stamp={stamp} admin={admin} />;
}

const box = (admin?: boolean) =>
  `${styles.container} ${admin ? styles.inAdmin : ""}`;

function Running({ view, admin }: { view: AuditView; admin?: boolean }) {
  return (
    <section className={box(admin)} aria-labelledby='report-heading'>
      <div className={styles.content}>
        <div className={styles.runHead}>
          <EyeBrow text='Running your audit' />
          <h1 id='report-heading' className={styles.heading}>
            {view.business}
          </h1>
          <p className={styles.copy}>
            It takes about a minute. Leave this page open, or come back to this
            link later: the report stays here.
          </p>
        </div>
        <Progress
          id={view.id}
          steps={view.steps}
          checks={view.checks.map((c) => ({ id: c.id, name: c.name }))}
        />
      </div>
    </section>
  );
}

function Failed({ view, admin }: { view: AuditView; admin?: boolean }) {
  return (
    <section className={box(admin)} aria-labelledby='report-heading'>
      <div className={styles.runHead}>
        <EyeBrow text='Your audit' />
        <h1 id='report-heading' className={styles.heading}>
          We couldn&apos;t finish this one
        </h1>
        <p className={styles.copy}>
          Something stopped the audit for {view.domain ?? view.business} before
          it finished{admin && view.error ? `: ${view.error}` : "."} Run it
          again, or email hello@fontsandfooters.com and I&apos;ll run it for
          you.
        </p>
        {!admin && (
          <div className={styles.btnRow}>
            <Button
              href='/audit#audit-form'
              btnType='black'
              text='Run it again'
              arrow
            />
          </div>
        )}
      </div>
    </section>
  );
}

function Done({ view, stamp, admin }: Props) {
  const score = view.score ?? 0;
  const low = score < CALL_BELOW;
  const date = fmtDate(view.finishedAt ?? view.createdAt);

  return (
    <section
      className={box(admin)}
      id='audit-results'
      aria-labelledby='report-heading'
    >
      <div className={styles.content}>
        {/* The score on the left, the headline on the right. */}
        <div className={styles.top}>
          <div className={styles.scoreBlock}>
            {view.band && (
              <span
                className={`${styles.band} ${styles[`band_${view.band.tone}`]}`}
              >
                {view.band.label}
              </span>
            )}
            <p className={styles.score}>
              {view.score ?? "–"}
              <span className={styles.scoreOf}>/100</span>
            </p>
            <span className={styles.scoreLabel}>
              {view.sample ? "Their score" : "Your score"}
            </span>
          </div>

          <div className={styles.headline}>
            <EyeBrow text={view.sample ? "Sample report" : "Your results"} />
            <h1 id='report-heading' className={styles.heading}>
              {view.business}
            </h1>
            <p className={styles.copy}>{view.summary}</p>
            <p className={styles.meta}>
              {[view.domain, view.place, `Checked ${date}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>

        {/* The top three. */}
        {view.top.length > 0 && (
          <div className={styles.block}>
            <h2 className={styles.subhead}>
              The three things costing you the most
            </h2>
            <ol className={styles.cards}>
              {view.top.map((item, index) => (
                <li className={styles.card} key={item.id}>
                  <div className={styles.cardTop}>
                    <span className={styles.cardNumber}>0{index + 1}</span>
                    <span className={styles.cardTag}>
                      {CHECKS[item.id].tag}
                    </span>
                  </div>
                  <div className={styles.cardText}>
                    <h3 className={`${styles.cardTitle} h5`}>{item.name}</h3>
                    <p className={styles.cardFound}>{item.found}</p>
                    <p className={styles.cardWhy}>{item.why}</p>
                    {item.fix && (
                      <p className={styles.cardFix}>
                        <span className={styles.label}>The fix</span>
                        {item.fix}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Every check, with its score. */}
        <div className={styles.all}>
          <span className={styles.label}>Every check</span>
          <ul className={styles.checks} aria-label='Every check'>
            {view.checks.map((check) => {
              const Icon = checkIcons[check.id];
              const s = status(check.result);
              return (
                <li className={styles.check} key={check.id}>
                  <span className={styles.checkIcon} aria-hidden='true'>
                    <Icon className={styles.cardIcon} />
                  </span>
                  <span className={styles.checkText}>
                    <span className={styles.checkName}>{check.name}</span>
                    <span className={styles.checkFound}>
                      {check.result?.found}
                    </span>
                  </span>
                  <span className={styles.checkEnd}>
                    <span className={styles.checkScore}>
                      {check.result?.score ?? "–"}
                    </span>
                    <span className={`${styles.status} ${s.className}`}>
                      {s.label}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {view.unlocked ? (
          <Details view={view} />
        ) : (
          <FullReportForm id={view.id} stamp={stamp} hasSite={view.hasSite} />
        )}

        {/* Keep the report: its link, and the PDF once it's unlocked. */}
        {!view.sample && (
          <div className={styles.keep}>
            <div className={styles.keepCard}>
              <span className={styles.label}>Your report</span>
              <p className={styles.keepText}>
                This page is your report&apos;s own link. Save it, or send it to
                whoever handles your {view.hasSite ? "website" : "marketing"}.
              </p>
              <div className={styles.btnRow}>
                <CopyLink path={`/audit/report/${view.id}`} />
                {view.unlocked && (
                  <a
                    className={styles.pdfLink}
                    href={`/audit/report/${view.id}/pdf`}
                  >
                    Download the PDF
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* The next step, by score. */}
        {!admin && (
          <div className={styles.next}>
            <div className={`${styles.nextCard} ${styles.nextDark}`}>
              <span className={styles.label}>Next step</span>
              <p className={styles.nextText}>
                {!view.hasSite
                  ? "Your Google listing is doing all the work on its own. If you'd like a website built around the searches riders make, with online booking, let's talk: 20 minutes, and no pitch if it's not a fit."
                  : low
                    ? "This site is costing you bookings. The fixes above are a good start. If you'd rather have it rebuilt around the searches riders make, let's talk: 20 minutes, and no pitch if it's not a fit."
                    : "Your site is in decent shape, so the faster win is more accounts. See the hotels, venues and events in your market, with who to ask for."}
              </p>
              <div className={styles.btnRow}>
                {low || !view.hasSite ? (
                  <Button
                    href={CALENDAR}
                    target='_blank'
                    btnType='white'
                    text='Book a 20-minute call'
                    arrow
                  />
                ) : (
                  <Button
                    href='/register?plan=leads'
                    btnType='white'
                    text='Get free leads in your city'
                    arrow
                  />
                )}
              </div>
            </div>
          </div>
        )}

        <p className={styles.method}>
          {view.hasSite ? (
            <>
              How this was checked: your live site as its server sends it,
              Google&apos;s own speed test on a phone, your Google Business
              Profile, Google&apos;s results for the searches riders make
              {view.place ? ` in ${view.place}` : ""}, and an AI reading your
              pages the way an assistant would (it only counts what it can
              quote).
            </>
          ) : (
            <>
              How this was checked: your Google Business Profile, the operators
              near you, and Google&apos;s results for the searches riders make
              {view.place ? ` in ${view.place}` : ""}. With no website, the four
              website checks score zero.
            </>
          )}{" "}
          Searches a month are Google&apos;s estimates. Something look wrong?
          Email hello@fontsandfooters.com and I&apos;ll take a look.
        </p>
      </div>
    </section>
  );
}

function Details({ view }: { view: AuditView }) {
  return (
    <div className={styles.details}>
      <h2 className={styles.subhead}>The full report</h2>
      {view.checks.map((check) => {
        const r = check.result;
        if (!r) return null;
        const Icon = checkIcons[check.id];
        const s = status(r);
        return (
          <article
            className={styles.detail}
            key={check.id}
            id={`check-${check.id}`}
          >
            <header className={styles.detailHead}>
              <span className={styles.checkIcon} aria-hidden='true'>
                <Icon className={styles.cardIcon} />
              </span>
              <h3 className={`${styles.detailTitle} h5`}>{check.name}</h3>
              <span className={styles.checkEnd}>
                <span className={styles.checkScore}>{r.score ?? "–"}</span>
                <span className={`${styles.status} ${s.className}`}>
                  {s.label}
                </span>
              </span>
            </header>
            <p className={styles.detailFound}>{r.found}</p>
            <p className={styles.detailWhy}>{CHECKS[check.id].why}</p>
            {r.fix && (
              <div className={styles.fix}>
                <span className={styles.label}>The fix</span>
                <p>{r.fix}</p>
              </div>
            )}
            {r.parts.length > 0 && !echo(r) && (
              <ul className={styles.parts}>
                {r.parts.map((p) => (
                  <li className={styles.part} key={p.id}>
                    <span
                      className={`${styles.status} ${STATE[p.state].className}`}
                    >
                      {STATE[p.state].label}
                    </span>
                    <div className={styles.partBody}>
                      <span className={styles.partLabel}>{p.label}</span>
                      <p className={styles.partFound}>{p.found}</p>
                      {p.quote && (
                        <blockquote className={styles.quote}>
                          “{p.quote}”
                        </blockquote>
                      )}
                      {p.proof && p.proof.length > 0 && (
                        <ul className={styles.proof}>
                          {p.proof.map((x, i) => (
                            <li key={i}>
                              {x.href ? (
                                <a
                                  href={x.href}
                                  target='_blank'
                                  rel='noopener noreferrer nofollow'
                                >
                                  {x.label}
                                </a>
                              ) : (
                                x.label
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {r.notes && r.notes.length > 0 && (
              <ul className={styles.notes}>
                {r.notes.map((n, i) => (
                  <li key={i}>
                    <span className={styles.label}>Worth a look</span> {n}
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}

      {view.searches.length > 0 && (
        <div className={styles.tableCard}>
          <h3 className={`${styles.detailTitle} h5`}>
            The searches we ran{view.place ? ` in ${view.place}` : ""}
          </h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope='col'>Search</th>
                  <th scope='col'>A month</th>
                  <th scope='col'>Map results</th>
                  <th scope='col'>Google</th>
                </tr>
              </thead>
              <tbody>
                {view.searches.map((r) => (
                  <tr key={r.keyword}>
                    <td>{r.keyword}</td>
                    <td>{r.volume ? r.volume.toLocaleString("en-US") : "–"}</td>
                    <td>{r.maps ? `#${r.maps}` : "Not there"}</td>
                    <td>{r.organic ? `#${r.organic}` : "Not on page one"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view.rivals.length > 0 && (
        <div className={styles.tableCard}>
          <h3 className={`${styles.detailTitle} h5`}>
            You and the operators near you
          </h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope='col'>Business</th>
                  <th scope='col'>Reviews</th>
                  <th scope='col'>Rating</th>
                </tr>
              </thead>
              <tbody>
                {view.listing && (
                  <tr className={styles.you}>
                    <td>{view.listing.name} (you)</td>
                    <td>{view.listing.reviews.toLocaleString("en-US")}</td>
                    <td>{view.listing.rating?.toFixed(1) ?? "–"}</td>
                  </tr>
                )}
                {view.rivals.map((r) => (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td>{r.reviews?.toLocaleString("en-US") ?? "–"}</td>
                    <td>{r.rating?.toFixed(1) ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view.semrush && <SemrushDeepDive data={view.semrush} />}

      {view.phoneShot && (
        <div className={styles.shotCard}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a screenshot saved with the audit, as a data: URL */}
          <img
            className={styles.shot}
            src={view.phoneShot}
            alt={`${view.domain ?? "The"} homepage on a phone`}
            width={206}
            height={412}
          />
          <div className={styles.shotText}>
            <span className={styles.label}>What a rider sees on a phone</span>
            <p>
              The first screen of your homepage on a mid-range phone, from
              Google&apos;s speed test. It&apos;s what a rider sees before they
              decide whether to scroll, call or leave.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
