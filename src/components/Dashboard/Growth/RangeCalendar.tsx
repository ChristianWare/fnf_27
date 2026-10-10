"use client";

// Picking a first and a last day: our own calendar, two months side by
// side on a computer and one on a phone, in the shared Modal. Only days
// they've had the site with us, up to the latest numbers, can be picked.
// Arrow keys move a day or a week, Page Up and Page Down a month.

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "../icons";
import { ui } from "../ui/ui";
import styles from "./Growth.module.css";
import {
  addDays,
  addMonths,
  daysFrom,
  daysInMonth,
  fmtDayLong,
  fmtMonthYear,
  fmtSpan,
  maxDay,
  minDay,
  endOfMonth,
  startOfMonth,
  weekday,
} from "@/lib/growth/dates";

type Span = { from: string; to: string };

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const LONG = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
const spoken = (day: string) => LONG.format(new Date(`${day}T00:00:00Z`));

export default function RangeCalendar({
  open,
  min,
  max,
  value,
  onClose,
  onApply,
}: {
  open: boolean;
  /** Launch day: nothing earlier. */
  min: string;
  /** The latest day with numbers. */
  max: string;
  value?: Span;
  onClose: () => void;
  onApply: (span: Span) => void;
}) {
  return (
    <Modal isOpen={open} onClose={onClose} size='fit' label='Choose dates'>
      {open && (
        <Picker
          min={min}
          max={max}
          value={value}
          onClose={onClose}
          onApply={onApply}
        />
      )}
    </Modal>
  );
}

