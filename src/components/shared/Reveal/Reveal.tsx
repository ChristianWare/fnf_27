"use client";

// Fades in a section's elements. Drop <Reveal /> inside a section (it
// renders nothing visible) and mark the elements to animate:
//
//   data-reveal                 part of the section's group: they come in
//                               when the section scrolls into view, either
//                               one after the other (mode "stagger") or all
//                               at once (mode "together")
//   data-reveal="each"          comes in on its own when it scrolls into view
//   data-reveal-style="fade"    fades without the slight upward move
//
// Each element animates once. The styles live in globals.css.

import { useEffect, useRef } from "react";

export default function Reveal({
  mode = "stagger",
  step = 150,
  onLoad = false,
}: {
  /** "stagger": one after the other. "together": all at once. */
  mode?: "stagger" | "together";
  /** The gap between elements in stagger mode, in milliseconds. */
  step?: number;
  /** Start as soon as the page loads, instead of on scroll (for the hero). */
  onLoad?: boolean;
}) {
  const markerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = markerRef.current?.parentElement;
    if (!root) return;

    const marked = Array.from(
      root.querySelectorAll<HTMLElement>("[data-reveal]"),
    ).filter((el) => !el.dataset.revealed);
    const group = marked.filter((el) => el.dataset.reveal !== "each");
    const each = marked.filter((el) => el.dataset.reveal === "each");

    const show = (el: HTMLElement, delay: number) => {
      el.style.setProperty("--reveal-delay", `${delay}ms`);
      el.dataset.revealed = "true";
    };
    const showGroup = () =>
      group.forEach((el, i) => show(el, mode === "stagger" ? i * step : 0));

    // Start a little before the element's top reaches the bottom of the
    // screen, so it's already moving as it comes into view.
    const rootMargin = "0px 0px -12% 0px";
    const observers: IntersectionObserver[] = [];
    let frame = 0;

    if (group.length) {
      if (onLoad) {
        // Two frames, so the hidden starting state is drawn before the fade.
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(showGroup);
        });
      } else {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;
            observer.disconnect();
            showGroup();
          },
          { rootMargin },
        );
        observer.observe(root);
        observers.push(observer);
      }
    }

    if (each.length) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);
            show(entry.target as HTMLElement, 0);
          });
        },
        { rootMargin },
      );
      each.forEach((el) => observer.observe(el));
      observers.push(observer);
    }

    return () => {
      cancelAnimationFrame(frame);
      observers.forEach((observer) => observer.disconnect());
    };
  }, [mode, step, onLoad]);

  return <span ref={markerRef} hidden />;
}
