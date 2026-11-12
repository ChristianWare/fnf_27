"use client";

// The six things that fill a black car calendar, around a short statement
// inside two faint circles.
//
// On wide screens the section pins. The statement holds in the middle of the
// screen while its button rises into place underneath at scroll speed. Then
// the six cards spread out from the middle one at a time, three to a row
// above the statement and three below it. Once they're in place, the page
// carries on.
//
// At 968px and below, on screens too short to fit the cards around the
// statement, or with motion turned off, it's a normal section: the
// statement, then the cards in a grid.

import { useEffect, useRef } from "react";
import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./WhatWeDo.module.css";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import WebsitesImg from "../../../../public/images/websiteOnly.jpg";
import SearchImg from "../../../../public/images/userSearch.jpg";
import MapsImg from "../../../../public/images/mapImg.jpg";
import ReviewsImg from "../../../../public/images/reviews.jpg";
import LeadsImg from "../../../../public/images/leads.jpg";
import OverflowImg from "../../../../public/images/dispatch.jpg";
import PulseEyeBrow from "@/components/shared/PulseEyeBrow/PulseEyeBrow";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";

// How the pinned section plays out, in screen heights of scrolling.
const RISE = 0.3; // the button rising into place
const STEP = 0.3; // each card spreading out, one after another
const HOLD = 0.15; // a short pause with everything in place

const GAP = 56; // the space between the statement and the cards, in px
const EDGE = 24; // the space the cards keep from the screen's edges, in px
const MIN_CARD = 320; // narrower cards than this get the normal layout, in px
// On shorter screens the finished cards shrink a little around the middle
// to fit. Any smaller than this and the normal layout is used instead.
const MIN_FIT = 0.88;

