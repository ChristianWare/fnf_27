"use client";

// What the tool finds, as three frosted cards over the fixed background:
// the accounts, the events, and how it picks the ones to call first.
//
// On wide screens the section pins for a few screens of scrolling. Each
// card rises from the bottom and stops just past the middle, stacking on
// the one before it. Once all three are stacked, they slide apart into a
// row, and then the page carries on.
//
// At 968px and below, or with motion turned off, the cards sit in a column
// with no pinning.

import { useEffect, useRef } from "react";
import Image from "next/image";
import styles from "./WhatItFinds.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import BgImg from "../../../../public/images/irr.webp";

// How the pinned section plays out, in screen heights of scrolling.
const ENTER = 0.55; // each card rising into place
const SPREAD = 0.6; // the stack sliding apart into a row
const HOLD = 0.25; // a short pause with the row in place

const leads = [
  {
    id: 1,
    title: "Accounts",
    tag: "Nine kinds of business",
    desc: "The places near your base that book rides again and again, found on Google and read from their own websites.",
    items: [
      "Hotels and resorts",
      "Wedding and event venues",
      "Corporate offices and law firms",
      "Funeral homes, golf clubs, casinos and more",
    ],
  },
  {
    id: 2,
    title: "Events",
    tag: "Weeks to months out",
    desc: "What's coming up in your market, with the organizer to pitch: conferences, galas, festivals, concerts, graduations and tournaments.",
    items: [
      "Ticketmaster and Eventbrite",
      "Convention centers and universities",
      "City, tourism and chamber calendars",
      "The organizer to contact",
    ],
  },
  {
    id: 3,
    title: "The ones to call first",
    tag: "Scored out of 100",
    desc: "Every lead is scored the same way every time, so the best ones sort to the top, and you can see the points behind each score.",
    items: [
      "No car service partner yet",
      "Size, rating and distance",
      "New this morning, or in the news",
      "Events under a week out say to call",
    ],
  },
];

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

export default function WhatItFinds() {
  const wrapRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const wide = window.matchMedia("(min-width: 969px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    let pinned = false;
    let screen = 0;
    let raf = 0;
    const last = new Map<string, string>();

    const setVar = (name: string, value: string) => {
      if (last.get(name) === value) return;
      last.set(name, value);
      wrap.style.setProperty(name, value);
    };

    // Scroll position -> how far along each card is.
    const update = () => {
      if (!pinned) return;
      const scrolled = -wrap.getBoundingClientRect().top;
      leads.forEach((lead, index) => {
        const start = screen * ENTER * index;
        const p = clamp((scrolled - start) / (screen * ENTER));
        // 1 is fully below the screen, 0 is in place.
        setVar(`--y${lead.id}`, (1 - easeOut(p)).toFixed(4));
      });
      const spreadStart = screen * ENTER * leads.length;
      const spread = clamp((scrolled - spreadStart) / (screen * SPREAD));
      setVar("--spread", easeInOut(spread).toFixed(4));

      // A card fades out as the next one lands on it, so the stack reads as
      // one card, and comes back as the row slides apart.
      leads.slice(0, -1).forEach((lead, index) => {
        const nextStart = screen * ENTER * (index + 1);
        const next = clamp((scrolled - nextStart) / (screen * ENTER));
        const remaining = 1 - easeOut(next); // the next card's --y
        const covered = clamp(remaining / 0.4);
        const back = clamp(spread * 3);
        setVar(`--o${lead.id}`, Math.max(covered, back).toFixed(4));
      });
    };

    const measure = () => {
      if (!wide.matches || reduced.matches) {
        pinned = false;
        delete wrap.dataset.pinned;
        wrap.style.height = "";
        return;
      }
      pinned = true;
      wrap.dataset.pinned = "true";
      screen = window.innerHeight;
      wrap.style.height = `${Math.round(
        screen * (1 + ENTER * leads.length + SPREAD + HOLD),
      )}px`;
      last.clear();
      update();
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      update();
    };

    measure();

    // Tablet browsers change the screen height slightly as their address
    // bar shows and hides. Re-measuring for that would make the page jump,
    // so small height-only changes are ignored.
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;
    const onResize = () => {
      const widthChanged = window.innerWidth !== lastWidth;
      const bigHeightChange = Math.abs(window.innerHeight - lastHeight) > 150;
      if (!widthChanged && !bigHeightChange) return;
      lastWidth = window.innerWidth;
      lastHeight = window.innerHeight;
      measure();
    };

    window.addEventListener("resize", onResize);
    wide.addEventListener("change", measure);
    reduced.addEventListener("change", measure);

    // Only do the work while the section is on (or near) the screen.
    const visible = new IntersectionObserver(
      ([entry]) => {
        cancelAnimationFrame(raf);
        if (entry.isIntersecting) raf = requestAnimationFrame(tick);
      },
      { rootMargin: "200px 0px" },
    );
    visible.observe(wrap);

    return () => {
      visible.disconnect();
      window.removeEventListener("resize", onResize);
      wide.removeEventListener("change", measure);
      reduced.removeEventListener("change", measure);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={wrapRef}
      className={styles.container}
      aria-labelledby='what-it-finds'
    >
      {/* The background stays put while the page scrolls over it. */}
      <div className={styles.bg} aria-hidden='true'>
        <Image src={BgImg} alt='' fill sizes='100vw' className={styles.bgImg} />
      </div>

      <div className={styles.stage}>
        <div className={styles.top}>
          <EyeBrow text='What it finds' color='white' />
          <h2 id='what-it-finds' className={styles.heading}>
            The Accounts and Events in Your Market, Every Morning
          </h2>
        </div>

        <ol className={styles.cards}>
          {leads.map((lead) => (
            <li
              className={styles.card}
              key={lead.id}
              style={{ "--n": lead.id } as React.CSSProperties}
            >
              <div className={styles.cardTop}>
                <span className={styles.number} aria-hidden='true'>
                  0{lead.id}
                </span>
                <h3 className={`${styles.title} h5`}>{lead.title}</h3>
                <span className={styles.tag}>{lead.tag}</span>
                <p className={styles.desc}>{lead.desc}</p>
              </div>
              <ul className={styles.items}>
                {lead.items.map((item) => (
                  <li className={styles.item} key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
