"use client";

// The Growth page: visitors from Google for whatever dates they pick
// (daily, weekly, monthly, year to date, all time, or their own), against
// their 12-month plan, their Google reviews, the searches that bring them,
// and the notes and habits from Chris. The numbers come from Google every
// night; everything here is worked out from one row a day since launch.

import { useState } from "react";
import Habits from "./Habits";
import RangeCalendar from "./RangeCalendar";
import TopSearches from "./TopSearches";
import TrafficChart from "./TrafficChart";
import Icon from "../icons";
import { Pill } from "../ui/ui";
import styles from "./Growth.module.css";
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
  monthStatus,
  previousOf,
  RANGES,
  rangeFor,
  totalsFor,
  type PlanMonth,
  type RangeKey,
  type TrafficSeries,
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
  series,
  plan,
  growth,
  reviews,
  today,
  week,
  initial,
}: {
  /** Undefined until Google's first numbers are in. */
  series?: TrafficSeries;
  plan: PlanMonth[];
  growth?: GrowthPlan;
  reviews?: Reviews;
  /** Today in Arizona. */
  today: string;
  /** The Monday this week started, for the habits. */
  week: string;
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

  const status = monthStatus(series, plan, today);

  return (
    <>
      {series ? (
        <Traffic
          series={series}
          plan={plan}
          reviews={reviews}
          range={rangeFor(key, series, plan, custom)}
          onChoose={choose}
          status={status}
        />
      ) : (
        <section className={styles.panel}>
          <div className={styles.waiting}>
            <span className={styles.waitingIcon}>
              <Icon name='chart' />
            </span>
            <div className={styles.titles}>
              <h2 className={styles.heading}>
                Your visitors from Google are on their way
              </h2>
              <p>
                We&apos;re connecting your site to Google Search Console. Your
                numbers fill in here within a day or two, all the way back to
                launch day, and update every night after that.
              </p>
            </div>
          </div>
        </section>
      )}

      {series && (
        <RangeCalendar
          open={picking}
          min={series.start}
          max={series.through}
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
  series,
  plan,
  reviews,
  range,
  onChoose,
  status,
}: {
  series: TrafficSeries;
  plan: PlanMonth[];
  reviews?: Reviews;
  range: ReturnType<typeof rangeFor>;
  onChoose: (key: RangeKey) => void;
  status: ReturnType<typeof monthStatus>;
}) {
  const buckets = bucketsFor(range, series, plan);
  const totals = totalsFor(series, range.from, range.to);
  const prev = previousOf(range, series);
  const before = prev ? totalsFor(series, prev.from, prev.to) : undefined;
  const days = daysFrom(range.from, range.to) + 1;
  const span = fmtSpan(range.from, range.to);
  const versus = prev
    ? `the ${n(prev.days)} ${prev.days === 1 ? "day" : "days"} before`
    : undefined;

  const trend = (now: number, then?: number) => {
    if (!versus || then === undefined)
      return range.from === series.start
        ? `Since launch on ${fmtDayShort(series.start)}`
        : span;
    const pct = changeOf(now, then);
    if (pct === undefined)
      return now ? `Up from 0 on ${versus}` : `Same as ${versus}`;
    if (pct === 0) return `Same as ${versus}`;
    return `${pct > 0 ? "Up" : "Down"} ${Math.abs(pct)}% on ${versus}`;
  };

  const place = () => {
    if (!totals.position) return "Not shown on Google in these dates";
    if (!versus || !before?.position) return "Lower is better: 1 is the top";
    const moved = before.position - totals.position;
    if (Math.abs(moved) < 0.1) return `Steady on ${versus}`;
    return `${moved > 0 ? "Up" : "Down"} ${Math.abs(moved).toFixed(1)} on ${versus}`;
  };

  const tiles = [
    {
      label: "Visitors from Google",
      value: n(totals.clicks),
      note: trend(totals.clicks, before?.clicks),
      highlight: true,
    },
    {
      label: "Shown on Google",
      value: n(totals.impressions),
      note: trend(totals.impressions, before?.impressions),
    },
    {
      label: "Average position",
      value: totals.position ? `#${totals.position.toFixed(1)}` : "–",
      note: place(),
    },
    reviews
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
          value: (totals.clicks / Math.max(1, days)).toLocaleString("en-US", {
            maximumFractionDigits: totals.clicks / days < 10 ? 1 : 0,
          }),
          note: `Over ${n(days)} ${days === 1 ? "day" : "days"}`,
        },
  ];

  const onPace =
    status.pace !== undefined && status.target !== undefined
      ? status.pace >= status.target
      : undefined;
  const monthName = fmtMonthName(`${status.month}-01`);

  return (
    <>
      <section className={styles.rangeBar} aria-label='Dates'>
        <div className={styles.rangeText}>
          <span className={styles.rangeSpan}>{span}</span>
          <span className={styles.rangeMeta}>
            {n(days)} {days === 1 ? "day" : "days"} · numbers through{" "}
            {fmtDayShort(series.through)}
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
              Visitors from Google, {GRAIN_WORDS[range.grain]}
            </h2>
            <p>
              People who clicked through to your site from a Google search.
              {range.grain === "month" && plan.length > 0
                ? " The dotted line is your 12-month plan."
                : " Point at a bar for its numbers."}
            </p>
          </div>
          <div className={styles.legend}>
            <span className={styles.key}>
              <i className={styles.keyBar} />
              Visitors
            </span>
            {range.grain !== "day" && (
              <span className={styles.key}>
                <i className={styles.keyNow} />
                So far
              </span>
            )}
            {range.grain === "month" && plan.length > 0 && (
              <span className={styles.key}>
                <i className={styles.keyPlan} />
                Plan
              </span>
            )}
          </div>
        </div>

        <TrafficChart buckets={buckets} grain={range.grain} />

        <div className={styles.paceRow}>
          {onPace !== undefined && (
            <Pill tone={onPace ? "lime" : "yellow"} dot>
              {onPace ? "Ahead of plan" : "Behind plan"}
            </Pill>
          )}
          <p>
            {status.covered > 0 && status.through
              ? `${monthName} so far: ${n(status.soFar)} ${status.soFar === 1 ? "visitor" : "visitors"} through ${fmtDayShort(status.through)}, on pace for ${n(status.pace ?? 0)}${status.target !== undefined ? ` against a plan of ${n(status.target)}` : ""}.`
              : `${monthName}'s first numbers come in two or three days into the month.`}
            {status.last &&
              ` Last month: ${n(status.last.clicks)}${status.last.target !== undefined ? ` against ${n(status.last.target)}` : ""}.`}
          </p>
        </div>
      </section>

      <TopSearches from={range.from} to={range.to} span={span} />

      <p className={styles.source}>
        Updated every night from Google Search Console
        {reviews ? " and Google Maps" : ""}. Google settles each day&apos;s
        numbers over two or three days, so the newest are from{" "}
        {fmtDayLong(series.through)}.
      </p>
    </>
  );
}
