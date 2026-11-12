"use client";

// Who does what: the split between us and the operator, so the months of
// waiting for traffic make sense. Two sets for our part (the site and the
// pages), two for theirs (reviews and partner asks). Same look as the
// BookingFeatures section: the section pins and its cards move sideways
// as you scroll down. Once the last set is in view, the next section rises
// to meet it and the page carries on. This works at every screen size: when
// the section is taller than the screen (phones), it pins with its bottom
// edge at the bottom of the screen, so the cards stay in view.
// With motion turned off, the cards are a normal swipeable row instead.

import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import Image from "next/image";
import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./WhoDoesWhat.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Hammer from "@/components/shared/icons/Hammer/Hammer";
import Analytics from "@/components/shared/icons/Analytics/Analytics";
import Stariii from "@/components/shared/icons/Stariii/Stariii";
import Business from "@/components/shared/icons/Business/Business";
import BuildImg from "../../../../public/images/buildImg.jpg";
import PagesImg from "../../../../public/images/userSearch.jpg";
import ReviewsImg from "../../../../public/images/reviews.jpg";
import PartnersImg from "../../../../public/images/call.jpg";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";
import Reveal from "@/components/shared/Reveal/Reveal";

const EASE = 0.14; // how quickly the cards catch up with the scroll (0 to 1)

const features = [
  {
    id: 1,
    title: "Your site and booking",
    sub: "Our part",
    stat: "$0",
    statLabel: "Per-booking fees",
    desc: "We design, build and host your website with online booking and payments. You send your fleet photos, your prices and the questions riders ask on the phone. We handle the rest.",
    src: BuildImg,
    alt: "A small figure at the foot of a ladder of wooden blocks",
    Icon: Hammer,
  },
  {
    id: 2,
    title: "Pages and your Google listing",
    sub: "Our part",
    stat: "12",
    statLabel: "Reports a year",
    desc: "We build a page for every city you serve, each airport and each route, set up your Google listing, and send you a short report every month: clicks, calls and bookings.",
    src: PagesImg,
    alt: "Hands typing a search on a laptop",
    Icon: Analytics,
  },
  {
    id: 3,
    title: "Reviews and photos",
    sub: "Your part",
    stat: "30",
    statLabel: "Minutes a week",
    desc: "Ask happy riders for a review, answer every one, and add a real photo to your Google listing each week. Google trusts this from you, not from us, and it's what moves you up the map.",
    src: ReviewsImg,
    alt: "Smiling faces drawn on paper signs",
    Icon: Stariii,
  },
  {
    id: 4,
    title: "Partner asks",
    sub: "Your part",
    stat: "1",
    statLabel: "Ask a week",
    desc: "One ask a week to a hotel, a venue or another operator: list us as your preferred car service, and we'll send work your way too. The leads tool tells you who to ask and what to say.",
    src: PartnersImg,
    alt: "A woman on the phone at her desk",
    Icon: Business,
  },
];

