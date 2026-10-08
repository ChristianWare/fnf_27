// What the Full Platform does: eight cards, each with a screenshot of that
// part of the software on top, the same shape as the Journal cards.

import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./WhatItDoes.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import DirectBookingImg from "../../../../public/images/directBooking.png";
import MultiRideImg from "../../../../public/images/nierConfirmationPage.png";
import DriverPortalImg from "../../../../public/images/driverPortal.png";
import FlightTrackingImg from "../../../../public/images/flightTracking.png";
import PaymentsImg from "../../../../public/images/payment.png";
import RemindersImg from "../../../../public/images/notifications.png";
import CorporateImg from "../../../../public/images/corpDashboard.png";
import AdminImg from "../../../../public/images/adminDashboard.png";

const features = [
  {
    id: 1,
    tag: "Booking",
    title: "Direct booking",
    desc: "Riders choose the service, pickup time, route and vehicle, and see the price before they book.",
    src: DirectBookingImg,
    alt: "The trip details step of the booking form on an operator's own site",
  },
  {
    id: 2,
    tag: "Booking",
    title: "Multi-ride trips",
    desc: "Round trips and multi-day itineraries in one booking, with one payment.",
    src: MultiRideImg,
    alt: "The confirmation step of a booking, with every ride listed",
  },
  {
    id: 3,
    tag: "Dispatch",
    title: "Dispatch and the driver portal",
    desc: "Assign rides, and drivers see their schedule and update each trip's status from their phone.",
    src: DriverPortalImg,
    alt: "A driver's dashboard, showing the next trip and its details",
  },
  {
    id: 4,
    tag: "Dispatch",
    title: "Flight tracking",
    desc: "Airport pickups follow the actual landing time.",
    src: FlightTrackingImg,
    alt: "Live flight tracking for an airport pickup",
    // A landscape screenshot: keep its left side, where the heading is.
    position: "left top",
  },
  {
    id: 5,
    tag: "Payments",
    title: "Payments",
    desc: "Deposits, full payment, card on file, payment links by email, cash recorded by hand, and refunds.",
    src: PaymentsImg,
    alt: "The payment page for a booking, with the trip summary beside it",
  },
  {
    id: 6,
    tag: "Riders",
    title: "Automatic reminders",
    desc: "Riders get a reminder 24 hours and 2 hours before pickup, and a payment reminder if a link goes unpaid.",
    src: RemindersImg,
    alt: "The email notification settings, with each reminder switched on",
  },
  {
    id: 7,
    tag: "Accounts",
    title: "Corporate accounts",
    desc: "Company accounts, their passengers, and invoices.",
    src: CorporateImg,
    alt: "A corporate account's dashboard, with its rides and billing",
  },
  {
    id: 8,
    tag: "Admin",
    title: "Admin dashboard",
    desc: "Bookings, calendar, earnings, driver pay, reports and discount codes.",
    src: AdminImg,
    alt: "The admin dashboard, with the month's earnings and new booking requests",
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
                Everything a Ride Needs, in One System
              </h2>
            </div>
            <span className={styles.count} data-reveal>
              ({String(features.length).padStart(2, "0")} features)
            </span>
          </div>

          <ul className={styles.grid}>
            {features.map((feature) => (
              <li className={styles.card} key={feature.id} data-reveal='each'>
                <div className={styles.imgContainer}>
                  <Image
                    src={feature.src}
                    alt={feature.alt}
                    fill
                    sizes='(max-width: 568px) 100vw, (max-width: 1268px) 50vw, 25vw'
                    className={styles.img}
                    style={
                      "position" in feature
                        ? { objectPosition: feature.position }
                        : undefined
                    }
                  />
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
