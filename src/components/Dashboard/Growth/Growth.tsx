import styles from "./Growth.module.css";
import Habits from "./Habits";
import Icon from "../icons";
import { Pill } from "../ui/ui";
import { growthNow } from "@/lib/dashboard";
import { fmtMonth, fmtMonthLong } from "@/lib/dashboard/format";
import type { Growth as GrowthData } from "@/lib/dashboard/types";

const n = (value: number) => value.toLocaleString("en-US");

export default function Growth({
  growth,
  now,
}: {
  growth: GrowthData;
  now: string;
}) {
  const { current, pace } = growthNow(growth, now);
  const lastMonth = [...growth.months]
    .reverse()
    .find((m) => m.actual !== undefined);
  const top =
    Math.ceil(Math.max(...growth.months.map((m) => m.target), pace) / 1000) *
    1000;
  const lines = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f));
  const pct = (value: number) => `${Math.min(100, (value / top) * 100)}%`;
  const onPace = current ? pace >= current.target : false;

  const tiles = [
    {
      label: "Visitors from search",
      value: n(growth.monthToDate),
      note: current ? `On pace for ${n(pace)} · plan ${n(current.target)}` : "",
      highlight: true,
    },
    {
      label: "Calls from Google",
      value: n(growth.calls.monthToDate),
      note: `${n(growth.calls.lastMonth)} last month`,
    },
    {
      label: growth.bookings.label,
      value: n(growth.bookings.monthToDate),
      note: `${n(growth.bookings.lastMonth)} last month`,
    },
    {
      label: "Google reviews",
      value: n(growth.reviews.total),
      note: `${growth.reviews.rating} average · ${growth.reviews.newThisMonth} new this month`,
    },
  ];

  return (
    <>
      <section className={styles.tiles} aria-label='This month so far'>
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
            <h2 className={styles.heading}>Your 12-month plan</h2>
            <p>
              Visitors from search each month. The dotted line is the plan; the
              goal is a site busy enough to keep growing on its own.
            </p>
          </div>
          <div className={styles.legend}>
            <span className={styles.key}>
              <i className={styles.keyBar} />
              Visitors
            </span>
            <span className={styles.key}>
              <i className={styles.keyNow} />
              This month
            </span>
            <span className={styles.key}>
              <i className={styles.keyPlan} />
              Plan
            </span>
          </div>
        </div>

        <div className={styles.chart}>
          <div className={styles.plotArea}>
            <div className={styles.grid} aria-hidden='true'>
              {lines.map((line) => (
                <div
                  key={line}
                  className={styles.gridLine}
                  style={{ bottom: pct(line) }}
                >
                  <span className={styles.gridLabel}>{n(line)}</span>
                </div>
              ))}
            </div>

            {/* The plan, as one dotted line through every month. */}
            <svg
              className={styles.planLine}
              viewBox='0 0 100 100'
              preserveAspectRatio='none'
              aria-hidden='true'
            >
              <polyline
                points={growth.months
                  .map(
                    (m, i) =>
                      `${((i + 0.5) / growth.months.length) * 100},${100 - (m.target / top) * 100}`,
                  )
                  .join(" ")}
                vectorEffect='non-scaling-stroke'
              />
            </svg>

            <ol className={styles.cols}>
              {growth.months.map((month) => {
                const isNow = month.month === current?.month;
                const value = isNow ? growth.monthToDate : month.actual;
                return (
                  <li
                    key={month.month}
                    className={styles.col}
                    aria-label={`${fmtMonthLong(month.month)}: plan ${n(month.target)}${value !== undefined ? `, ${n(value)} visitors${isNow ? " so far" : ""}` : ""}`}
                  >
                    {isNow && (
                      <div
                        className={styles.ghost}
                        style={{ height: pct(pace) }}
                        title={`On pace for ${n(pace)}`}
                      />
                    )}
                    {value !== undefined && (
                      <div
                        className={`${styles.bar} ${isNow ? styles.barNow : ""}`}
                        style={{ height: pct(value) }}
                      >
                        <span className={styles.barValue}>{n(value)}</span>
                      </div>
                    )}
                    <span
                      className={`${styles.target} ${value !== undefined && value >= month.target ? styles.targetMet : ""}`}
                      style={{ bottom: pct(month.target) }}
                      title={`Plan: ${n(month.target)}`}
                    />
                  </li>
                );
              })}
            </ol>
          </div>

          <ol className={styles.months} aria-hidden='true'>
            {growth.months.map((month) => (
              <li
                key={month.month}
                className={`${styles.month} ${month.month === current?.month ? styles.monthNow : ""}`}
              >
                {fmtMonth(month.month)}
              </li>
            ))}
          </ol>
        </div>

        {current && (
          <div className={styles.paceRow}>
            <Pill tone={onPace ? "lime" : "yellow"} dot>
              {onPace ? "Ahead of plan" : "Behind plan"}
            </Pill>
            <p>
              {fmtMonthLong(current.month)} is on pace for {n(pace)} visitors
              against a plan of {n(current.target)}.
              {lastMonth?.actual !== undefined &&
                ` Last month: ${n(lastMonth.actual)} against ${n(lastMonth.target)}.`}
            </p>
          </div>
        )}
      </section>

      <div className={styles.split}>
        <section className={styles.panel}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>What moved</h2>
            <p>From Chris, after this month&apos;s look at your numbers.</p>
          </div>
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
        </section>

        <Habits habits={growth.habits} />
      </div>

      <section className={styles.panel}>
        <div className={styles.titles}>
          <h2 className={styles.heading}>Searches that bring riders</h2>
          <p>
            Where you show up on Google, and the clicks each search sent this
            month.
          </p>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope='col'>Search</th>
                <th scope='col'>Position</th>
                <th scope='col'>Change</th>
                <th scope='col'>Clicks</th>
              </tr>
            </thead>
            <tbody>
              {growth.queries.map((q) => (
                <tr key={q.query}>
                  <td className={styles.query}>{q.query}</td>
                  <td>
                    <span className={styles.position}>#{q.position}</span>
                  </td>
                  <td>
                    {q.change > 0 ? (
                      <span className={styles.up}>
                        <Icon name='arrowUpRight' />
                        {q.change}
                      </span>
                    ) : (
                      <span className={styles.flat}>Same</span>
                    )}
                  </td>
                  <td>{n(q.clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
