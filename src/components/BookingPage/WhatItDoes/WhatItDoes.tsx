"use client";

// What the Full Platform does, laid out like the services on the home
// page: the intro and a list of the eight parts stay on the left while
// the cards scroll by on the right, and the list marks the card that's in
// view. Each card has a small piece of the software next to it (built in
// HTML, in Vignettes.tsx) and a link to that part of the feature list.

import { useEffect, useRef, useState } from "react";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./WhatItDoes.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
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

const features = [
  {
    id: 1,
    title: "Direct booking",
    tag: "Booking · on your site, under your name",
    bullets: [
      "A live estimate as they book",
      "Point-to-point, hourly or flat rate",
      "Airport pickups with flight details",
      "Extra stops, passengers and luggage",
      "Guests book without an account",
    ],
    btnText: "See every booking feature",
    href: "#features-booking",
    Art: DirectBookingArt,
  },
  {
    id: 2,
    title: "Multi-ride trips",
    tag: "Booking · one trip, one bill",
    bullets: [
      "Up to ten rides in one trip",
      "Each ride its own time and vehicle",
      "One estimate, one payment",
      "Discount codes and share links",
    ],
    btnText: "See every booking feature",
    href: "#features-booking",
    Art: MultiRideArt,
  },
  {
    id: 3,
    title: "Dispatch and the driver portal",
    tag: "Dispatch · you assign, they drive",
    bullets: [
      "Assign a driver and a vehicle",
      "Conflict warnings on the driver's day",
      "Their schedule on their phone",
      "En route, arrived, picked up, done",
      "Riders texted at each step",
    ],
    btnText: "See every dispatch feature",
    href: "#features-dispatch",
    Art: DriverPortalArt,
  },
  {
    id: 4,
    title: "Flight tracking",
    tag: "Dispatch · for airport pickups",
    bullets: [
      "The flight's live status on the booking",
      "Terminal, gate and delays",
      "For you and for the driver",
      "Refresh any time before pickup",
    ],
    btnText: "See every dispatch feature",
    href: "#features-dispatch",
    Art: FlightTrackingArt,
  },
  {
    id: 5,
    title: "Payments",
    tag: "Payments · through your own Stripe account",
    bullets: [
      "Pay by link, no login needed",
      "Deposits with a balance due date",
      "Card on file, and cash recorded",
      "Refunds, full or partial",
      "Tips go to the driver",
    ],
    btnText: "See every payment feature",
    href: "#features-payments",
    Art: PaymentsArt,
  },
  {
    id: 6,
    title: "Automatic reminders",
    tag: "Riders · sent by the system",
    bullets: [
      "24 hours and 2 hours before pickup",
      "A nudge when a payment link sits unpaid",
      "A receipt and invoice when they pay",
      "You hear about rides that need attention",
    ],
    btnText: "See every rider feature",
    href: "#features-riders",
    Art: RemindersArt,
  },
  {
    id: 7,
    title: "Corporate accounts",
    tag: "Accounts · a portal for each company",
    bullets: [
      "Book for employees, with cost centers",
      "A negotiated rate, applied by itself",
      "Net terms, or a card on file",
      "Spend by month, department and person",
      "Inquiries from your site, approved in a click",
    ],
    btnText: "See every corporate feature",
    href: "#features-corporate",
    Art: CorporateArt,
  },
  {
    id: 8,
    title: "Admin dashboard",
    tag: "Admin · the whole business in one place",
    bullets: [
      "Today's rides and what needs you",
      "Approve, price and assign each ride",
      "Earnings, driver pay and reports",
      "Services, rates, vehicles and airports",
      "Discount codes and company settings",
    ],
    btnText: "See every admin feature",
    href: "#features-admin",
    Art: AdminArt,
  },
];

export default function WhatItDoes() {
  const listRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(features[0].id);

  // The card crossing the middle of the screen is the active one.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const cards = Array.from(list.querySelectorAll<HTMLElement>("[data-id]"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setActive(Number((entry.target as HTMLElement).dataset.id));
        });
      },
      // A thin band just above the middle of the screen.
      { rootMargin: "-40% 0px -55% 0px" },
    );
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <section className={styles.container} aria-labelledby='what-it-does'>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          {/* Stays put while the cards scroll past it. */}
          <div className={styles.left}>
            <div className={styles.intro}>
              <EyeBrow text='What it does' />
              <h2
                id='what-it-does'
                className={styles.heading}
                data-reveal
                data-reveal-style='fade'
              >
                Everything a Ride Needs in One System
              </h2>
              <p className={styles.copy} data-reveal>
                Eight parts of the Full Platform, from the first click on your
                site to the money in your account. Every feature in each part is
                listed further down.
              </p>
            </div>

            <nav className={styles.nav} aria-label='What it does' data-reveal>
              <ul className={styles.navList}>
                {features.map((x) => (
                  <li key={x.id}>
                    <a
                      href={`#feature-${x.id}`}
                      className={`${styles.navLink} ${
                        x.id === active ? styles.navLinkActive : ""
                      }`}
                      aria-current={x.id === active ? "true" : undefined}
                    >
                      {x.title}
                      <Arrow className={styles.navArrow} aria-hidden='true' />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div ref={listRef} className={styles.cards}>
            {features.map(({ Art, ...x }, index) => (
              <article
                className={styles.row}
                key={x.id}
                id={`feature-${x.id}`}
                data-id={x.id}
                data-reveal
              >
                <div className={styles.card}>
                  <div className={styles.cardTop}>
                    <span className={styles.number} aria-hidden='true'>
                      0{index + 1}
                    </span>
                    <h3 className={styles.title}>{x.title}</h3>
                    <p className={styles.price}>{x.tag}</p>
                  </div>
                  <ul className={styles.bullets}>
                    {x.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                  <div className={styles.btnContainer}>
                    <Button href={x.href} btnType='gray' text={x.btnText} />
                  </div>
                </div>
                {/* Decorative: the card beside it says what it is. */}
                <div className={styles.art} aria-hidden='true'>
                  <div className={styles.artInner}>
                    <Art />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
