"use client";

// The Growth page: everyone who visits their site for whatever dates they
// pick (daily, weekly, monthly, year to date, all time, or their own),
// where those visitors came from and where they landed, against their
// 12-month plan; how they show up on Google; their Google reviews; and the
// notes and habits from Chris. The numbers come in every night; everything
// here is worked out from one row a day since launch.
//
// Before Plausible is connected, the page counts visitors from Google
// search instead, the way it did before.

import { useState } from "react";
import Habits from "./Habits";
import RangeCalendar from "./RangeCalendar";
import TopSearches from "./TopSearches";
import TrafficChart from "./TrafficChart";
import VisitDetails from "./VisitDetails";
import Icon from "../icons";
import { Pill } from "../ui/ui";
import styles from "./Growth.module.css";
import { CHANNELS } from "@/lib/growth/channels";
import {
  daysFrom,
  fmtDayLong,
  fmtDayShort,
  fmtMonthName,
  fmtSpan,
} from "@/lib/growth/dates";
import type { Reviews } from "@/lib/growth/load";
import {
  bucketsFor,
  changeOf,
  countFor,
  fromGoogle,
  fromVisits,
  googleTotals,
  monthStatus,
  previousOf,
  RANGES,
  rangeFor,
  sharesOf,
  visitsFor,
  type Count,
  type DailySeries,
  type GoogleTotals,
  type PlanMonth,
  type RangeKey,
  type TrafficSeries,
  type VisitSeries,
} from "@/lib/growth/traffic";
import type { Growth as GrowthPlan } from "@/lib/dashboard/types";

const n = (value: number) => value.toLocaleString("en-US");

type Span = { from: string; to: string };

const GRAIN_WORDS = {
  day: "day by day",
  week: "week by week",
  month: "month by month",
} as const;

