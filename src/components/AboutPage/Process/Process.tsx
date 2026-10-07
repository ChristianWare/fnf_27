"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Process.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Chris from "../../../../public/images/me.png";
import AuditImg from "../../../../public/images/auditImg.jpg";
import MapImg from "../../../../public/images/mapImg.jpg";
import BuildImg from "../../../../public/images/buildImg.jpg";
import LaunchImg from "../../../../public/images/launch.jpg";
import OngoingImg from "../../../../public/images/ongoingImg.jpg";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";
const CAROUSEL = "(max-width: 968px)";
const DURATION = 550; // how long one slide takes, in milliseconds
const EASING = "cubic-bezier(0.22, 0.7, 0.2, 1)";

// How a new website gets built, from the first call to after launch.
const steps = [
  {
    id: 1,
    title: "Free audit",
    desc: "I run your site and Google profile through the audit, and we go over what's costing you bookings on a 20-minute call.",
    src: AuditImg,
    alt: "An operator checking his phone",
  },
  {
    id: 2,
    title: "Page map",
    desc: "We plan the pages riders search for in your market: your airports, routes, services and cities.",
    src: MapImg,
    alt: "A black SUV on a laptop screen",
  },
  {
    id: 3,
    title: "Design & build",
    desc: "A custom site with your fleet, your photos and your brand. You review it on a private link before anything goes live.",
    src: BuildImg,
    alt: "A website being built on a desktop computer",
  },
  {
    id: 4,
    title: "Launch",
    desc: "I point your domain at the new site. Your domain and your phone number stay yours.",
    src: LaunchImg,
    alt: "A black SUV on an open road",
  },
  {
    id: 5,
    title: "Ongoing",
    desc: "Hosting, edits and new pages are included in the monthly rate, and you deal with me directly.",
    src: OngoingImg,
    alt: "A client smiling at her laptop",
  },
];

// The side copies only exist for the carousel loop.
const copies = ["before", "real", "after"] as const;

