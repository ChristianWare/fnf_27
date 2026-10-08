"use client";

// The four services. The intro and a list of the services stay on the
// left while the cards scroll by on the right, and the list marks the
// card that's in view. Clicking a name in the list scrolls to its card.

import { useEffect, useRef, useState } from "react";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Problems.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import SlideInImage from "@/components/shared/SlideInImage/SlideInImage";
import Reveal from "@/components/shared/Reveal/Reveal";
import Img1 from "../../../../public/images/leads.jpg";
import Img2 from "../../../../public/images/fullPlatformii.jpg";
import Img3 from "../../../../public/images/website.jpg";
import Img4 from "../../../../public/images/audit.jpg";

const data = [
  {
    id: 4,
    title: "Free Website Audit",
    price: "$0 · 60 seconds",
    bullets: [
      "What riders see on Google",
      "Google visibility",
      "Speed on a phone",
      "Online booking check",
      "AI search readiness",
    ],
    btnText: "Run a free website audit",
    href: "/audit",
    src: Img4,
  },
  {
    id: 1,
    title: "Leads Tool",
    price: "30 days free, no card",
    bullets: [
      "Hotels, venues and corporate accounts",
      "Upcoming events in your market",
      "Decision-maker contacts",
      "Outreach scripts for each lead",
    ],
    btnText: "Get free leads in your city",
    href: "/leads",
    src: Img1,
  },
  {
    id: 3,
    title: "Website Only",
    price: "$199/mo + $500 setup",
    bullets: [
      "Custom website",
      "SEO foundation built in",
      "Hosting and edits included",
      "Keep your booking software",
      "Upgrade anytime, no rebuild",
    ],
    btnText: "See website plans",
    href: "/services/websites",
    src: Img3,
  },
  {
    id: 2,
    title: "Full Platform",
    price: "$499/mo + $500 setup · Leads tool included",
    bullets: [
      "Website and booking software in one",
      "No per-booking fees",
      "Driver and admin portals",
      "Flight tracking and payments",
      "SEO foundation, leads tool included",
    ],
    btnText: "See the Full Platform",
    href: "/services/booking-software",
    src: Img2,
  },
];

export default function Problems() {
  const listRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(data[0].id);

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
    <section className={styles.container}>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          {/* Stays put while the cards scroll past it. */}
          <div className={styles.left}>
            <div className={styles.intro}>
              <EyeBrow text='Services' />
              <h2
                className={styles.heading}
                data-reveal
                data-reveal-style='fade'
              >
                What We Offer
              </h2>
              <p className={styles.copy} data-reveal>
                Four ways to grow a black car business: see where you stand,
                find the accounts in your market, get found on Google, and take
                bookings on your own site with no per-booking fees.
              </p>
            </div>

            <nav className={styles.nav} aria-label='Services' data-reveal>
              <ul className={styles.navList}>
                {data.map((x) => (
                  <li key={x.id}>
                    <a
                      href={`#service-${x.id}`}
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
            {data.map((x, index) => (
              <article
                className={styles.row}
                key={x.id}
                id={`service-${x.id}`}
                data-id={x.id}
                data-reveal
              >
                <div className={styles.card}>
                  <div className={styles.cardTop}>
                    <span className={styles.number} aria-hidden='true'>
                      0{index + 1}
                    </span>
                    <h3 className={styles.title}>{x.title}</h3>
                    <p className={styles.price}>{x.price}</p>
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
                <SlideInImage
                  src={x.src}
                  className={styles.imgContainer}
                  sizes='(max-width: 768px) 100vw, (max-width: 1268px) 50vw, 32vw'
                />
              </article>
            ))}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