export default function WhoDoesWhat() {
  const wrapRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);

  const lenis = useLenis();
  const pageIsSmooth = useRef(false);
  useEffect(() => {
    pageIsSmooth.current = Boolean(lenis?.options.smoothWheel);
  }, [lenis]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const sticky = stickyRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!wrap || !sticky || !viewport || !track) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    // On a phone the cards simply stack and scroll with the page.
    const phone = window.matchMedia("(max-width: 568px)");

    let pinned = false;
    let distance = 0; // how far the cards travel sideways, in px
    let start = 0; // how far the page scrolls past the section before it pins
    let current = 0;
    let raf = 0;

    const measure = () => {
      wrap.dataset.pinned = "true";
      const panel = sticky.offsetHeight;
      const screen = window.innerHeight;
      pinned = !reduced.matches && !phone.matches;

      if (!pinned) {
        delete wrap.dataset.pinned;
        wrap.style.height = "";
        sticky.style.top = "";
        track.style.transform = "";
        current = 0;
        return;
      }

      // A panel taller than the screen pins with its bottom edge at the
      // bottom of the screen; a shorter one pins at the top.
      const top = Math.min(0, screen - panel);
      sticky.style.top = `${top}px`;
      start = -top;

      viewport.scrollLeft = 0;
      distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
      // After the cards finish, the next section rises through the empty
      // space under the panel until it meets it. That takes "gap" px.
      const gap = Math.max(0, screen - panel);
      wrap.style.height = `${panel + distance + gap}px`;
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!pinned) return;
      const scrolled = -wrap.getBoundingClientRect().top - start;
      const target = Math.min(distance, Math.max(0, scrolled));
      // With site-wide smooth scrolling on, the page is already eased, so
      // the cards follow it exactly. Easing twice makes them lag behind.
      current += (target - current) * (pageIsSmooth.current ? 1 : EASE);
      if (Math.abs(target - current) < 0.3) current = target;
      track.style.transform = `translate3d(${-current}px, 0, 0)`;
    };

    measure();

    // Phone browsers change the screen height slightly as their address bar
    // shows and hides during a scroll. Re-measuring for that would make the
    // page jump, so small height-only changes are ignored.
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

    const resize = new ResizeObserver(measure);
    resize.observe(sticky);
    resize.observe(track);
    window.addEventListener("resize", onResize);
    reduced.addEventListener("change", measure);
    phone.addEventListener("change", measure);

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
      resize.disconnect();
      visible.disconnect();
      window.removeEventListener("resize", onResize);
      reduced.removeEventListener("change", measure);
      phone.removeEventListener("change", measure);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section
      ref={wrapRef}
      className={styles.container}
      aria-labelledby='who-does-what-heading'
    >
      <Reveal mode='together' />
      <div ref={stickyRef} className={styles.sticky}>
        <LayoutWrapper>
          <div className={styles.top} data-reveal>
            <div className={styles.topLeft}>
              <EyeBrow text='Who does what' color='yellow' />
              <h2 id='who-does-what-heading' className={`${styles.heading} h3`}>
                We build it. You keep it moving.
              </h2>
            </div>
            <Link
              href={CALENDAR}
              target='_blank'
              rel='noopener noreferrer'
              className={styles.badge}
            >
              <span className={styles.badgeIcon}>
                <Arrow className={styles.badgeArrow} aria-hidden='true' />
              </span>
              <span className={styles.badgeText}>
                <span className={styles.badgeTitle}>
                  Your part · About 30 minutes a week
                </span>
                <span className={styles.badgeSub}>
                  Book a 20-minute call to see both halves
                </span>
              </span>
            </Link>
          </div>
        </LayoutWrapper>

        <div ref={viewportRef} className={styles.viewport} data-reveal>
          <ul ref={trackRef} className={styles.track}>
            {features.map(({ Icon, ...feature }) => (
              <li className={styles.set} key={feature.id}>
                <div className={styles.block}>
                  <div className={styles.photo}>
                    <Image
                      src={feature.src}
                      alt={feature.alt}
                      fill
                      // sizes='(max-width: 568px) 45vw, 240px'
                      className={styles.img}
                    />
                  </div>
                  <div className={styles.stat}>
                    <Icon className={styles.statIcon} aria-hidden='true' />
                    <div className={styles.statBottom}>
                      <span className={`${styles.statValue} h3`}>
                        {feature.stat}
                      </span>
                      <span className={styles.statLabel}>
                        {feature.statLabel}
                      </span>
                    </div>
                  </div>
                  <div className={styles.name}>
                    <h3 className={`${styles.title} h5`}>{feature.title}</h3>
                    <span className={styles.sub}>{feature.sub}</span>
                  </div>
                </div>

                <div className={styles.quote}>
                  <div className={styles.quoteTop}>
                    <span className={styles.bigNumber} aria-hidden='true'>
                      0{feature.id}
                    </span>
                    <span className={styles.pill}>
                      {feature.id}/{features.length}
                    </span>
                  </div>
                  <p className={styles.desc}>{feature.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
