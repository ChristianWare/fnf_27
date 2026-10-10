// Visitors as bars: a day, a week or a month each, split by where they
// came from when that's known. By month, the plan runs through it as a
// dotted line, and the month we're in shows where it's heading. Point at
// (or tap) a bar for its numbers.

import styles from "./Growth.module.css";
import { CHANNELS } from "@/lib/growth/channels";
import { niceTop, type Bucket, type Grain } from "@/lib/growth/traffic";

const n = (value: number) => value.toLocaleString("en-US");

export default function TrafficChart({
  buckets,
  grain,
  noun = "visitor",
  note,
}: {
  buckets: Bucket[];
  grain: Grain;
  /** What's counted, one of them: "visitor". */
  noun?: string;
  /** A line under the numbers when you point at a bar. */
  note?: (b: Bucket) => string | undefined;
}) {
  const plan = grain === "month" && buckets.some((b) => b.target);
  const stacked = buckets.some((b) => b.parts);
  const top = niceTop(
    Math.max(
      1,
      ...buckets.map((b) => Math.max(b.value, b.pace ?? 0)),
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
  const many = (value: number) => (value === 1 ? noun : `${noun}s`);
  const planPoints = buckets
    .map((b, i) =>
      b.target === undefined
        ? null
        : `${((i + 0.5) / count) * 100},${100 - Math.min(100, (b.target / top) * 100)}`,
    )
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={[
        styles.chart,
        dense && styles.chartDense,
        stacked && styles.chartStacked,
      ]
        .filter(Boolean)
        .join(" ")}
    >
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
            {/* A white edge keeps the dots readable over the bars. */}
            <polyline
              className={styles.planHalo}
              points={planPoints}
              vectorEffect='non-scaling-stroke'
            />
            <polyline points={planPoints} vectorEffect='non-scaling-stroke' />
          </svg>
        )}

        <ol className={styles.cols} style={columns}>
          {buckets.map((b, i) => {
            const edge =
              i < 2 ? styles.tipStart : i >= count - 2 ? styles.tipEnd : "";
            const met =
              b.target !== undefined && !b.future && b.value >= b.target;
            const parts = CHANNELS.map((c) => ({
              ...c,
              value: b.parts?.[c.key] ?? 0,
            })).filter((c) => c.value > 0);
            const extra = b.future ? undefined : note?.(b);
            const describe = b.future
              ? `${b.title}: still to come${b.target !== undefined ? `, plan ${n(b.target)}` : ""}`
              : [
                  `${b.title}: ${n(b.value)} ${many(b.value)}`,
                  ...parts.map((p) => `${p.label} ${n(p.value)}`),
                  extra,
                  plan && b.target !== undefined
                    ? `plan ${n(b.target)}`
                    : undefined,
                  b.pace !== undefined ? `on pace for ${n(b.pace)}` : undefined,
                ]
                  .filter(Boolean)
                  .join(", ");
            return (
              <li
                key={b.key}
                className={styles.col}
                tabIndex={0}
                aria-label={describe}
              >
                {b.pace !== undefined && b.pace > b.value && (
                  <div
                    className={styles.ghost}
                    style={{ height: pct(b.pace) }}
                  />
                )}
                {!b.future && (
                  <div
                    className={[
                      styles.bar,
                      b.soFar && styles.barNow,
                      parts.length > 0 && styles.barSplit,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{ height: pct(b.value) }}
                  >
                    {parts.length > 0 && (
                      <span className={styles.stack}>
                        {parts.map((p) => (
                          <span
                            key={p.key}
                            className={`${styles.seg} ${styles[`ch_${p.key}`]}`}
                            style={{ flexGrow: p.value }}
                          />
                        ))}
                      </span>
                    )}
                    {count <= 14 && (
                      <span className={styles.barValue}>{n(b.value)}</span>
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
                        {n(b.value)} {many(b.value)}
                      </strong>
                      {parts.length > 0 && (
                        <span className={styles.tipParts}>
                          {parts.map((p) => (
                            <span key={p.key} className={styles.tipPart}>
                              <i
                                className={`${styles.swatch} ${styles[`ch_${p.key}`]}`}
                              />
                              <span>{p.label}</span>
                              <span className={styles.tipPartValue}>
                                {n(p.value)}
                              </span>
                            </span>
                          ))}
                        </span>
                      )}
                      {extra && <span className={styles.tipLine}>{extra}</span>}
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