export default function Growth({
  visits,
  google,
  plan,
  growth,
  reviews,
  today,
  week,
  launched,
  site,
  initial,
}: {
  /** Everyone who visited, from Plausible; undefined until connected. */
  visits?: VisitSeries;
  /** Visitors from Google search; undefined until its first numbers. */
  google?: TrafficSeries;
  plan: PlanMonth[];
  growth?: GrowthPlan;
  reviews?: Reviews;
  /** Today in Arizona. */
  today: string;
  /** The Monday this week started, for the habits. */
  week: string;
  /** Launch day. */
  launched?: string;
  /** Their site's address, for links to its pages. */
  site?: string;
  /** The dates in the address, if any. */
  initial?: { key: RangeKey; span?: Span };
}) {
  const [key, setKey] = useState<RangeKey>(initial?.key ?? "month");
  const [custom, setCustom] = useState<Span | undefined>(initial?.span);
  const [picking, setPicking] = useState(false);

  // Keeps the view in the address, so a refresh or a shared link opens it.
  const remember = (next: RangeKey, span?: Span) => {
    const params = new URLSearchParams(window.location.search);
    params.delete("view");
    params.delete("from");
    params.delete("to");
    if (next === "custom" && span) {
      params.set("from", span.from);
      params.set("to", span.to);
    } else if (next !== "month") params.set("view", next);
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
  };

  const choose = (next: RangeKey) => {
    if (next === "custom") {
      setPicking(true);
      return;
    }
    setKey(next);
    remember(next);
  };

  // Everyone, from Plausible; or visitors from Google until it's connected.
  const main = visits
    ? fromVisits(visits)
    : google
      ? fromGoogle(google)
      : undefined;
  const status = monthStatus(main, plan, today);

  return (
    <>
      {main ? (
        <Traffic
          main={main}
          visits={visits}
          google={google}
          plan={plan}
          reviews={reviews}
          range={rangeFor(key, main, plan, custom)}
          onChoose={choose}
          status={status}
          launched={launched}
          site={site}
        />
      ) : (
        <section className={styles.panel}>
          <div className={styles.waiting}>
            <span className={styles.waitingIcon}>
              <Icon name='chart' />
            </span>
            <div className={styles.titles}>
              <h2 className={styles.heading}>
                Your visitor numbers are on their way
              </h2>
              <p>
                We&apos;re connecting your site&apos;s numbers. They fill in
                here within a day or two, all the way back to launch day, and
                update every night after that.
              </p>
            </div>
          </div>
        </section>
      )}

      {main && (
        <RangeCalendar
          open={picking}
          min={main.start}
          max={main.through}
          value={key === "custom" ? custom : undefined}
          onClose={() => setPicking(false)}
          onApply={(span) => {
            setCustom(span);
            setKey("custom");
            setPicking(false);
            remember("custom", span);
          }}
        />
      )}

      {growth && (growth.notes.length > 0 || growth.habits.length > 0) && (
        <div className={styles.split}>
          <section className={styles.panel}>
            <div className={styles.titles}>
              <h2 className={styles.heading}>What moved</h2>
              <p>From Chris, after this month&apos;s look at your numbers.</p>
            </div>
            {growth.notes.length ? (
              <ul className={styles.notes}>
                {growth.notes.map((note) => (
                  <li key={note} className={styles.note}>
                    <span className={styles.noteIcon}>
                      <Icon name='sparkle' />
                    </span>
                    <p>{note}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                This month&apos;s notes land here after Chris looks at your
                numbers.
              </p>
            )}
          </section>

          {growth.habits.length > 0 && (
            <Habits
              habits={growth.habits}
              week={week}
              initialDone={
                growth.habitsDone?.week === week ? growth.habitsDone.ids : []
              }
            />
          )}
        </div>
      )}
    </>
  );
}

function Traffic({
  main,
  visits,
  google,
  plan,
  reviews,
  range,
  onChoose,
  status,
  launched,
  site,
}: {
  main: DailySeries;
  visits?: VisitSeries;
  google?: TrafficSeries;
  plan: PlanMonth[];
  reviews?: Reviews;
  range: ReturnType<typeof rangeFor>;
  onChoose: (key: RangeKey) => void;
  status: ReturnType<typeof monthStatus>;
  launched?: string;
  site?: string;
}) {
  const buckets = bucketsFor(range, main, plan);
  const now = countFor(main, range.from, range.to);
  const prev = previousOf(range, main);
  const before = prev ? countFor(main, prev.from, prev.to) : undefined;
  const days = daysFrom(range.from, range.to) + 1;
  const span = fmtSpan(range.from, range.to);
  const versus = prev
    ? `the ${n(prev.days)} ${prev.days === 1 ? "day" : "days"} before`
    : undefined;
  const fromStart =
    range.from === main.start
      ? main.start === launched
        ? `Since launch on ${fmtDayShort(main.start)}`
        : `Since ${fmtDayShort(main.start)}`
      : span;

  const trend = (value: number, then?: number) => {
    if (!versus || then === undefined) return fromStart;
    const pct = changeOf(value, then);
    if (pct === undefined)
      return value ? `Up from 0 on ${versus}` : `Same as ${versus}`;
    if (pct === 0) return `Same as ${versus}`;
    return `${pct > 0 ? "Up" : "Down"} ${Math.abs(pct)}% on ${versus}`;
  };

  // Google's numbers for the same dates: only the days Google has yet.
  const g = google ? googleTotals(google, range.from, range.to) : undefined;
  const gBefore =
    google && prev ? googleTotals(google, prev.from, prev.to) : undefined;

  const place = (t: GoogleTotals, was?: GoogleTotals) => {
    if (!t.position) return "Not shown on Google in these dates";
    if (!versus || !was?.position) return "Lower is better: 1 is the top";
    const moved = was.position - t.position;
    if (Math.abs(moved) < 0.1) return `Steady on ${versus}`;
    return `${moved > 0 ? "Up" : "Down"} ${Math.abs(moved).toFixed(1)} on ${versus}`;
  };

  const lastTile = reviews
    ? {
        label: "Google reviews",
        value: n(reviews.total),
        note: [
          reviews.rating ? `${reviews.rating.toFixed(1)} stars` : "",
          reviews.since
            ? `${n(reviews.added ?? 0)} new since ${fmtDayShort(reviews.since)}`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
      }
    : {
        label: "Visitors a day",
        value: (now.value / Math.max(1, days)).toLocaleString("en-US", {
          maximumFractionDigits: now.value / days < 10 ? 1 : 0,
        }),
        note: `Over ${n(days)} ${days === 1 ? "day" : "days"}`,
      };

  let tiles: {
    label: string;
    value: string;
    note: string;
    highlight?: boolean;
  }[];
  if (visits) {
    const v = visitsFor(visits, range.from, range.to);
    const share = sharesOf(now.parts)("search");
    tiles = [
      {
        label: "Visitors",
        value: n(now.value),
        note: trend(now.value, before?.value),
        highlight: true,
      },
      {
        label: "From search",
        value: n(now.parts?.search ?? 0),
        note: now.value
          ? `${share > 0 && share < 1 ? "Under 1" : Math.round(share)}% of your visitors`
          : "No visitors in these dates",
      },
      {
        label: "Pages viewed",
        value: n(v.pageviews),
        note: v.visits
          ? `${(v.pageviews / v.visits).toFixed(1)} pages a visit`
          : "No visits in these dates",
      },
      lastTile,
    ];
  } else {
    tiles = [
      {
        label: "Visitors from Google",
        value: n(now.value),
        note: trend(now.value, before?.value),
        highlight: true,
      },
      {
        label: "Shown on Google",
        value: n(g?.impressions ?? 0),
        note: trend(g?.impressions ?? 0, gBefore?.impressions),
      },
      {
        label: "Average position",
        value: g?.position ? `#${g.position.toFixed(1)}` : "–",
        note: g ? place(g, gBefore) : "",
      },
      lastTile,
    ];
  }

  const onPace =
    status.pace !== undefined && status.target !== undefined
      ? status.pace >= status.target
      : undefined;
  const monthName = fmtMonthName(`${status.month}-01`);
  const showing = CHANNELS.filter((c) => (now.parts?.[c.key] ?? 0) > 0);
  const planShown = range.grain === "month" && plan.length > 0;
  const many = (value: number) => (value === 1 ? "visitor" : "visitors");

  // Before Plausible, each bar's tooltip has how often Google showed them.
  const googleNote =
    !visits && google
      ? (b: { from: string; to: string }) => {
          const t = googleTotals(google, b.from, b.to);
          return t.impressions
            ? `Shown ${n(t.impressions)} times${t.position ? ` · #${t.position.toFixed(1)}` : ""}`
            : "Not shown on Google";
        }
      : undefined;

  return (
    <>
      <section className={styles.rangeBar} aria-label='Dates'>
        <div className={styles.rangeText}>
          <span className={styles.rangeSpan}>{span}</span>
          <span className={styles.rangeMeta}>
            {n(days)} {days === 1 ? "day" : "days"} · numbers through{" "}
            {fmtDayShort(main.through)}
          </span>
        </div>
        <div className={styles.segments} role='radiogroup' aria-label='Dates'>
          {RANGES.map((r) => (
            <button
              key={r.key}
              type='button'
              role='radio'
              aria-checked={range.key === r.key}
              className={`${styles.segment} ${range.key === r.key ? styles.segmentOn : ""}`}
              onClick={() => onChoose(r.key)}
            >
              {r.key === "custom" && (
                <Icon name='calendar' className={styles.segmentIcon} />
              )}
              {r.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.tiles} aria-label={`Your numbers, ${span}`}>
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className={`${styles.tile} ${tile.highlight ? styles.tileHighlight : ""}`}
          >
            <span className={styles.tileLabel}>{tile.label}</span>
            <span className={styles.tileValue}>{tile.value}</span>
            <p className={styles.tileNote}>{tile.note}</p>
          </div>
        ))}
      </section>

      <section className={styles.panel}>
        <div className={styles.chartHead}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>
              {visits ? "Visitors" : "Visitors from Google"},{" "}
              {GRAIN_WORDS[range.grain]}
            </h2>
            <p>
              {visits
                ? "Everyone who came to your site, by where they came from."
                : "People who clicked through to your site from a Google search."}
              {planShown
                ? " The dotted line is your 12-month plan."
                : " Point at a bar for its numbers."}
            </p>
          </div>
          <div className={styles.legend}>
            {visits ? (
              showing.map((c) => (
                <span key={c.key} className={styles.key}>
                  <i className={styles[`ch_${c.key}`]} />
                  {c.label}
                </span>
              ))
            ) : (
              <span className={styles.key}>
                <i className={styles.keyBar} />
                Visitors
              </span>
            )}
            {range.grain !== "day" && (
              <span className={styles.key}>
                <i className={visits ? styles.keyNowSplit : styles.keyNow} />
                So far
              </span>
            )}
            {planShown && (
              <span className={styles.key}>
                <i className={styles.keyPlan} />
                Plan
              </span>
            )}
          </div>
        </div>

        <TrafficChart buckets={buckets} grain={range.grain} note={googleNote} />

        <div className={styles.paceRow}>
          {onPace !== undefined && (
            <Pill tone={onPace ? "lime" : "yellow"} dot>
              {onPace ? "Ahead of plan" : "Behind plan"}
            </Pill>
          )}
          <p>
            {status.covered > 0 && status.through
              ? `${monthName} so far: ${n(status.soFar)} ${many(status.soFar)} through ${fmtDayShort(status.through)}, on pace for ${n(status.pace ?? 0)}${status.target !== undefined ? ` against a plan of ${n(status.target)}` : ""}.`
              : visits
                ? `${monthName}'s first numbers come in on the 2nd.`
                : `${monthName}'s first numbers come in two or three days into the month.`}
            {status.last &&
              ` Last month: ${n(status.last.value)}${status.last.target !== undefined ? ` against ${n(status.last.target)}` : ""}.`}
          </p>
        </div>
      </section>

      {visits && (
        <>
          <Channels now={now} span={span} />
          <VisitDetails
            from={range.from}
            to={range.to}
            span={span}
            site={site}
          />
        </>
      )}

      {google && (
        <TopSearches
          from={range.from}
          to={range.to}
          span={span}
          google={
            visits && g
              ? {
                  totals: g,
                  through: google.through,
                  clicksNote: trend(g.clicks, gBefore?.clicks),
                  shownNote: trend(g.impressions, gBefore?.impressions),
                  placeNote: place(g, gBefore),
                }
              : undefined
          }
        />
      )}

      <p className={styles.source}>
        {visits
          ? `Updated every night. Visitors come from Plausible, which counts each person once a day, without cookies.${google ? ` The Google numbers come from Search Console${reviews ? " and Google Maps" : ""}, two or three days behind.` : reviews ? " Reviews come from Google Maps." : ""}`
          : `Updated every night from Google Search Console${reviews ? " and Google Maps" : ""}. Google settles each day's numbers over two or three days, so the newest are from ${fmtDayLong(main.through)}.`}
      </p>
    </>
  );
}

/** Where the visitors in these dates came from: a share each. */
function Channels({ now, span }: { now: Count; span: string }) {
  const shares = sharesOf(now.parts);
  const rows = CHANNELS.map((c) => ({
    ...c,
    value: now.parts?.[c.key] ?? 0,
    share: shares(c.key),
  }));
  const any = rows.some((r) => r.value > 0);
  const pct = (share: number) =>
    share > 0 && share < 1 ? "Under 1%" : `${Math.round(share)}%`;

  return (
    <section className={styles.panel}>
      <div className={styles.titles}>
        <h2 className={styles.heading}>Where your visitors come from</h2>
        <p>{span}. Someone who found you two ways in one day counts in both.</p>
      </div>
      {any ? (
        <>
          <div
            className={styles.shareBar}
            role='img'
            aria-label={rows
              .filter((r) => r.value > 0)
              .map((r) => `${r.label} ${pct(r.share)}`)
              .join(", ")}
          >
            {rows
              .filter((r) => r.value > 0)
              .map((r) => (
                <span
                  key={r.key}
                  className={styles[`ch_${r.key}`]}
                  style={{ flexGrow: r.value }}
                />
              ))}
          </div>
          <ul className={styles.channels}>
            {rows.map((r) => (
              <li
                key={r.key}
                className={`${styles.channel} ${r.value ? "" : styles.channelNone}`}
              >
                <span className={styles.channelHead}>
                  <i
                    className={`${styles.swatchBig} ${styles[`ch_${r.key}`]}`}
                  />
                  <span className={styles.channelName}>{r.label}</span>
                </span>
                <span className={styles.channelNumbers}>
                  <span className={styles.channelValue}>{n(r.value)}</span>
                  <span className={styles.channelShare}>{pct(r.share)}</span>
                </span>
                <p className={styles.channelAbout}>{r.about}</p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className={styles.searchNote}>No visitors in these dates.</p>
      )}
    </section>
  );
}
