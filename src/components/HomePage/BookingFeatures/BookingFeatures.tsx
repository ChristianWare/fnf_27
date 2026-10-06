"use client";

// The booking software teaser. The section pins and its cards move sideways
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
import styles from "./BookingFeatures.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Platform from "@/components/shared/icons/Platform/Platform";
import Plane from "@/components/shared/icons/Plane/Plane";
import Payment from "@/components/shared/icons/Payment/Payment";
import DirectBookingImg from "../../../../public/images/happyClient.jpg";
import FlightTrackingImg from "../../../../public/images/dispatch.jpg";
import PaymentImg from "../../../../public/images/takePayments.jpg";
import Reveal from "@/components/shared/Reveal/Reveal";

const EASE = 0.14; // how quickly the cards catch up with the scroll (0 to 1)

const features = [
  {
    id: 1,
    title: "Direct booking",
    sub: "Riders book without calling",
    stat: "24/7",
    statLabel: "Online booking",
    desc: "Riders choose the service, pickup time, route and vehicle on your own site, and see the price before they book. The 11pm airport run books itself.",
    src: DirectBookingImg,
    alt: "The booking form on an operator's own website",
    Icon: Platform,
  },
  {
    id: 2,
    title: "Dispatch & driver portal",
    sub: "Assign, track, update",
    stat: "Live",
    statLabel: "Flight tracking",
    desc: "Assign each ride, and your driver sees it on their phone and updates its status as the trip unfolds. Airport pickups follow the actual landing time.",
    src: FlightTrackingImg,
    alt: "Live flight tracking for an airport pickup",
    Icon: Plane,
  },
  {
    id: 3,
    title: "Payments",
    sub: "Straight to your own Stripe",
    stat: "$0",
    statLabel: "Per-booking fees",
    desc: "Take a deposit, keep a card on file or email a payment link. The money goes straight to your own Stripe account, for one flat $499 a month.",
    src: PaymentImg,
    alt: "The payment page on an operator's own website",
    Icon: Payment,
  },
];

export default function BookingFeatures() {
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

    let pinned = false;
    let distance = 0; // how far the cards travel sideways, in px
    let start = 0; // how far the page scrolls past the section before it pins
    let current = 0;
    let raf = 0;

    const measure = () => {
      wrap.dataset.pinned = "true";
      const panel = sticky.offsetHeight;
      const screen = window.innerHeight;
      pinned = !reduced.matches;

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
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={wrapRef} className={styles.container}>
      <Reveal mode='together' />
      <div ref={stickyRef} className={styles.sticky}>
        <LayoutWrapper>
          <div className={styles.top} data-reveal>
            <div className={styles.topLeft}>
              <EyeBrow text='Booking software' />
              <h2 className={`${styles.heading} h3`}>
                Your website takes the booking, dispatches the driver and gets
                you paid.
              </h2>
            </div>
            <Link href='/services/booking-software' className={styles.badge}>
              <span className={styles.badgeIcon}>
                <Arrow className={styles.badgeArrow} aria-hidden='true' />
              </span>
              <span className={styles.badgeText}>
                <span className={styles.badgeTitle}>
                  Full Platform · $499/mo
                </span>
                <span className={styles.badgeSub}>
                  Leads tool included. See what&apos;s inside
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
                      <span className={`${styles.statValue} h3`}>{feature.stat}</span>
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
