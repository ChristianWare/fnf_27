"use client";

// The Leads Tool's home: what to do today, what's new this morning, the
// events coming up, and what leads have brought in. The morning email is
// this same page.

import Link from "next/link";
import Icon from "../icons";
import { ButtonLink, PageHead, Pill, Progress, ui } from "../ui/ui";
import { useLeads } from "./Store";
import { DateBlock, kindOf, Reasons, SaveButton, Tile } from "./bits";
import styles from "./Leads.module.css";
import {
  fits,
  rank,
  thisWeek,
  todaysMoves,
  when,
  wonValue,
} from "@/lib/leads/advice";
import { STAGES } from "@/lib/leads/catalog";
import { prorate } from "@/lib/dashboard/billing";
import { fmtDate, fmtWeekday, money } from "@/lib/dashboard/format";

export default function Today({ firstName }: { firstName: string }) {
  const {
    now,
    settings,
    accounts,
    events,
    saved,
    target,
    savedFor,
    access,
    trialEndsAt,
    billing,
    monthly,
    newSince,
    href,
    readOnly,
  } = useLeads();

  const moves = todaysMoves(saved, target, now);
  const fresh = [...accounts, ...events]
    .filter((t) => t.foundAt > newSince && fits(t, settings) && !savedFor(t.id))
    .sort((a, b) => rank(b, now) - rank(a, now));
  // The very first day there's nothing "new": show the best ones instead.
  const starters =
    !fresh.length && !saved.length
      ? [...accounts, ...events]
          .filter((t) => fits(t, settings))
          .sort((a, b) => rank(b, now) - rank(a, now))
          .slice(0, 6)
      : [];
  const picks = fresh.length ? fresh : starters;
  const soon = events
    .filter((e) => thisWeek(e, now) && fits(e, settings) && !savedFor(e.id))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const won = wonValue(saved);
  const times = won.monthly ? won.monthly / monthly : 0;
  const counts = STAGES.map((s) => ({
    ...s,
    count: saved.filter((lead) => lead.stage === s.id).length,
  }));

  const trialDays = trialEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(trialEndsAt).getTime() - new Date(now).getTime()) /
            86_400_000,
        ),
      )
    : 0;

  const summary = [
    moves.length
      ? `${moves.length} ${moves.length === 1 ? "lead" : "leads"} to reach today`
      : "Nobody to chase today",
    fresh.length ? `${fresh.length} new this morning` : "nothing new overnight",
  ].join(", ");

  return (
    <>
      <PageHead
        crumb={`Leads · ${fmtWeekday(now)}`}
        title={`Today, ${firstName}`}
        text={`${summary}. New leads land every morning at 6, within ${settings.radius} miles of ${settings.base.city}.`}
      >
        <ButtonLink href={href("find")} icon='search'>
          Find leads
        </ButtonLink>
        <ButtonLink href={href("pipeline")} variant='light'>
          Pipeline
        </ButtonLink>
      </PageHead>

      {access === "TRIAL" && trialEndsAt && (
        <section className={styles.trial}>
          <div className={styles.trialText}>
            <span className={ui.mono}>
              Free trial · {trialDays} {trialDays === 1 ? "day" : "days"} left
            </span>
            <p>
              {billing.subscribed
                ? `You're all set to keep it. On ${fmtDate(trialEndsAt)} your card is charged ${money(prorate(monthly, trialEndsAt))} for the rest of that month, then ${money(monthly)} on the 1st.`
                : `Your trial ends ${fmtDate(trialEndsAt)}. Add a card anytime to keep it: the first charge covers the rest of that month, then ${money(monthly)} on the 1st.`}
            </p>
          </div>
          <div className={styles.trialBar}>
            <Progress
              value={30 - trialDays}
              max={30}
              label='Trial days used'
              tone='black'
            />
          </div>
          {!billing.subscribed && !readOnly && (
            <a
              href='/dashboard/billing/leads'
              className={`${ui.btn} ${ui.btn_white} ${ui.btnSmall}`}
              data-no-transition
            >
              Add a card
            </a>
          )}
        </section>
      )}

      <div className={styles.grid}>
        <div className={styles.column}>
          {/* ── Your moves ── */}
          <section className={ui.panel}>
            <div className={ui.panelHead}>
              <div className={ui.panelTitles}>
                <h2 className={ui.panelTitle}>Your moves today</h2>
                <p>New leads to reach out to, and follow-ups that are due.</p>
              </div>
              <Pill tone={moves.length ? "yellow" : "lime"} dot>
                {moves.length ? `${moves.length} to do` : "All caught up"}
              </Pill>
            </div>

            {moves.length ? (
              <ul className={styles.rows}>
                {moves.map((move) => (
                  <li key={move.lead.targetId}>
                    <Link href={href(move.target.id)} className={styles.row}>
                      <Tile target={move.target} now={now} />
                      <span className={styles.rowText}>
                        <span className={styles.verb}>
                          {move.overdue && (
                            <span className={styles.overdue}>Overdue</span>
                          )}
                          {move.verb}
                          {move.target.contact &&
                            ` · ${move.target.contact.name}`}
                        </span>
                        <span className={styles.rowName}>
                          {move.target.name}
                        </span>
                        <span className={styles.rowMeta}>{move.detail}</span>
                      </span>
                      <span className={styles.rowGo}>
                        Open
                        <Icon name='arrow' />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.clear}>
                <span className={styles.clearIcon}>
                  <Icon name='check' />
                </span>
                <p>
                  Nothing due today. Save a few new leads below and they&apos;ll
                  show up here to reach out to.
                </p>
              </div>
            )}
          </section>

          {/* ── New this morning ── */}
          <section className={ui.panel}>
            <div className={ui.panelHead}>
              <div className={ui.panelTitles}>
                <h2 className={ui.panelTitle}>
                  {starters.length
                    ? "Good ones to start with"
                    : "New this morning"}
                </h2>
                <p>
                  {starters.length
                    ? `The best within ${settings.radius} miles of ${settings.base.city} right now. From tomorrow, what's new each morning shows here.`
                    : `Found overnight within ${settings.radius} miles of ${settings.base.city}, best first.`}
                </p>
              </div>
              <ButtonLink
                href={href("find")}
                variant='light'
                small
                icon='arrow'
              >
                See all
              </ButtonLink>
            </div>
            {picks.length ? (
              <ul className={styles.list}>
                {picks.slice(0, 6).map((t) => (
                  <li key={t.id} className={styles.item}>
                    <Link href={href(t.id)} className={styles.itemMain}>
                      <Tile target={t} now={now} />
                      <span className={styles.itemText}>
                        <span className={styles.itemName}>{t.name}</span>
                        <span className={styles.itemKind}>{kindOf(t)}</span>
                        <Reasons target={t} now={now} limit={3} />
                      </span>
                    </Link>
                    <SaveButton id={t.id} from='Today' />
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.quiet}>
                Nothing new overnight in your area. Find has everything
                that&apos;s there now.
              </p>
            )}
          </section>
        </div>

        <div className={styles.column}>
          {/* ── What leads brought in ── */}
          <section className={styles.roi}>
            <span className={styles.roiLabel}>Won from your leads</span>
            <span className={styles.roiValue}>
              {money(won.monthly)}
              <span>/mo</span>
            </span>
            <p className={styles.roiNote}>
              {access === "STUDIO"
                ? won.count
                  ? `From ${won.count} won ${won.count === 1 ? "account" : "accounts"}. The studio's own Leads Tool, free for admins.`
                  : "Your first win shows up here. This is the studio's own Leads Tool, free for admins."
                : access === "INCLUDED"
                  ? won.count
                    ? `From ${won.count} won ${won.count === 1 ? "account" : "accounts"}. The Leads Tool is included with your Full Platform plan.`
                    : "Your first win shows up here. The Leads Tool is included with your Full Platform plan."
                  : won.monthly
                    ? `About ${times >= 10 ? Math.round(times) : times.toFixed(1)}× what the Leads Tool costs.`
                    : "Your first win shows up here. One account usually covers the tool many times over."}
              {won.once ? ` Plus ${money(won.once)} in one-time trips.` : ""}
            </p>
            <div className={styles.roiBar} aria-hidden='true'>
              {counts
                .filter((s) => s.count > 0)
                .map((s) => (
                  <span
                    key={s.id}
                    className={`${styles.roiSeg} ${styles[`dot_${s.tone}`]}`}
                    style={{ flexGrow: s.count }}
                  />
                ))}
            </div>
            <ul className={styles.roiStages}>
              {counts.map((s) => (
                <li key={s.id}>
                  <Link href={href("pipeline")} className={styles.roiStage}>
                    <span
                      className={`${styles.stageDot} ${styles[`dot_${s.tone}`]}`}
                    />
                    <span className={styles.roiStageLabel}>{s.label}</span>
                    <span className={styles.roiStageCount}>{s.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* ── Coming up ── */}
          <section className={ui.panel}>
            <div className={ui.panelTitles}>
              <h2 className={ui.panelTitle}>Coming up</h2>
              <p>
                Events in the next two weeks, while there&apos;s still time to
                get booked.
              </p>
            </div>
            {soon.length ? (
              <ul className={styles.list}>
                {soon.map((e) => (
                  <li key={e.id} className={styles.item}>
                    <Link href={href(e.id)} className={styles.itemMain}>
                      <DateBlock date={e.date} />
                      <span className={styles.itemText}>
                        <span className={styles.itemName}>{e.name}</span>
                        <span className={styles.itemKind}>
                          {[when(e.date, now), e.venue]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </Link>
                    <SaveButton id={e.id} from='Today' />
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.quiet}>
                No new events in the next two weeks. Saved ones are in your
                moves.
              </p>
            )}
          </section>

          <Link href={href("settings")} className={styles.mailNote}>
            <span className={styles.mailIcon}>
              <Icon name='mail' />
            </span>
            <span className={styles.mailText}>
              <span className={styles.itemName}>
                {settings.morningEmail
                  ? "This page is in your inbox at 6:00 AM"
                  : "Your morning email is off"}
              </span>
              <span className={styles.rowMeta}>
                {settings.morningEmail
                  ? "Every morning, Arizona time. Change it in Lead settings."
                  : "Turn it on in Lead settings."}
              </span>
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}