// In the order they come out: the top row left to right, then the bottom
// row left to right.
const services = [
  {
    id: 1,
    title: "A website that books rides",
    desc: "Good design plus 24/7 online booking, with no per-booking fees. Traffic only matters if the site can take the ride.",
    src: WebsitesImg,
  },
  {
    id: 2,
    title: "Showing up in Google search",
    desc: "Pages for your city, each airport and each route, built around what riders actually type into Google.",
    src: SearchImg,
  },
  {
    id: 3,
    title: "Showing up in Google Maps",
    desc: "The companies in the map box get most of the calls. For one Boston operator we studied, the map listing brought 54% of all their traffic.",
    src: MapsImg,
  },
  {
    id: 4,
    title: "Reviews",
    desc: "Reviews push you up in Maps and win the rider who's comparing three companies. Asking for them is the owner's job.",
    src: ReviewsImg,
  },
  {
    id: 5,
    title: "Accounts that book again and again",
    desc: "Hotels, wedding venues, corporate offices and funeral homes. One venue that likes you can send 30 to 40 rides a year.",
    src: LeadsImg,
  },
  {
    id: 6,
    title: "Overflow from other operators",
    desc: "Operators send each other the rides they can't cover. A few friends in the business fill slow weekdays fast.",
    src: OverflowImg,
  },
];

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export default function WhatWeDo() {
  const wrapRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    const center = centerRef.current;
    const list = cardsRef.current;
    if (!wrap || !stage || !center || !list) return;

    const wide = window.matchMedia("(min-width: 969px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const touch = window.matchMedia("(pointer: coarse)");
    const cards = Array.from(list.querySelectorAll<HTMLElement>("[data-card]"));

    let pinned = false;
    let screen = 0; // the pinned stage's height, in px
    let raf = 0;
    let lastRise = -1;
    const lastSpread = cards.map(() => -1);
    let settled = false;

    const setVar = (name: string, value: string) =>
      wrap.style.setProperty(name, value);

    const setSettled = (value: boolean) => {
      if (value === settled) return;
      settled = value;
      if (value) wrap.dataset.settled = "true";
      else delete wrap.dataset.settled;
    };

    const unpin = () => {
      pinned = false;
      delete wrap.dataset.pinned;
      setSettled(false);
      wrap.style.height = "";
    };

    // Scroll position -> how far along the button and the cards are.
    const update = () => {
      if (!pinned) return;
      // How far the page has scrolled since the section pinned.
      const scrolled = -wrap.getBoundingClientRect().top;
      const rise = clamp(scrolled / (screen * RISE));

      if (rise !== lastRise) {
        setVar("--rise-p", rise.toFixed(4));
        lastRise = rise;
      }

      // Each card spreads out in its own stretch of the scroll, after the
      // one before it, and slows down as it arrives.
      let spread = 0;
      cards.forEach((card, i) => {
        spread = clamp(
          (scrolled - screen * RISE - i * screen * STEP) / (screen * STEP),
        );
        const eased = Number((1 - (1 - spread) ** 2).toFixed(4));
        if (eased !== lastSpread[i]) {
          card.style.setProperty("--spread", String(eased));
          lastSpread[i] = eased;
        }
      });
      // The cards take clicks once the last one is in place.
      setSettled(spread >= 1);
    };

    // Decide which layout fits, and where each card starts from.
    const measure = () => {
      if (!wide.matches || reduced.matches) return unpin();

      // Try the pinned layout and check that everything fits.
      wrap.dataset.pinned = "true";
      // The circles sit just outside the statement.
      setVar("--gap-x", `${Math.ceil(center.offsetWidth / 2 + GAP)}px`);
      // All six cards take the height of the tallest one.
      setVar("--card-h", "0px");
      const tallest = Math.max(...cards.map((card) => card.offsetHeight));
      setVar("--card-h", `${tallest}px`);

      const width = stage.clientWidth;
      const height = stage.clientHeight;
      // The rows sit above and below the statement, clear of it when the
      // screen is tall enough, and at least 40px from the middle.
      const gapY = Math.max(
        40,
        Math.min(center.offsetHeight / 2 + 24, height / 2 - EDGE - tallest),
      );
      setVar("--gap-y", `${Math.round(gapY)}px`);
      // How far the finished layout reaches out from the middle of the
      // screen, sideways and up and down.
      let reachX = 0;
      let reachY = 0;
      let narrowest = Infinity;
      for (const card of cards) {
        const left = card.offsetLeft;
        const top = card.offsetTop;
        const w = card.offsetWidth;
        const h = card.offsetHeight;
        narrowest = Math.min(narrowest, w);
        reachX = Math.max(reachX, width / 2 - left, left + w - width / 2);
        reachY = Math.max(reachY, height / 2 - top, top + h - height / 2);
        // How far the card is from the middle of the screen. It starts much
        // closer in, as part of a small copy of the finished layout.
        card.style.setProperty("--dx", `${width / 2 - (left + w / 2)}px`);
        card.style.setProperty("--dy", `${height / 2 - (top + h / 2)}px`);
      }
      // The finished layout's size: full size, or a little smaller so it
      // stays inside the edges of the screen.
      const fit = Math.min(
        1,
        (width / 2 - EDGE) / reachX,
        (height / 2 - EDGE) / reachY,
      );
      if (narrowest < MIN_CARD || fit < MIN_FIT) return unpin();
      setVar("--fit", fit.toFixed(4));

      pinned = true;
      screen = height;
      wrap.style.height = `${Math.round(
        screen * (1 + RISE + STEP * cards.length + HOLD),
      )}px`;
      setVar("--rise", `${Math.round(screen * RISE)}px`);
      lastRise = -1;
      lastSpread.fill(-1);
      update();
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      update();
    };

    let active = true;
    measure();
    // The statement's width depends on the font, which may load later.
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

    // Tabbing to a card's link before the cards are in place scrolls to
    // where they are, so the focused link can be seen.
    const onFocus = () => {
      if (!pinned || settled) return;
      const top = wrap.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({
        top: Math.ceil(top + screen * (RISE + STEP * cards.length)) + 1,
        behavior: "instant",
      });
      update();
    };

    window.addEventListener("resize", onResize);
    wide.addEventListener("change", measure);
    reduced.addEventListener("change", measure);
    list.addEventListener("focusin", onFocus);

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
      list.removeEventListener("focusin", onFocus);
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
          <div ref={centerRef} className={styles.center}>
            <PulseEyeBrow text='What fills a calendar' />

            {/* Sized by the global .h3 class, in the display font. */}
            <h2
              id='what-we-do-heading'
              className={`${styles.heading} h3`}
              data-reveal
              data-reveal-style='fade'
            >
              Six things fill
              <br />a black car calendar
            </h2>
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
            {services.map((service) => (
              <li className={styles.card} key={service.id} data-card>
                <div className={styles.cardInner} data-reveal='each'>
                  <div className={styles.cardTop}>
                    <span className={styles.number} aria-hidden='true'>
                      0{service.id}
                    </span>
                    <span className={styles.thumb}>
                      <Image
                        src={service.src}
                        alt=''
                        fill
                        sizes='80px'
                        className={styles.thumbImg}
                      />
                    </span>
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={`${styles.title} h6`}>
                      {service.title}{" "}
                      <Arrow className={styles.linkArrow} aria-hidden='true' />
                    </h3>
                    <p className={styles.desc}>{service.desc}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </LayoutWrapper>
      </div>
    </section>
  );
}
