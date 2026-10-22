"use client";

// What per-booking fees cost a year, next to the flat $499. The operator
// enters rides a month, the average fare and the platform's cut; card
// processing is left out on both sides, since every option pays it.

import { useId, useState } from "react";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import styles from "./FeeCalculator.module.css";

const FLAT = 499;

const money = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

// A typed value, kept within sensible limits.
const clamp = (value: string, min: number, max: number) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

export default function FeeCalculator({
  standalone = false,
}: {
  /**
   * On its own page (/tools/booking-fee-calculator) the title is the
   * page's h1 and the card links to the booking software; on the booking
   * page it's an h2 and links to the full math.
   */
  standalone?: boolean;
}) {
  const id = useId();
  const Heading = standalone ? "h1" : "h2";
  const [rides, setRides] = useState(200);
  const [fare, setFare] = useState(120);
  const [percent, setPercent] = useState(15);

  const monthlyFees = rides * fare * (percent / 100);
  const yearlyFees = monthlyFees * 12;
  const yearlySaved = (monthlyFees - FLAT) * 12;

  return (
    <section className={styles.container} aria-labelledby={`${id}-title`}>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <EyeBrow text='Fee calculator' />
            <Heading
              id={`${id}-title`}
              className={`${styles.heading} ${standalone ? "heading2" : "h3"}`}
              data-reveal
              data-reveal-style='fade'
            >
              {standalone
                ? "Booking Fee Calculator for Limo Operators"
                : "What per-booking fees cost you in a year"}
            </Heading>
            <p className={styles.copy} data-reveal>
              {standalone
                ? "See what a booking platform's per-booking fee costs you in a month and a year, next to a flat monthly price. Enter last month's numbers. Card processing isn't included on either side, since every option pays it."
                : "Enter last month's numbers. Card processing isn't included on either side, since every option pays it."}
            </p>

            <div className={styles.fields} data-reveal>
              <label className={styles.field}>
                <span className={styles.mono}>Rides a month</span>
                <input
                  type='number'
                  inputMode='numeric'
                  min={0}
                  max={10000}
                  value={rides}
                  onChange={(e) => setRides(clamp(e.target.value, 0, 10000))}
                  className={styles.input}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.mono}>Average fare ($)</span>
                <input
                  type='number'
                  inputMode='decimal'
                  min={0}
                  max={5000}
                  value={fare}
                  onChange={(e) => setFare(clamp(e.target.value, 0, 5000))}
                  className={styles.input}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.mono}>Platform fee (%)</span>
                <input
                  type='number'
                  inputMode='decimal'
                  min={0}
                  max={50}
                  step={0.5}
                  value={percent}
                  onChange={(e) => setPercent(clamp(e.target.value, 0, 50))}
                  className={styles.input}
                />
              </label>
            </div>
          </div>

          <div className={styles.result} aria-live='polite' data-reveal>
            <div className={styles.row}>
              <span className={styles.mono}>Per-booking fees, a year</span>
              <span className={styles.big}>{money(yearlyFees)}</span>
              <span className={styles.small}>{money(monthlyFees)} a month</span>
            </div>
            <div className={styles.row}>
              <span className={styles.mono}>The Full Platform, a year</span>
              <span className={styles.big}>{money(FLAT * 12)}</span>
              <span className={styles.small}>
                {money(FLAT)} a month, website and leads tool included
              </span>
            </div>
            <p className={styles.verdict}>
              {yearlySaved > 0
                ? `You'd keep about ${money(yearlySaved)} a year.`
                : "At this volume, the fees cost less than $499 a month. The case for switching is owning your site and your customers, not the fee."}
            </p>
            <Button
              href={
                standalone
                  ? "/services/booking-software"
                  : "/journal/what-per-booking-fees-really-cost"
              }
              btnType='white'
              text={standalone ? "See the Full Platform" : "See the math in full"}
              arrow
            />
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
