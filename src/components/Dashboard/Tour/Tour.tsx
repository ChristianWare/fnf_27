"use client";

// The guided tour: the page dims, one sidebar item lights up, and a card
// beside it says what it's for, with Back, Next and Skip. It opens on its
// own the first time a client signs in (and again after launch, when the
// sidebar changes), and anytime from a "Take the tour" button. On phones
// it opens the menu so the sidebar is there to point at.
//
// The steps come from lib/dashboard/tours.ts; the Shell marks each sidebar
// link with data-tour so a step can find it.

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { markTourSeen } from "@/app/dashboard/tour-actions";
import type { Tour as TourData } from "@/lib/dashboard/tours";
import { ui } from "../ui/ui";
import styles from "./Tour.module.css";

/** Starts the tour from anywhere: a "Take the tour" button, say. */
export const TOUR_EVENT = "fnf:tour";
/** Opens or closes the sidebar on phones: { open: boolean }. */
export const MENU_EVENT = "fnf:menu";

const PHONE = "(max-width: 1068px)";
const GAP = 16;
const PAD = 6;
const CARD_WIDTH = 360;

type Rect = { top: number; left: number; width: number; height: number };

const setMenu = (open: boolean) =>
  window.dispatchEvent(new CustomEvent(MENU_EVENT, { detail: { open } }));

const findTarget = (target: string) =>
  document.querySelector<HTMLElement>(`[data-tour="${CSS.escape(target)}"]`);

export default function Tour({
  tour,
  autoStart,
}: {
  tour: TourData;
  /** Open on its own: they haven't seen this tour yet. */
  autoStart: boolean;
}) {
  const { steps } = tour;
  const [index, setIndex] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const saved = useRef(false);

  const step = index === null ? null : steps[index];
  const last = index === steps.length - 1;

  const end = useCallback(() => {
    setIndex(null);
    setRect(null);
    setMenu(false);
    if (!saved.current) {
      saved.current = true;
      markTourSeen(tour.id).catch(() => undefined);
    }
  }, [tour.id]);

  // Opens on its own the first time, once the page has settled.
  useEffect(() => {
    if (!autoStart || steps.length === 0) return;
    const timer = window.setTimeout(() => setIndex(0), 700);
    return () => window.clearTimeout(timer);
  }, [autoStart, steps.length]);

  // "Take the tour" buttons.
  useEffect(() => {
    const start = () => steps.length > 0 && setIndex(0);
    window.addEventListener(TOUR_EVENT, start);
    return () => window.removeEventListener(TOUR_EVENT, start);
  }, [steps.length]);

  // Where the lit-up item is. Measured again on resize and scroll.
  const measure = useCallback(() => {
    setViewport({ w: window.innerWidth, h: window.innerHeight });
    if (!step?.target) return setRect(null);
    const el = findTarget(step.target);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  // Each step: open or close the phone menu, bring the item into view,
  // then light it up. A step whose item isn't on the page is skipped.
  useEffect(() => {
    if (!step) return;
    const phone = window.matchMedia(PHONE).matches;
    if (!step.target) {
      if (phone) setMenu(false);
      const frame = requestAnimationFrame(measure);
      return () => cancelAnimationFrame(frame);
    }
    if (phone) setMenu(true);
    const timer = window.setTimeout(
      () => {
        const el = findTarget(step.target!);
        if (!el) {
          setIndex((i) =>
            i === null ? null : Math.min(i + 1, steps.length - 1),
          );
          return;
        }
        el.scrollIntoView({ block: "nearest" });
        measure();
      },
      phone ? 380 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [step, measure, steps.length]);

  useEffect(() => {
    if (index === null) return;
    let frame = 0;
    const again = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", again);
    window.addEventListener("scroll", again, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", again);
      window.removeEventListener("scroll", again, true);
    };
  }, [index, measure]);

  // The card's height, to place it beside the item without running off
  // the screen. Focus moves to it so keyboards and screen readers follow.
  useLayoutEffect(() => {
    if (!cardRef.current) return;
    setCardHeight(cardRef.current.offsetHeight);
    cardRef.current.focus({ preventScroll: true });
  }, [index, rect]);

  const next = useCallback(
    () => (last ? end() : setIndex((i) => (i === null ? null : i + 1))),
    [last, end],
  );
  const back = () => setIndex((i) => (i ? i - 1 : i));

  // Escape skips; the arrow keys move between steps.
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") end();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft")
        setIndex((i) => (i ? i - 1 : i));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, end, next]);

  if (!step || index === null) return null;

  // Where the card goes: beside the item on wide screens, above or below
  // it on narrow ones, in the middle when there's no item.
  let cardStyle: CSSProperties | undefined;
  if (rect && viewport.w) {
    const width = Math.min(CARD_WIDTH, viewport.w - GAP * 2);
    const roomRight = viewport.w - (rect.left + rect.width + PAD + GAP);
    if (roomRight >= width + GAP) {
      const top = Math.min(
        Math.max(rect.top + rect.height / 2 - cardHeight / 2, GAP),
        viewport.h - cardHeight - GAP,
      );
      cardStyle = { width, left: rect.left + rect.width + PAD + GAP, top };
    } else {
      const below = rect.top + rect.height / 2 < viewport.h / 2;
      cardStyle = below
        ? {
            width,
            left: (viewport.w - width) / 2,
            top: Math.min(
              rect.top + rect.height + PAD + GAP,
              viewport.h - cardHeight - GAP,
            ),
          }
        : {
            width,
            left: (viewport.w - width) / 2,
            top: Math.max(rect.top - PAD - GAP - cardHeight, GAP),
          };
    }
  }

  const titleId = `tour-title-${index}`;

  return (
    <div className={styles.layer}>
      {/* Blocks clicks on the page while the tour is open. */}
      <div
        className={`${styles.blocker} ${rect ? "" : styles.dim}`}
        aria-hidden='true'
      />
      {rect && (
        <div
          className={styles.spot}
          aria-hidden='true'
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
          }}
        />
      )}

      <div
        ref={cardRef}
        className={`${styles.card} ${cardStyle ? "" : styles.center}`}
        style={cardStyle}
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        tabIndex={-1}
        // Re-mounts each step, which replays the fade.
        key={index}
      >
        <div className={styles.top}>
          <span className={styles.count}>
            {index + 1} of {steps.length}
          </span>
          <button type='button' className={styles.skip} onClick={end}>
            {last ? "Close" : "Skip tour"}
          </button>
        </div>
        <div
          className={styles.progress}
          role='progressbar'
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={index + 1}
          aria-label='Tour progress'
        >
          <span
            className={styles.progressFill}
            style={{ width: `${((index + 1) / steps.length) * 100}%` }}
          />
        </div>

        <h2 id={titleId} className={styles.title}>
          {step.title}
        </h2>
        <p className={styles.body}>{step.body}</p>

        <div className={styles.actions}>
          {index > 0 ? (
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
              onClick={back}
            >
              Back
            </button>
          ) : (
            <span />
          )}
          {last ? (
            <Link
              href={tour.finish.href}
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              onClick={end}
            >
              {tour.finish.label}
            </Link>
          ) : (
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              onClick={next}
            >
              {index === 0 ? "Show me around" : "Next"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
