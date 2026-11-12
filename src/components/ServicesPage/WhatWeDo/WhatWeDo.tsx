"use client";

// The six things that fill a black car calendar, around a short statement
// inside two faint circles.
//
// On wide screens the section pins. The statement holds in the middle of
// the screen while its button rises into place underneath. Then the six
// cards come up one at a time and land in a stack over the statement, each
// new card on top and the ones under it settling back a little. Once the
// last card is down, the page carries on.
//
// At 968px and below, on screens too short to fit a card, or with motion
// turned off, it's a normal section: the statement, then the cards in a
// grid.

import { useEffect, useRef } from "react";
import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./WhatWeDo.module.css";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import PulseEyeBrow from "@/components/shared/PulseEyeBrow/PulseEyeBrow";
import WebsitesImg from "../../../../public/images/websiteOnly.jpg";
import SearchImg from "../../../../public/images/userSearch.jpg";
import MapsImg from "../../../../public/images/mapImg.jpg";
import ReviewsImg from "../../../../public/images/reviews.jpg";
import LeadsImg from "../../../../public/images/leads.jpg";
import OverflowImg from "../../../../public/images/dispatch.jpg";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";

// How the pinned section plays out, in screen heights of scrolling.
const RISE = 0.3; // the button rising into place
const STEP = 0.55; // each card coming up
const HOLD = 0.3; // a short pause with the last card down

const EDGE = 32; // the space a card keeps from the top and bottom, in px
const SHIFT = 14; // how far each card under the top one sits higher, in px

