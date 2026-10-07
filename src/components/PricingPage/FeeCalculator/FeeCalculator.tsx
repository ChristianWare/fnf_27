"use client";

// What per-booking fees cost in a year, next to the Full Platform's flat
// price. The two cards on the left are the inputs; the two on the right
// update as you type.

import { useState } from "react";
import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./FeeCalculator.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import Logo from "@/components/shared/Logo/Logo";
import PaymentImg from "../../../../public/images/takePayments.jpg";

const PLATFORM_PER_YEAR = 499 * 12; // $5,988

const wholeDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const withCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function money(value: number) {
  return Number.isInteger(value)
    ? wholeDollars.format(value)
    : withCents.format(value);
}

// Turn what's typed into a number we can use: never negative, never huge.
function toNumber(value: string, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
}

export default function FeeCalculator() {
  const [rides, setRides] = useState("200");
  const [fee, setFee] = useState("5");

  const ridesPerMonth = Math.round(toNumber(rides, 100000));
  const feePerBooking = Math.round(toNumber(fee, 1000) * 100) / 100;
  const yearly = Math.round(ridesPerMonth * feePerBooking * 12 * 100) / 100;

  return (
    <section className={styles.container}>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <EyeBrow text='Fee calculator' />
            <h2 className={styles.heading} data-reveal data-reveal-style='fade'>
              What per-booking fees cost you in a year
            </h2>
          </div>

          <div className={styles.grid} data-reveal>
            <label className={`${styles.card} ${styles.rides}`}>
              <span className={styles.label}>Rides per month</span>
              <input
                className={styles.input}
                type='number'
                inputMode='numeric'
                min={0}
                step={1}
                value={rides}
                onChange={(e) => setRides(e.target.value)}
              />
            </label>

            <label className={`${styles.card} ${styles.fee}`}>
              <span className={styles.label}>Fee per booking ($)</span>
              <span className={styles.inputRow}>
                <span className={styles.prefix} aria-hidden='true'>
                  $
                </span>
                <input
                  className={styles.input}
                  type='number'
                  inputMode='decimal'
                  min={0}
                  step={0.5}
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                />
              </span>
            </label>

            <div className={styles.photo}>
              <Image
                src={PaymentImg}
                alt='A customer paying by card on a laptop'
                fill
                sizes='(max-width: 968px) 1px, 32vw'
                className={styles.img}
              />
            </div>

            <div className={`${styles.card} ${styles.yearly}`}>
              <span className={styles.label}>Your booking fees, per year</span>
              <output className={styles.value} aria-live='polite'>
                {money(yearly)}
              </output>
            </div>

            <div className={`${styles.card} ${styles.platform}`}>
              <span className={styles.label}>Full Platform, per year</span>
              <span className={styles.valueGroup}>
                <span className={styles.value}>{money(PLATFORM_PER_YEAR)}</span>
                <span className={styles.small}>Plus a one-time $500 setup</span>
              </span>
            </div>
          </div>

          <div className={styles.notes}>
            <p>
              Example: 200 rides a month at $5 per booking is $12,000 a year.
            </p>
            <p>
              Enter your own numbers. We don&apos;t guess at anyone else&apos;s
              fees.
            </p>
          </div>

          <div className={styles.bar} data-reveal>
            <div className={styles.barLeft}>
              <Logo noText blur='blur' />
              <p className={styles.result}>
                At {ridesPerMonth.toLocaleString("en-US")} rides a month and{" "}
                {money(feePerBooking)} per booking, you pay {money(yearly)} a
                year in booking fees. The Full Platform is a flat $5,988 a year
                ($499 × 12, plus the one-time $500 setup), with no per-booking
                fees.
              </p>
            </div>
            <Button
              href='/services/booking-software'
              btnType='white'
              text='See the Full Platform'
              arrow
            />
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
