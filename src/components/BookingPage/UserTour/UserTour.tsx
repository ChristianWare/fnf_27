// The platform from each seat: what the rider, the driver, the corporate
// client and you see. Each card has the same small piece of the software
// used on "What it does" (built in HTML in Vignettes.tsx).

import LayoutWrapper from "@/components/shared/LayoutWrapper";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import styles from "./UserTour.module.css";
import {
  AdminArt,
  CorporateArt,
  DirectBookingArt,
  DriverPortalArt,
} from "../WhatItDoes/Vignettes";

const seats = [
  {
    id: "rider",
    who: "Your rider",
    title: "Books and pays in about a minute",
    bullets: [
      "The price before they book, on your site",
      "A text at each step, and a reminder the day before",
      "Pays by card or by link, no account needed",
    ],
    Art: DirectBookingArt,
  },
  {
    id: "driver",
    who: "Your driver",
    title: "Everything for the ride, on their phone",
    bullets: [
      "Their schedule, with each pickup's details",
      "Flight status for airport rides",
      "One tap for en route, arrived, picked up and done",
    ],
    Art: DriverPortalArt,
  },
  {
    id: "corporate",
    who: "Your corporate clients",
    title: "Their own portal, under your name",
    bullets: [
      "Book for employees, with cost centers",
      "Their negotiated rate, applied on its own",
      "One invoice, and spend by person and month",
    ],
    Art: CorporateArt,
  },
  {
    id: "you",
    who: "You",
    title: "The whole operation on one screen",
    bullets: [
      "Every ride, driver and payment in one dashboard",
      "Assign drivers with conflict warnings",
      "Revenue, rides and driver pay in your reports",
    ],
    Art: AdminArt,
  },
];

export default function UserTour() {
  return (
    <section className={styles.container} aria-labelledby='user-tour'>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <EyeBrow text='From every seat' />
            <h2
              id='user-tour'
              className={`${styles.heading} h3`}
              data-reveal
              data-reveal-style='fade'
            >
              What your riders, drivers, clients and you each see
            </h2>
          </div>

          <ul className={styles.grid}>
            {seats.map(({ Art, ...seat }) => (
              <li className={styles.card} key={seat.id} data-reveal='each'>
                <div className={styles.text}>
                  <span className={styles.mono}>{seat.who}</span>
                  <h3 className={styles.title}>{seat.title}</h3>
                  <ul className={styles.bullets}>
                    {seat.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </div>
                {/* Decorative: the words beside it say what it is. */}
                <div className={styles.art} aria-hidden='true'>
                  <div className={styles.artInner}>
                    <Art />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </LayoutWrapper>
    </section>
  );
}