const sources = [
  {
    id: 1,
    title: "A website that books rides",
    desc: "Good design plus 24/7 online booking, with no per-booking fees. Traffic only matters if the site can take the ride.",
    we: "Design, build and host the site and the booking system",
    you: "Fleet photos, prices and the questions riders ask",
    src: WebsitesImg,
  },
  {
    id: 2,
    title: "Showing up in Google search",
    desc: "Pages for your city, each airport and each route, built around what riders actually type into Google.",
    we: "City, airport and route pages, kept fast and tidy",
    you: "Tell us the routes and airports that pay best",
    src: SearchImg,
  },
  {
    id: 3,
    title: "Showing up in Google Maps",
    desc: "The companies in the map box get most of the calls. For one Boston operator we studied, the map listing brought 54% of all their traffic.",
    we: "Set up and tune your Google Business Profile",
    you: "A real photo each week and a post every other week",
    src: MapsImg,
  },
  {
    id: 4,
    title: "Reviews",
    desc: "Reviews push you up in Maps and win the rider who's comparing three companies. A steady trickle beats a burst.",
    we: "Your review link and a review card for every car",
    you: "Ask after every good ride and answer every review",
    src: ReviewsImg,
  },
  {
    id: 5,
    title: "Accounts that book again and again",
    desc: "Hotels, wedding venues, corporate offices and funeral homes. One venue that likes you can send 30 to 40 rides a year.",
    we: "The leads tool finds them, with who to call and what to say",
    you: "Make the calls and follow up",
    src: LeadsImg,
  },
  {
    id: 6,
    title: "Overflow from other operators",
    desc: "Every operator turns down work some nights. A few operators who send you their overflow can fill a slow weekday fast.",
    we: "A booking page partners can send riders to",
    you: "Build the relationships and return the favor",
    src: OverflowImg,
  },
];

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export default function WhatWeDo() {
  const wrapRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    const list = cardsRef.current;
    if (!wrap || !stage || !list) return;

    const wide = window.matchMedia("(min-width: 969px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const touch = window.matchMedia("(pointer: coarse)");
    const cards = Array.from(list.querySelectorAll<HTMLElement>("[data-card]"));

    let pinned = false;
    let screen = 0; // the pinned stage's height, in px
    let raf = 0;
    let lastRise = -1;
    const last = cards.map(() => ({ p: -1, after: -1 }));

    const unpin = () => {
      pinned = false;
      delete wrap.dataset.pinned;
      wrap.style.height = "";
    };

    // Scroll position -> how far along the button and each card are.
    const update = () => {
      if (!pinned) return;
      // How far the page has scrolled since the section pinned.
      const scrolled = -wrap.getBoundingClientRect().top;

      const rise = clamp(scrolled / (screen * RISE));
      if (rise !== lastRise) {
        wrap.style.setProperty("--rise-p", rise.toFixed(4));
        lastRise = rise;
      }

      // Each card comes up in its own stretch of the scroll, and slows down
      // as it lands.
      const progress = cards.map((_, i) => {
        const p = clamp(
          (scrolled - screen * RISE - i * screen * STEP) / (screen * STEP),
        );
        return 1 - (1 - p) ** 3;
      });

      cards.forEach((card, i) => {
        // How many cards have landed on top of this one (0 to 5).
        const after = progress.slice(i + 1).reduce((sum, p) => sum + p, 0);
        const p = Number(progress[i].toFixed(4));
        const a = Number(after.toFixed(4));
        if (p !== last[i].p) {
          card.style.setProperty("--p", String(p));
          last[i].p = p;
        }
        if (a !== last[i].after) {
          card.style.setProperty("--after", String(a));
          last[i].after = a;
        }
      });
    };

    // Decide which layout fits.
    const measure = () => {
      if (!wide.matches || reduced.matches) return unpin();

      // Try the pinned layout and check that a card fits on the screen.
      wrap.dataset.pinned = "true";
      wrap.style.setProperty("--card-h", "0px");
      const tallest = Math.max(...cards.map((card) => card.offsetHeight));
      const height = stage.clientHeight;
      if (tallest + 2 * EDGE + SHIFT * (cards.length - 1) > height) {
        return unpin();
      }
      // Every card takes the height of the tallest one, and starts just
      // below the bottom of the screen.
      wrap.style.setProperty("--card-h", `${tallest}px`);
      wrap.style.setProperty(
        "--travel",
        `${Math.round(height / 2 + tallest / 2 + 40)}px`,
      );

      pinned = true;
      screen = height;
      wrap.style.height = `${Math.round(
        screen * (1 + RISE + STEP * cards.length + HOLD),
      )}px`;
      wrap.style.setProperty("--rise", `${Math.round(screen * RISE)}px`);
      lastRise = -1;
      last.forEach((l) => {
        l.p = -1;
        l.after = -1;
      });
      update();
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      update();
    };

    let active = true;
    measure();
    // The cards' height depends on the font, which may load later.
    document.fonts?.ready
      .then(() => {
        if (active) measure();
      })
      .catch(() => {});

    // Tablet browsers change the screen height slightly as their address
    // bar shows and hides. Re-measuring for that would make the page jump,
    // so on touch screens small height-only changes are ignored.
    let lastWidth = window.innerWidth;
    let lastHeight = window.innerHeight;
    const onResize = () => {
      const widthChanged = window.innerWidth !== lastWidth;
      const bigHeightChange = Math.abs(window.innerHeight - lastHeight) > 150;
      if (!widthChanged && !bigHeightChange && touch.matches) return;
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
      active = false;
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
      aria-labelledby='what-we-do-heading'
    >
      <div ref={stageRef} className={styles.stage}>
        <Reveal />
        <div className={styles.circles} aria-hidden='true'>
          <span className={`${styles.circle} ${styles.circleOuter}`} />
          <span className={`${styles.circle} ${styles.circleInner}`} />
        </div>

        <LayoutWrapper>
          <div className={styles.center}>
            <PulseEyeBrow text='What fills a calendar' />

            <h2
              id='what-we-do-heading'
              className={`${styles.heading} h3`}
              data-reveal
              data-reveal-style='fade'
            >
              Six things fill
              <br />a black car calendar
            </h2>
            <p className={styles.intro} data-reveal>
              Most operators are only working one or two of them. Here&apos;s
              each one, what we handle, and what&apos;s yours.
            </p>
            <div className={styles.btnWrap}>
              <Button
                href={CALENDAR}
                target='_blank'
                btnType='black'
                text='Book a 20-minute call'
                arrow
              />
            </div>
          </div>

          <ul ref={cardsRef} className={styles.cards}>
            {sources.map((source) => (
              <li className={styles.card} key={source.id} data-card>
                <div className={styles.cardInner} data-reveal='each'>
                  <div className={styles.cardTop}>
                    <span className={styles.number} aria-hidden='true'>
                      0{source.id}
                    </span>
                    <span className={styles.thumb}>
                      <Image
                        src={source.src}
                        alt=''
                        fill
                        sizes='100px'
                        className={styles.thumbImg}
                      />
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={`${styles.title} h6`}>{source.title}</h3>
                    <p className={styles.desc}>{source.desc}</p>
                  </div>
                  <dl className={styles.split}>
                    <div className={styles.splitRow}>
                      <dt className={styles.splitLabel}>We do</dt>
                      <dd className={styles.splitText}>{source.we}</dd>
                    </div>
                    <div className={styles.splitRow}>
                      <dt className={styles.splitLabel}>You do</dt>
                      <dd className={styles.splitText}>{source.you}</dd>
                    </div>
                  </dl>
                </div>
              </li>
            ))}
          </ul>
        </LayoutWrapper>
      </div>
    </section>
  );
}