function Picker({
  min,
  max,
  value,
  onClose,
  onApply,
}: {
  min: string;
  max: string;
  value?: Span;
  onClose: () => void;
  onApply: (span: Span) => void;
}) {
  const [start, setStart] = useState<string | undefined>(value?.from);
  const [end, setEnd] = useState<string | undefined>(value?.to);
  const [hover, setHover] = useState<string>();
  // The month on the right (the only one on a phone).
  const [view, setView] = useState(startOfMonth(value?.to ?? max));
  const [focus, setFocus] = useState(value?.to ?? max);
  const grid = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  const clamp = (day: string) => maxDay(min, minDay(day, max));
  const minMonth = startOfMonth(min);
  const maxMonth = startOfMonth(max);

  // Keyboard focus follows the day it moved to.
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    grid.current
      ?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)
      ?.focus();
  }, [focus, view]);

  const pick = (day: string) => {
    setFocus(day);
    if (!start || end) {
      setStart(day);
      setEnd(undefined);
    } else if (day < start) {
      setStart(day);
    } else {
      setEnd(day);
    }
  };

  const preset = (from: string) => {
    const a = clamp(from);
    setStart(a);
    setEnd(max);
    setFocus(max);
    setView(maxMonth);
  };

  const moveTo = (day: string) => {
    const next = clamp(day);
    moved.current = true;
    setFocus(next);
    const month = startOfMonth(next);
    // Keep it in sight: on the right, or the month before it.
    if (month > view) setView(month);
    else if (month < addMonths(view, -1)) setView(addMonths(month, 1));
    else if (
      month < view &&
      typeof window !== "undefined" &&
      window.innerWidth <= 768
    )
      setView(month);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, () => string> = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      Home: () => addDays(focus, -weekday(focus)),
      End: () => addDays(focus, 6 - weekday(focus)),
      PageUp: () => {
        const m = addMonths(focus, -1);
        return `${m.slice(0, 8)}${String(Math.min(Number(focus.slice(8)), daysInMonth(m))).padStart(2, "0")}`;
      },
      PageDown: () => {
        const m = addMonths(focus, 1);
        return `${m.slice(0, 8)}${String(Math.min(Number(focus.slice(8)), daysInMonth(m))).padStart(2, "0")}`;
      },
    };
    const go = step[e.key];
    if (!go) return;
    e.preventDefault();
    moveTo(go());
  };

  // The one day Tab lands on: where they were, or the first one in sight.
  const tabDay =
    focus >= addMonths(view, -1) && focus <= endOfMonth(view)
      ? focus
      : clamp(view);

  // What the range would be if they picked where they're pointing.
  const lo = start && !end && hover ? minDay(start, hover) : start;
  const hi = start && !end && hover ? maxDay(start, hover) : end;

  const month = (first: string, hiddenOnPhone: boolean) => {
    const lead = weekday(first);
    const count = daysInMonth(first);
    const cells: (string | null)[] = [
      ...Array<null>(lead).fill(null),
      ...Array.from(
        { length: count },
        (_, i) => `${first.slice(0, 8)}${String(i + 1).padStart(2, "0")}`,
      ),
    ];
    while (cells.length % 7) cells.push(null);
    return (
      <div
        className={`${styles.calMonth} ${hiddenOnPhone ? styles.calMonthFirst : ""}`}
        key={first}
      >
        <span className={styles.calMonthName}>{fmtMonthYear(first)}</span>
        <div
          className={styles.calGrid}
          role='grid'
          aria-label={fmtMonthYear(first)}
        >
          <div className={styles.calRow} role='row'>
            {WEEKDAYS.map((d) => (
              <span key={d} className={styles.calWeekday} role='columnheader'>
                {d}
              </span>
            ))}
          </div>
          {Array.from({ length: cells.length / 7 }, (_, w) => (
            <div key={w} className={styles.calRow} role='row'>
              {cells.slice(w * 7, w * 7 + 7).map((day, i) => {
                if (!day)
                  return (
                    <span
                      key={`e${i}`}
                      className={styles.calEmpty}
                      role='gridcell'
                    />
                  );
                const off = day < min || day > max;
                const isStart = day === lo;
                const isEnd = day === hi;
                const inside = lo && hi && day > lo && day < hi;
                const state = [
                  isStart && styles.calStart,
                  isEnd && styles.calEnd,
                  inside && styles.calInside,
                  lo && hi && lo !== hi && (isStart || isEnd) && styles.calEdge,
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <span key={day} role='gridcell' className={styles.calCell}>
                    <button
                      type='button'
                      data-day={day}
                      className={`${styles.calDay} ${state}`}
                      disabled={off}
                      tabIndex={day === tabDay ? 0 : -1}
                      aria-pressed={isStart || isEnd ? true : undefined}
                      aria-label={`${spoken(day)}${isStart ? ", first day" : ""}${isEnd ? ", last day" : ""}${off ? ", no numbers" : ""}`}
                      onClick={() => pick(day)}
                      onMouseEnter={() => setHover(day)}
                      onFocus={() => setFocus(day)}
                    >
                      {Number(day.slice(8))}
                    </button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ready = Boolean(start && end);
  const days = start && end ? daysFrom(start, end) + 1 : 0;

  return (
    <div className={`${ui.modalBody} ${styles.cal}`}>
      <span className={ui.monoMuted}>Custom dates</span>
      <h2 className={ui.modalTitle}>Choose the dates</h2>
      <div className={ui.chips} role='group' aria-label='Quick picks'>
        {(
          [
            ["Last 7 days", addDays(max, -6)],
            ["Last 90 days", addDays(max, -89)],
            ["Last 12 months", addDays(max, -364)],
            ["Since launch", min],
          ] as const
        ).map(([label, from]) => (
          <button
            key={label}
            type='button'
            className={ui.chip}
            aria-pressed={start === clamp(from) && end === max}
            onClick={() => preset(from)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.calNav}>
        <button
          type='button'
          className={styles.calStep}
          onClick={() => setView((v) => addMonths(v, -1))}
          disabled={view <= minMonth}
          aria-label='Earlier month'
        >
          <Icon name='arrow' className={styles.calBack} />
        </button>
        <button
          type='button'
          className={styles.calStep}
          onClick={() => setView((v) => addMonths(v, 1))}
          disabled={view >= maxMonth}
          aria-label='Later month'
        >
          <Icon name='arrow' />
        </button>
      </div>

      <div
        ref={grid}
        className={styles.calMonths}
        onKeyDown={onKey}
        onMouseLeave={() => setHover(undefined)}
      >
        {month(addMonths(view, -1), true)}
        {month(view, false)}
      </div>

      <p className={styles.calSummary} aria-live='polite'>
        {start && end
          ? `${fmtSpan(start, end)} · ${days} ${days === 1 ? "day" : "days"}`
          : start
            ? `From ${fmtDayLong(start)}. Now pick the last day.`
            : `Pick the first day. Your numbers go from ${fmtDayLong(min)} to ${fmtDayLong(max)}.`}
      </p>

      <div className={ui.modalActions}>
        <button
          type='button'
          className={`${ui.btn} ${ui.btn_light}`}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type='button'
          className={`${ui.btn} ${ui.btn_black}`}
          disabled={!ready}
          onClick={() => start && end && onApply({ from: start, to: end })}
        >
          Show these dates
          <Icon name='check' className={ui.btnIcon} />
        </button>
      </div>
    </div>
  );
}
