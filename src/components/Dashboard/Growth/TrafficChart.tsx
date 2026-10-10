// Visitors from Google as bars: a day, a week or a month each. By month,
// the plan runs through it as a dotted line, and the month we're in shows
// where it's heading. Point at (or tap) a bar for its numbers.

import styles from "./Growth.module.css";
import { niceTop, type Bucket, type Grain } from "@/lib/growth/traffic";

const n = (value: number) => value.toLocaleString("en-US");

export default function TrafficChart({
  buckets,
  grain,
}: {
  buckets: Bucket[];
  grain: Grain;
}) {
  const plan = grain === "month" && buckets.some((b) => b.target);
  const top = niceTop(
    Math.max(
      1,
      ...buckets.map((b) => Math.max(b.clicks, b.pace ?? 0)),
      ...(plan ? buckets.map((b) => b.target ?? 0) : []),
    ),
  );
  const lines = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f));
  const pct = (value: number) => `${Math.min(100, (value / top) * 100)}%`;
  const count = buckets.length;
  // Labels only as often as they fit, about 9px a letter: counted back
  // from the latest bar, so it always has one. A computer has about 780px
  // of chart, a phone or a tablet about 290px.
  const longest = Math.max(...buckets.map((b) => b.label.length), 1);
  const every = (width: number) =>
    Math.max(1, Math.ceil((longest * 9 + 14) / (width / count)));
  const everyWide = every(780);
  const everyPhone = every(290);
  const shown = (i: number, step: number) => (count - 1 - i) % step === 0;
  const dense = count > 16;
  const columns = { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` };

  return (
    <div className={`${styles.chart} ${dense ? styles.chartDense : ""}`}>
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

        {plan && (
          <svg
            className={styles.planLine}
            viewBox='0 0 100 100'
            preserveAspectRatio='none'
            aria-hidden='true'
          >
            <polyline
              points={buckets
                .map((b, i) =>
                  b.target === undefined
                    ? null
                    : `${((i + 0.5) / count) * 100},${100 - Math.min(100, (b.target / top) * 100)}`,
                )
                .filter(Boolean)
                .join(" ")}
              vectorEffect='non-scaling-stroke'
            />
          </svg>
        )}

        <ol className={styles.cols} style={columns}>
          {buckets.map((b, i) => {
            const edge =
              i < 2 ? styles.tipStart : i >= count - 2 ? styles.tipEnd : "";
            const met =
              b.target !== undefined && !b.future && b.clicks >= b.target;
            const describe = b.future
              ? `${b.title}: still to come${b.target !== undefined ? `, plan ${n(b.target)}` : ""}`
              : `${b.title}: ${n(b.clicks)} ${b.clicks === 1 ? "visitor" : "visitors"} from Google${b.impressions ? `, shown ${n(b.impressions)} times` : ""}${plan && b.target !== undefined ? `, plan ${n(b.target)}` : ""}${b.pace !== undefined ? `, on pace for ${n(b.pace)}` : ""}`;
            return (
              <li
                key={b.key}
                className={styles.col}
                tabIndex={0}
                aria-label={describe}
              >
                {b.pace !== undefined && b.pace > b.clicks && (
                  <div
                    className={styles.ghost}
                    style={{ height: pct(b.pace) }}
                  />
                )}
                {!b.future && (
                  <div
                    className={`${styles.bar} ${b.soFar ? styles.barNow : ""}`}
                    style={{ height: pct(b.clicks) }}
                  >
                    {count <= 14 && (
                      <span className={styles.barValue}>{n(b.clicks)}</span>
                    )}
                  </div>
                )}
                {plan && b.target !== undefined && (
                  <span
                    className={`${styles.target} ${met ? styles.targetMet : ""}`}
                    style={{ bottom: pct(b.target) }}
                  />
                )}
                <div className={`${styles.tip} ${edge}`} aria-hidden='true'>
                  <span className={styles.tipTitle}>{b.title}</span>
                  {b.future ? (
                    <span className={styles.tipLine}>Still to come</span>
                  ) : (
                    <>
                      <strong className={styles.tipValue}>
                        {n(b.clicks)} {b.clicks === 1 ? "visitor" : "visitors"}
                      </strong>
                      <span className={styles.tipLine}>
                        {b.impressions
                          ? `Shown ${n(b.impressions)} times${b.position ? ` · #${b.position.toFixed(1)}` : ""}`
                          : "Not shown on Google"}
                      </span>
                    </>
                  )}
                  {plan && b.target !== undefined && (
                    <span className={styles.tipLine}>
                      Plan {n(b.target)}
                      {b.pace !== undefined
                        ? ` · on pace for ${n(b.pace)}`
                        : ""}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <ol className={styles.months} style={columns} aria-hidden='true'>
        {buckets.map((b, i) => (
          <li
            key={b.key}
            className={[
              styles.month,
              shown(i, everyWide) && styles.onWide,
              shown(i, everyPhone) && styles.onPhone,
              i === 0 && styles.monthFirst,
              i === count - 1 && styles.monthLast,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {b.label}
            {b.year && <span className={styles.labelYear}> {b.year}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
