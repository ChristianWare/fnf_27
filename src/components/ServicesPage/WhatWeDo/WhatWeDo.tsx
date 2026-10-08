"use client";

// The four services around a short statement, inside two faint circles.
//
// On wide screens the section pins. The statement holds in the middle of the
// screen while its button rises into place underneath at scroll speed. Then
// the four cards spread out from the middle to the four corners. Once
// they're in place, the page carries on.
//
// At 968px and below, on screens too short to fit the cards around the
// statement, or with motion turned off, it's a normal section: the
// statement, then the cards in a grid.

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./WhatWeDo.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import WebsitesImg from "../../../../public/images/websiteOnly.jpg";
import BookingImg from "../../../../public/images/dispatch.jpg";
import LeadsImg from "../../../../public/images/leads.jpg";
import AuditImg from "../../../../public/images/auditImg.jpg";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";

// How the pinned section plays out, in screen heights of scrolling.
const RISE = 0.3; // the button rising into place
const SPREAD = 0.9; // the cards spreading out to the corners
const HOLD = 0.15; // a short pause with everything in place

const GAP = 56; // the space between the statement and the cards, in px
const EDGE = 24; // the space the cards keep from the screen's edges, in px
const MIN_CARD = 320; // narrower cards than this get the normal layout, in px
// On shorter screens the finished cards shrink a little around the middle
// to fit. Any smaller than this and the normal layout is used instead.
const MIN_FIT = 0.88;

// In the order they fill the corners: top left, top right, bottom left,
// bottom right.
const services = [
  {
    id: 1,
    title: "Websites",
    desc: "A custom site built for the searches your riders make: an airport page, route pages, corporate and wedding pages, and a page for every city you serve. Website Only works with your current booking software. The Full Platform adds booking and dispatch.",
    price: "From $199/mo + $500 setup",
    link: "See website design",
    href: "/services/websites",
    src: WebsitesImg,
  },
  {
    id: 2,
    title: "Booking & dispatch software",
    desc: "Direct booking on your own site, driver assignment and a driver portal, flight tracking, deposits and card-on-file payments, and multi-ride trips. The software comes with your website, and there are no per-booking fees.",
    price: "$499/mo + $500 setup, leads tool included",
    link: "See booking software",
    href: "/services/booking-software",
    src: BookingImg,
  },
  {
    id: 3,
    title: "Leads",
    desc: "Hotels, wedding and event venues, corporate travel managers and funeral homes in your market, plus upcoming events and people asking for rides online. Every lead comes with the decision-maker's contact and an outreach script written for that business.",
    price:
      "Free for 30 days, no card. Then included with the $499 plan, or $125/mo on its own.",
    link: "See how the leads tool works",
    href: "/services/leads",
    src: LeadsImg,
  },
  {
    id: 4,
    title: "Free website audit",
    desc: "See what's costing you bookings in 60 seconds: how you show up on Google, how your site works on a phone, whether riders can book you online, and whether AI search can read you.",
    price: "Free. No card, and no email needed for your score.",
    link: "Run a free website audit",
    href: "/audit",
    src: AuditImg,
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
    let lastSpread = -1;
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
      const spread = clamp((scrolled - screen * RISE) / (screen * SPREAD));
      // The cards slow down as they arrive.
      const eased = 1 - (1 - spread) ** 2;

      if (rise !== lastRise) {
        setVar("--rise-p", rise.toFixed(4));
        lastRise = rise;
      }
      if (eased !== lastSpread) {
        setVar("--spread", eased.toFixed(4));
        lastSpread = eased;
      }
      // The cards take clicks once they're in place.
      setSettled(spread >= 1);
    };

    // Decide which layout fits, and where each card starts from.
    const measure = () => {
      if (!wide.matches || reduced.matches) return unpin();

      // Try the pinned layout and check that everything fits.
      wrap.dataset.pinned = "true";
      // The cards sit just outside the statement, so they never cover it.
      setVar("--gap-x", `${Math.ceil(center.offsetWidth / 2 + GAP)}px`);
      // All four cards take the height of the tallest one.
      setVar("--card-h", "0px");
      const tallest = Math.max(...cards.map((card) => card.offsetHeight));
      setVar("--card-h", `${tallest}px`);

      const width = stage.clientWidth;
      const height = stage.clientHeight;
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
      wrap.style.height = `${Math.round(screen * (1 + RISE + SPREAD + HOLD))}px`;
      setVar("--rise", `${Math.round(screen * RISE)}px`);
      lastRise = -1;
      lastSpread = -1;
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
        top: Math.ceil(top + screen * (RISE + SPREAD)) + 1,
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
            <EyeBrow text='we help you ' />
            <h2
              id='what-we-do-heading'
              className={styles.heading}
              data-reveal
              data-reveal-style='fade'
            >
              <span className={styles.phrase}>Get Found.</span>{" "}
              <br className={styles.br} />
              <span className={styles.phrase}>Book Direct.</span>{" "}
              <br className={styles.br} />
              <span className={styles.phrase}>Win Accounts.</span>
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