export default function Process() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  // The arrows call this. It's set up once the carousel is running.
  const goRef = useRef<(delta: number) => void>(() => {});

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const n = steps.length;
    const media = window.matchMedia(CAROUSEL);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    let active = false; // true while the steps are a carousel
    let index = n; // the card at the left edge, counting all three copies
    let step = 0; // the distance from one card to the next, in px
    let drag = 0; // how far a swipe has pulled the row, in px
    let sliding = false;
    let slideEnds = 0; // when the current slide should be over

    const paint = (animate: boolean) => {
      const smooth = animate && !reduced.matches;
      track.style.transition = smooth
        ? `transform ${DURATION}ms ${EASING}`
        : "none";
      track.style.transform = `translate3d(${-index * step + drag}px, 0, 0)`;
      sliding = smooth;
      if (smooth) slideEnds = performance.now() + DURATION;
      else wrap();
    };

    // In case the browser never reports the end of a slide (for example, if
    // the tab was hidden mid-slide), treat it as over once its time is up.
    const settle = () => {
      if (sliding && performance.now() > slideEnds + 150) sliding = false;
    };

    // Jump, with no animation, to the same card in the middle copy.
    const wrap = () => {
      if (index >= n && index < 2 * n) return;
      index = ((((index - n) % n) + n) % n) + n;
      track.style.transition = "none";
      track.style.transform = `translate3d(${-index * step + drag}px, 0, 0)`;
      void track.offsetWidth; // commit the jump before the next slide
    };

    // Never slide so far that the row runs out of cards.
    const clamp = (value: number) => {
      const visible = Math.ceil(viewport.clientWidth / step);
      return Math.min(Math.max(value, 0), 3 * n - visible);
    };

    const go = (delta: number) => {
      if (!active || step <= 0) return;
      settle();
      if (!sliding) wrap();
      const next = clamp(index + delta);
      if (next === index) return;
      index = next;
      paint(true);
    };
    goRef.current = go;

    const onTransitionEnd = (e: TransitionEvent) => {
      // Ignore the cards' own fade-in transitions bubbling up.
      if (e.target !== track || e.propertyName !== "transform") return;
      sliding = false;
      wrap();
    };

    const measure = () => {
      active = media.matches;
      if (!active) {
        track.style.transition = "";
        track.style.transform = "";
        return;
      }
      const cards = track.querySelectorAll<HTMLElement>("[data-step]");
      if (cards.length < 2) return;
      step = cards[1].offsetLeft - cards[0].offsetLeft;
      sliding = false;
      paint(false);
    };

    // Swiping, with a finger or by dragging with a mouse. Vertical scrolls
    // pass straight through to the page.
    let pointer: number | null = null;
    let startX = 0;
    let startY = 0;
    let dragging = false;

    const onDown = (e: PointerEvent) => {
      if (!active || (e.pointerType === "mouse" && e.button !== 0)) return;
      settle();
      if (sliding) {
        // Finish the current slide right away, so the swipe starts clean.
        sliding = false;
        paint(false);
      }
      pointer = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      dragging = false;
    };

    const onMove = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!dragging) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
        dragging = true;
        viewport.setPointerCapture(e.pointerId);
      }
      drag = dx;
      track.style.transition = "none";
      track.style.transform = `translate3d(${-index * step + drag}px, 0, 0)`;
    };

    const onUp = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      pointer = null;
      if (!dragging) return;
      dragging = false;
      // A short flick still moves one card; a long drag can move several.
      const moved = -drag / step;
      let delta = Math.round(moved);
      if (delta === 0 && Math.abs(moved) > 0.15) delta = moved > 0 ? 1 : -1;
      drag = 0;
      index = clamp(index + delta);
      paint(true);
    };

    measure();

    track.addEventListener("transitionend", onTransitionEnd);
    viewport.addEventListener("pointerdown", onDown);
    viewport.addEventListener("pointermove", onMove);
    viewport.addEventListener("pointerup", onUp);
    viewport.addEventListener("pointercancel", onUp);
    const resize = new ResizeObserver(measure);
    resize.observe(viewport);
    media.addEventListener("change", measure);

    return () => {
      track.removeEventListener("transitionend", onTransitionEnd);
      viewport.removeEventListener("pointerdown", onDown);
      viewport.removeEventListener("pointermove", onMove);
      viewport.removeEventListener("pointerup", onUp);
      viewport.removeEventListener("pointercancel", onUp);
      resize.disconnect();
      media.removeEventListener("change", measure);
      goRef.current = () => {};
    };
  }, []);

  return (
    <section className={styles.container}>
      <Reveal />

      <div className={styles.head}>
        <LayoutWrapper paddingNSNone='paddingNSNone'>
          <div className={styles.headContent}>
            <div className={styles.headLeft}>
              <EyeBrow text='Process' />
              <h2
                className={styles.heading}
                data-reveal
                data-reveal-style='fade'
              >
                From First Call <br /> to Live Site
              </h2>
            </div>

            <a
              href={CALENDAR}
              target='_blank'
              rel='noopener noreferrer'
              className={styles.talk}
              aria-label='Book a 20-minute call with Chris Ware'
              data-reveal
            >
              <span className={styles.talkPhoto}>
                <Image
                  src={Chris}
                  alt=''
                  fill
                  sizes='64px'
                  className={styles.cover}
                />
              </span>
              <span className={styles.talkText}>
                <span className={styles.mono}>Let&apos;s talk</span>
                <span className={styles.talkName}>Chris Ware</span>
                <span className={styles.mono}>Founder · Phoenix, AZ</span>
              </span>
              <span className={styles.talkArrow}>
                <Arrow className={styles.arrow} aria-hidden='true' />
              </span>
            </a>
          </div>
        </LayoutWrapper>

        {/* Shown at 968px and below. */}
        <div className={styles.controls}>
          <button
            type='button'
            className={styles.control}
            onClick={() => goRef.current(-1)}
            aria-label='Previous step'
          >
            <svg
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              aria-hidden='true'
            >
              <path d='M9 14 4 9l5-5' />
              <path d='M4 9h10.5a5.5 5.5 0 0 1 0 11H11' />
            </svg>
          </button>
          <button
            type='button'
            className={styles.control}
            onClick={() => goRef.current(1)}
            aria-label='Next step'
          >
            <svg
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              aria-hidden='true'
            >
              <path d='m15 14 5-5-5-5' />
              <path d='M20 9H9.5a5.5 5.5 0 0 0 0 11H13' />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={styles.viewport}
        role='region'
        aria-label='The five steps'
      >
        <ol ref={trackRef} className={styles.steps}>
          {copies.map((copy) =>
            steps.map((step) => {
              const real = copy === "real";
              return (
                <li
                  key={`${copy}-${step.id}`}
                  className={`${styles.step} ${real ? "" : styles.clone}`}
                  data-step
                  aria-hidden={real ? undefined : true}
                  data-reveal={real ? "" : undefined}
                >
                  <div className={styles.photo}>
                    <Image
                      src={step.src}
                      alt={real ? step.alt : ""}
                      fill
                      draggable={false}
                      sizes='(max-width: 568px) 72vw, (max-width: 968px) 42vw, 20vw'
                      className={styles.cover}
                    />
                  </div>
                  <div className={styles.info}>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <span className={styles.mono}>Step 0{step.id}</span>
                    <p className={styles.stepDesc}>{step.desc}</p>
                  </div>
                </li>
              );
            }),
          )}
        </ol>
      </div>
    </section>
  );
}
