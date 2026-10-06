"use client";

// An image that slides in from the left edge of its frame as it scrolls
// into view, and slides back out when you scroll the other way. The motion
// follows the scroll position, with a little easing so it glides.
//
// Size the frame from wherever you use it by passing a className:
//   <SlideInImage src={photo} className={styles.myFrame} />

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef } from "react";
import styles from "./SlideInImage.module.css";

const EASE = 0.1; // how quickly the image catches up with the scroll (0 to 1)
const TRAVEL = 0.6; // share of the screen height the slide takes to finish

export default function SlideInImage({
  src,
  alt = "",
  className = "",
  sizes = "(max-width: 768px) 100vw, 640px",
}: {
  src: StaticImageData;
  alt?: string;
  /** Sizes the frame: width, height, margins. */
  className?: string;
  /** Passed to next/image so it loads the right file size. */
  sizes?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const slide = slideRef.current;
    if (!frame || !slide) return;

    // People who turn off motion get the image in place (see the CSS).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let current = -1; // -1 until the first frame

    // 0 when the frame's top edge reaches the bottom of the screen,
    // 1 once it has travelled TRAVEL of the screen height up from there.
    const target = () => {
      const rect = frame.getBoundingClientRect();
      const vh = window.innerHeight;
      return Math.min(1, Math.max(0, (vh - rect.top) / (vh * TRAVEL)));
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = target();
      if (current < 0) current = t; // no catch-up animation on page load
      current += (t - current) * EASE;
      if (Math.abs(t - current) < 0.0005) current = t;

      // Ease out, so the image slows gently as it settles.
      const eased = 1 - Math.pow(1 - current, 3);
      slide.style.transform = `translate3d(${(eased - 1) * 100}%, 0, 0)`;
    };

    // Only do the work while the image is on (or near) the screen.
    const observer = new IntersectionObserver(
      ([entry]) => {
        cancelAnimationFrame(raf);
        if (entry.isIntersecting) raf = requestAnimationFrame(tick);
      },
      { rootMargin: "100px 0px" },
    );
    observer.observe(frame);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={frameRef} className={`${styles.frame} ${className}`}>
      <div ref={slideRef} className={styles.slide}>
        <Image src={src} alt={alt} fill sizes={sizes} className={styles.img} />
      </div>
    </div>
  );
}
