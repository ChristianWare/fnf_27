"use client";

// The hero's booking calendar: this month (in the visitor's own time) laid
// over the subSnow photo. Open days show the photo; a few booked days are
// blocked off. Which days are booked is picked from the month
// itself, so a month always looks the same and December looks different
// from November. Every size is in container units, so the calendar scales
// like an image and keeps its shape at any width.

import { useSyncExternalStore } from "react";
import Image from "next/image";
import SubSnow from "../../../../public/images/subSnow.png";
import styles from "./HeroCalendar.module.css";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const BOOKED_PER_MONTH = 6;

// Today as "y-m-d" (month 0-based), checked once a minute so the calendar
// rolls over at midnight and at the start of a new month.
const subscribe = (cb: () => void) => {
  const id = window.setInterval(cb, 60_000);
  return () => window.clearInterval(id);
};
const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** A few days of the month, the same ones every time for that month. */
function bookedDays(year: number, month: number, daysInMonth: number) {
  let seed = (year * 12 + month) % 233280;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const days = new Set<number>();
  while (days.size < BOOKED_PER_MONTH) {
    days.add(1 + Math.floor(rand() * daysInMonth));
  }
  return days;
}

export default function HeroCalendar({
  initialKey,
  title = "Executive SUV",
  see = "photo",
}: {
  /** Today when the page was rendered; the browser's own date takes over. */
  initialKey: string;
  title?: string;
  /**
   * What shows through the open days. "photo" (the default) is subSnow.png.
   * "through" leaves the grid see-through, so whatever sits behind the
   * calendar (a video, say) shows in the open days, and paints the rest of
   * the card white.
   */
  see?: "photo" | "through";
}) {
  const key = useSyncExternalStore(subscribe, todayKey, () => initialKey);
  const [year, month, today] = key.split("-").map(Number);

  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday first
  const booked = bookedDays(year, month, daysInMonth);
  const monthLabel = first.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Always six weeks, so the calendar never changes shape.
  const cells = Array.from({ length: 42 }, (_, i) => {
    const day = i - lead + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  return (
    <div
      className={`${styles.card} ${see === "through" ? styles.through : ""}`}
      role='img'
      aria-label={`Booking calendar for ${monthLabel}, ${booked.size} days booked`}
    >
      <div className={styles.inner}>
        <div className={styles.head}>
          <p className={styles.title}>{title}</p>
          <p className={styles.month}>{monthLabel}</p>
        </div>

        <div className={styles.weekdays}>
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className={styles.gridWrap}>
          {see === "photo" && (
            <Image
              src={SubSnow}
              alt=''
              fill
              priority
              placeholder='blur'
              sizes='(max-width: 1268px) 90vw, 640px'
              className={styles.photo}
            />
          )}
          <div className={styles.grid}>
            {cells.map((day, i) => {
              if (day === null) {
                return <span key={`e${i}`} className={styles.empty} />;
              }
              const isBooked = booked.has(day);
              return (
                <span
                  key={day}
                  className={`${styles.day} ${isBooked ? styles.booked : styles.open}`}
                >
                  <span
                    className={`${styles.num} ${day === today ? styles.today : ""}`}
                  >
                    {day}
                  </span>
                  {isBooked && <span className={styles.tag}>Booked</span>}
                </span>
              );
            })}
          </div>
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.swatch} ${styles.swatchBooked}`} />
            Booked
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.swatch} ${styles.swatchOpen}`} />
            Open
          </span>
        </div>
      </div>
    </div>
  );
}
