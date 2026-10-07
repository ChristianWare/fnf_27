"use client";

// The company in four tabs: what we do, the story, what we believe, and who
// you work with. Each tab swaps the photo and the text.

import { useState, type KeyboardEvent } from "react";
import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./AboutStory.module.css";
import Reveal from "@/components/shared/Reveal/Reveal";
import WhatImg from "../../../../public/images/subLap.png";
import StoryImg from "../../../../public/images/nierHomePage.png";
import BelieveImg from "../../../../public/images/clients.jpg";
import WhoImg from "../../../../public/images/me.png";

const tabs = [
  {
    id: "who",
    label: "Who You Work With",
    title: "Chris Ware",
    body: "I'm Chris Ware, the developer behind Fonts & Footers, based in Phoenix. When you work with us, you work with me: the person who built the platform, not a ticket system.",
    src: WhoImg,
    alt: "Chris Ware, founder of Fonts & Footers",
  },
  {
    id: "what",
    label: "What We Do",
    title: "Websites, Bookings, & Leads",
    body: "Fonts & Footers builds websites, booking software and a leads tool for black car and limo operators. You get found on Google, take bookings directly with no per-booking fees, and fill the slow months with corporate accounts, hotels and events.",
    src: WhatImg,
    alt: "A black SUV driving out of a laptop screen",
  },
  {
    id: "story",
    label: "The Story",
    title: "Already Built with an operator",
    body: "It started with one operator. Barry LaNier has run Nier Transportation in Phoenix since 2004, and his bookings ran through platforms that charged a fee on every ride and kept his customer list. We built him a direct-booking platform on his own domain, then refined it on real bookings, drivers and corporate clients until it ran his whole business.",
    src: StoryImg,
    alt: "Barry LaNier, owner of Nier Transportation",
  },
  {
    id: "believe",
    label: "What We Believe",
    title: "Own your customers",
    body: "Your customers, your brand and your bookings should belong to you. So prices are flat and published, no plan charges per-booking fees, plans run month to month, and you get an honest read before any pitch.",
    src: BelieveImg,
    alt: "An operator shaking hands with a client beside a black SUV",
  },
];

export default function AboutStory() {
  const [active, setActive] = useState(0);
  const current = tabs[active];

  // Left and right arrow keys move between tabs, like any tab control.
  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    let next = active;
    if (e.key === "ArrowRight") next = (active + 1) % tabs.length;
    else if (e.key === "ArrowLeft")
      next = (active - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    setActive(next);
    document.getElementById(`about-tab-${tabs[next].id}`)?.focus();
  }

  return (
    <section className={styles.container}>
      <Reveal mode='together' />
      <LayoutWrapper>
        <div className={styles.content}>
          <h2 className={styles.srOnly}>Fonts &amp; Footers in four parts</h2>

          <div
            className={styles.tabs}
            role='tablist'
            aria-label='About Fonts & Footers'
            data-reveal
          >
            {tabs.map((tab, i) => (
              <button
                key={tab.id}
                type='button'
                role='tab'
                id={`about-tab-${tab.id}`}
                aria-selected={i === active}
                aria-controls='about-panel'
                tabIndex={i === active ? 0 : -1}
                className={`${styles.tab} ${i === active ? styles.tabActive : ""}`}
                onClick={() => setActive(i)}
                onKeyDown={onKeyDown}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            className={styles.panel}
            role='tabpanel'
            id='about-panel'
            aria-labelledby={`about-tab-${current.id}`}
            data-reveal
          >
            {/* All four photos are stacked; the active one fades in. */}
            <div className={styles.imgContainer}>
              {tabs.map((tab, i) => (
                <Image
                  key={tab.id}
                  src={tab.src}
                  alt={i === active ? tab.alt : ""}
                  aria-hidden={i !== active}
                  fill
                  sizes='(max-width: 968px) 100vw, 45vw'
                  className={`${styles.img} ${i === active ? styles.imgActive : ""}`}
                />
              ))}
            </div>

            <div className={styles.text} key={current.id}>
              <span className={`${styles.note} h6`}>({current.label})</span>
              <div className={styles.textBottom}>
                <h3 className={`${styles.title} h2`}>{current.title}</h3>
                <p className={styles.body}>{current.body}</p>
              </div>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
