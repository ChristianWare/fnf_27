"use client";

// The booking software teaser. On desktop the section pins to the top of
// the screen and its cards move sideways as you scroll down. Once the last
// set is in view, the next section rises to meet it and the page carries on.
// On phones and tablets (or with motion turned off) the cards are a normal
// swipeable row.

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
import DirectBookingImg from "../../../../public/images/directBooking.png";
import FlightTrackingImg from "../../../../public/images/flightTracking.png";
import PaymentImg from "../../../../public/images/payment.png";

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

    const wide = window.matchMedia("(min-width: 969px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    let pinned = false;
    let distance = 0; // how far the cards travel sideways, in px
    let current = 0;
    let raf = 0;

    const measure = () => {
      // Pin only on wide screens, with motion allowed, and when the whole
      // panel fits on screen. Otherwise fall back to the swipeable row.
      wrap.dataset.pinned = "true";
      const panel = sticky.offsetHeight;
      pinned = wide.matches && !reduced.matches && panel <= window.innerHeight;

      if (!pinned) {
        delete wrap.dataset.pinned;
        wrap.style.height = "";
        track.style.transform = "";
        current = 0;
        return;
      }

      viewport.scrollLeft = 0;
      distance = Math.max(0, track.scrollWidth - viewport.clientWidth);
      // After the cards finish, the next section rises through the empty
      // space under the panel until it meets it. That takes "gap" px.
      const gap = Math.max(0, window.innerHeight - panel);
      wrap.style.height = `${panel + distance + gap}px`;
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!pinned) return;
      const scrolled = -wrap.getBoundingClientRect().top;
      const target = Math.min(distance, Math.max(0, scrolled));
      // With site-wide smooth scrolling on, the page is already eased, so
      // the cards follow it exactly. Easing twice makes them lag behind.
      current += (target - current) * (pageIsSmooth.current ? 1 : EASE);
      if (Math.abs(target - current) < 0.3) current = target;
      track.style.transform = `translate3d(${-current}px, 0, 0)`;
    };

    measure();

    const resize = new ResizeObserver(measure);
    resize.observe(sticky);
    resize.observe(track);
    window.addEventListener("resize", measure);
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
      resize.disconnect();
      visible.disconnect();
      window.removeEventListener("resize", measure);
      wide.removeEventListener("change", measure);
      reduced.removeEventListener("change", measure);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section ref={wrapRef} className={styles.container}>
      <div ref={stickyRef} className={styles.sticky}>
        <LayoutWrapper>
          <div className={styles.top}>
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

        <div ref={viewportRef} className={styles.viewport}>
          <ul ref={trackRef} className={styles.track}>
            {features.map(({ Icon, ...feature }) => (
              <li className={styles.set} key={feature.id}>
                <div className={styles.block}>
                  <div className={styles.photo}>
                    <Image
                      src={feature.src}
                      alt={feature.alt}
                      fill
                      sizes='(max-width: 568px) 45vw, 240px'
                      className={styles.img}
                    />
                  </div>
                  <div className={styles.stat}>
                    <Icon className={styles.statIcon} aria-hidden='true' />
                    <div className={styles.statBottom}>
                      <span className={styles.statValue}>{feature.stat}</span>
                      <span className={styles.statLabel}>
                        {feature.statLabel}
                      </span>
                    </div>
                  </div>
                  <div className={styles.name}>
                    <h3 className={`${styles.title} h6`}>{feature.title}</h3>
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
