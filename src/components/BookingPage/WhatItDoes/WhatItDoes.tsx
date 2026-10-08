// What the Full Platform does: eight cards, each with a small piece of the
// software on top (built in HTML, in Vignettes.tsx), the same shape as the
// Journal cards.

import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./WhatItDoes.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import {
  AdminArt,
  CorporateArt,
  DirectBookingArt,
  DriverPortalArt,
  FlightTrackingArt,
  MultiRideArt,
  PaymentsArt,
  RemindersArt,
} from "./Vignettes";

// Each card's picture sits on one of the accent colors, in order across
// the row.
const features = [
  {
    id: 1,
    tag: "Booking",
    title: "Direct booking",
    desc: "Riders choose the service, pickup time, route and vehicle, and see the price before they book.",
    Art: DirectBookingArt,
    tone: styles.toneOne,
  },
  {
    id: 2,
    tag: "Booking",
    title: "Multi-ride trips",
    desc: "Round trips and multi-day itineraries in one booking, with one payment.",
    Art: MultiRideArt,
    tone: styles.toneTwo,
  },
  {
    id: 3,
    tag: "Dispatch",
    title: "Dispatch and the driver portal",
    desc: "Assign rides, and drivers see their schedule and update each trip's status from their phone.",
    Art: DriverPortalArt,
    tone: styles.toneThree,
  },
  {
    id: 4,
    tag: "Dispatch",
    title: "Flight tracking",
    desc: "Airport pickups follow the actual landing time.",
    Art: FlightTrackingArt,
    tone: styles.toneFour,
  },
  {
    id: 5,
    tag: "Payments",
    title: "Payments",
    desc: "Deposits, full payment, card on file, payment links by email, cash recorded by hand, and refunds.",
    Art: PaymentsArt,
    tone: styles.toneOne,
  },
  {
    id: 6,
    tag: "Riders",
    title: "Automatic reminders",
    desc: "Riders get a reminder 24 hours and 2 hours before pickup, and a payment reminder if a link goes unpaid.",
    Art: RemindersArt,
    tone: styles.toneTwo,
  },
  {
    id: 7,
    tag: "Accounts",
    title: "Corporate accounts",
    desc: "Company accounts, their passengers, and invoices.",
    Art: CorporateArt,
    tone: styles.toneThree,
  },
  {
    id: 8,
    tag: "Admin",
    title: "Admin dashboard",
    desc: "Bookings, calendar, earnings, driver pay, reports and discount codes.",
    Art: AdminArt,
    tone: styles.toneFour,
  },
];

export default function WhatItDoes() {
  return (
    <section className={styles.container} aria-labelledby='what-it-does'>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.topLeft}>
              <EyeBrow text='What it does' />
              <h2
                id='what-it-does'
                className={styles.heading}
                data-reveal
                data-reveal-style='fade'
              >
                Everything a Ride Needs in One System
              </h2>
            </div>
            <span className={styles.count} data-reveal>
              ({String(features.length).padStart(2, "0")} features)
            </span>
          </div>

          <ul className={styles.grid}>
            {features.map(({ Art, ...feature }) => (
              <li className={styles.card} key={feature.id} data-reveal='each'>
                {/* Decorative: the title and text under it say what it is. */}
                <div
                  className={`${styles.art} ${feature.tone}`}
                  aria-hidden='true'
                >
                  <Art />
                </div>
                <div className={styles.text}>
                  <div className={styles.meta}>
                    <span className={styles.tag}>{feature.tag}</span>
                    <span className={styles.number}>
                      {String(feature.id).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className={`${styles.title} h6`}>{feature.title}</h3>
                  <p className={styles.desc}>{feature.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </LayoutWrapper>
    </section>
  );
}
