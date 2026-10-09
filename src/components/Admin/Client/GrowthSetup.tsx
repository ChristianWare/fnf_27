"use client";

// Everything behind a client's Growth page, entered by hand: this month's
// numbers, their 12-month plan with each month's actual visitors, this
// month's notes and their weekly habits. It all shows on their Growth page
// as soon as you save.

import { useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { useAction } from "@/components/Dashboard/useAction";
import { ui } from "@/components/Dashboard/ui/ui";
import {
  publishGrowthNotes,
  saveGrowthHabits,
  saveGrowthNumbers,
  saveGrowthPlan,
} from "@/app/admin/build-actions";
import { firstOfMonth } from "@/lib/dashboard/billing";
import { fmtMonth, fmtMonthLong } from "@/lib/dashboard/format";
import type { Growth } from "@/lib/dashboard/types";
import styles from "./Client.module.css";

const STANDARD = [
  100, 150, 250, 400, 600, 900, 1300, 1800, 2400, 3100, 4000, 5000,
];

const num = (value: string) => Number(value.replace(/[^\d.]/g, "")) || 0;

export default function GrowthSetup({
  clientId,
  growth,
  live,
  launchedAt,
  firstName,
  now,
}: {
  clientId: string;
  growth?: Growth;
  live: boolean;
  launchedAt?: string;
  firstName: string;
  now: string;
}) {
  const { run, pending } = useAction();

  const months =
    growth?.months.map((m) => m.month) ??
    Array.from({ length: 12 }, (_, i) => firstOfMonth(launchedAt ?? now, i));
  const thisMonth = firstOfMonth(now);

  const [numbers, setNumbers] = useState({
    monthToDate: String(growth?.monthToDate ?? 0),
    callsNow: String(growth?.calls.monthToDate ?? 0),
    callsLast: String(growth?.calls.lastMonth ?? 0),
    bookingsLabel: growth?.bookings.label ?? "Bookings",
    bookingsNow: String(growth?.bookings.monthToDate ?? 0),
    bookingsLast: String(growth?.bookings.lastMonth ?? 0),
    reviews: String(growth?.reviews.total ?? 0),
    reviewsNew: String(growth?.reviews.newThisMonth ?? 0),
    rating: String(growth?.reviews.rating ?? 0),
  });
  const [targets, setTargets] = useState<number[]>(
    growth?.months.map((m) => m.target) ?? STANDARD,
  );
  const [actuals, setActuals] = useState<string[]>(
    growth?.months.map((m) =>
      m.actual === undefined ? "" : String(m.actual),
    ) ?? Array(12).fill(""),
  );
  const [notes, setNotes] = useState<string[]>(
    growth?.notes.length ? growth.notes : [""],
  );
  const [habits, setHabits] = useState(
    growth?.habits.map((h) => h.text) ?? [
      "Ask three riders for a Google review",
      "Post one photo to your Google profile",
    ],
  );

  const field = (
    key: keyof typeof numbers,
    label: string,
    mode: "numeric" | "decimal" | "text" = "numeric",
  ) => (
    <label className={styles.source}>
      <span className={ui.label}>{label}</span>
      <input
        className={ui.input}
        inputMode={mode === "text" ? undefined : mode}
        value={numbers[key]}
        onChange={(e) => setNumbers((n) => ({ ...n, [key]: e.target.value }))}
      />
    </label>
  );

  return (
    <div className={styles.split}>
      <div className={styles.column}>
        {!live && (
          <div className={ui.notice}>
            <Icon name='info' className={ui.noticeIcon} />
            <p>
              {firstName}&apos;s Growth page opens on launch day. Set it up now
              so it&apos;s ready the moment the site goes live.
            </p>
          </div>
        )}

        <section className={styles.card}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>This month&apos;s numbers</h2>
            <p>
              From Plausible, Search Console and their Google profile. Update
              them whenever you look; {firstName} sees them straight away.
            </p>
          </div>
          <div className={styles.sources}>
            {field("monthToDate", "Visitors from search, so far")}
            {field("bookingsLabel", "What counts as a booking", "text")}
            {field("callsNow", "Calls from Google, this month")}
            {field("callsLast", "Calls, last month")}
            {field("bookingsNow", "Bookings, this month")}
            {field("bookingsLast", "Bookings, last month")}
            {field("reviews", "Google reviews in total")}
            {field("reviewsNew", "New reviews this month")}
            {field("rating", "Average rating", "decimal")}
          </div>
          <div className={styles.actions}>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    saveGrowthNumbers(clientId, {
                      monthToDate: num(numbers.monthToDate),
                      calls: {
                        monthToDate: num(numbers.callsNow),
                        lastMonth: num(numbers.callsLast),
                      },
                      bookings: {
                        label: numbers.bookingsLabel,
                        monthToDate: num(numbers.bookingsNow),
                        lastMonth: num(numbers.bookingsLast),
                      },
                      reviews: {
                        total: num(numbers.reviews),
                        newThisMonth: num(numbers.reviewsNew),
                        rating: num(numbers.rating),
                      },
                    }),
                  () => ({
                    message: "Numbers saved",
                    detail: `They're on ${firstName}'s Growth page now.`,
                  }),
                )
              }
            >
              Save numbers
            </button>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div className={styles.titles}>
              <h2 className={styles.heading}>
                {firstName}&apos;s 12-month plan
              </h2>
              <p>
                Visitors from search each month: the target (the dotted line on
                their chart) and, once a month is over, what they got.
              </p>
            </div>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
              onClick={() => setTargets(STANDARD)}
            >
              Use the standard plan
            </button>
          </div>
          <div className={styles.targets}>
            {targets.map((target, i) => {
              const over = months[i] && months[i] < thisMonth;
              return (
                <div key={i} className={styles.target}>
                  <span className={ui.monoMuted}>
                    {months[i] ? fmtMonth(months[i]) : `Month ${i + 1}`}
                  </span>
                  <input
                    className={ui.input}
                    inputMode='numeric'
                    value={String(target)}
                    onChange={(e) => {
                      const value = num(e.target.value);
                      setTargets((t) => t.map((x, j) => (j === i ? value : x)));
                    }}
                    aria-label={`Target for month ${i + 1}`}
                  />
                  {over && (
                    <input
                      className={`${ui.input} ${styles.actual}`}
                      inputMode='numeric'
                      value={actuals[i] ?? ""}
                      placeholder='Actual'
                      onChange={(e) =>
                        setActuals((a) =>
                          a.map((x, j) =>
                            j === i ? e.target.value.replace(/\D/g, "") : x,
                          ),
                        )
                      }
                      aria-label={`Actual visitors for month ${i + 1}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className={styles.actions}>
            <span className={styles.help}>
              By month 12: {targets[11]?.toLocaleString("en-US")} visitors a
              month.
            </span>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    saveGrowthPlan(
                      clientId,
                      targets.map((target, i) => ({
                        target,
                        actual: actuals[i] === "" ? null : Number(actuals[i]),
                      })),
                    ),
                  () => ({
                    message: "Plan saved",
                    detail: `${firstName}'s chart is up to date.`,
                  }),
                )
              }
            >
              Save plan
            </button>
          </div>
        </section>
      </div>

      <div className={styles.column}>
        <section className={styles.card}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>
              What moved in {fmtMonthLong(now).split(" ")[0]}
            </h2>
            <p>
              Three or four lines in plain words. They show on {firstName}
              &apos;s Growth page.
            </p>
          </div>
          <ol className={styles.editList}>
            {notes.map((note, i) => (
              <li key={i} className={styles.editRow}>
                <textarea
                  className={`${ui.textarea} ${styles.shortArea}`}
                  value={note}
                  onChange={(e) =>
                    setNotes((n) =>
                      n.map((x, j) => (j === i ? e.target.value : x)),
                    )
                  }
                  placeholder='e.g. Your Sky Harbor page moved from #7 to #3.'
                  aria-label={`Note ${i + 1}`}
                />
                <button
                  type='button'
                  className={styles.remove}
                  onClick={() => setNotes((n) => n.filter((_, j) => j !== i))}
                  aria-label={`Remove note ${i + 1}`}
                >
                  <Icon name='trash' />
                </button>
              </li>
            ))}
          </ol>
          <div className={styles.actions}>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
              onClick={() => setNotes((n) => [...n, ""])}
            >
              Add a line
              <Icon name='plus' className={ui.btnIcon} />
            </button>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              disabled={!notes.some((n) => n.trim()) || pending}
              onClick={() =>
                run(
                  () => publishGrowthNotes(clientId, notes),
                  () => ({
                    message: "Notes published",
                    detail: `They're on ${firstName}'s Growth page now.`,
                  }),
                )
              }
            >
              Publish
              <Icon name='send' className={ui.btnIcon} />
            </button>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>Weekly habits</h2>
            <p>
              {firstName}&apos;s part. A checklist on their Growth page each
              week.
            </p>
          </div>
          <ol className={styles.editList}>
            {habits.map((habit, i) => (
              <li key={i} className={styles.editRow}>
                <input
                  className={ui.input}
                  value={habit}
                  onChange={(e) =>
                    setHabits((h) =>
                      h.map((x, j) => (j === i ? e.target.value : x)),
                    )
                  }
                  aria-label={`Habit ${i + 1}`}
                />
                <button
                  type='button'
                  className={styles.remove}
                  onClick={() => setHabits((h) => h.filter((_, j) => j !== i))}
                  aria-label={`Remove habit ${i + 1}`}
                >
                  <Icon name='trash' />
                </button>
              </li>
            ))}
          </ol>
          <div className={styles.actions}>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
              onClick={() => setHabits((h) => [...h, ""])}
            >
              Add a habit
              <Icon name='plus' className={ui.btnIcon} />
            </button>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              disabled={pending}
              onClick={() =>
                run(
                  () => saveGrowthHabits(clientId, habits),
                  () => ({ message: "Habits saved" }),
                )
              }
            >
              Save habits
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
