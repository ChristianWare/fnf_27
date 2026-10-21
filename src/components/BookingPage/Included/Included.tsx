// Everything the $499 covers, as one checklist, against the way most limo
// software is sold: a base price plus modules, seats and per-trip fees.

import LayoutWrapper from "@/components/shared/LayoutWrapper";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import styles from "./Included.module.css";

const included = [
  "Your custom website, with airport, route and city pages",
  "Online booking with a live price, 24/7",
  "Dispatch, with conflict warnings",
  "The driver portal, on any phone, nothing to install",
  "Flight tracking for airport pickups",
  "Payments through your own Stripe account",
  "Automatic reminders and receipts",
  "Corporate accounts with their own portal",
  "The admin dashboard and reports",
  "The leads tool",
  "Unlimited drivers and vehicles",
  "Setup done for you, from an export of your current system",
];

const never = [
  "Per-booking or per-trip fees",
  "Per-driver or per-vehicle fees",
  "Add-on modules",
  "A long-term contract",
];

export default function Included() {
  return (
    <section className={styles.container} aria-labelledby='included'>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <EyeBrow text='Included' />
            <h2
              id='included'
              className={`${styles.heading} h3`}
              data-reveal
              data-reveal-style='fade'
            >
              Everything&apos;s included for $499. Nothing is sold as a module.
            </h2>
            <p className={styles.copy} data-reveal>
              Most limo software starts with a base price, then adds a
              passenger app, text messaging, extra seats or a fee on every
              trip. Here it&apos;s one flat price for all of it, plus a
              one-time $500 setup.
            </p>
          </div>

          <div className={styles.right}>
            <ul className={styles.list} data-reveal>
              {included.map((item) => (
                <li key={item} className={styles.yes}>
                  {item}
                </li>
              ))}
            </ul>
            <div className={styles.never} data-reveal>
              <p className={styles.mono}>What you&apos;ll never pay for</p>
              <ul className={styles.neverList}>
                {never.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className={styles.cancel}>
                Month to month. Cancel anytime, and your customer list is
                yours to export.
              </p>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
