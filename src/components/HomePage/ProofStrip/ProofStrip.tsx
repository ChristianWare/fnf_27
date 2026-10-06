"use client";

// A muted background video that follows the page scroll: it moves forward
// as the visitor scrolls down and rewinds as they scroll back up.

import { useEffect, useRef } from "react";
import styles from "./ProofStrip.module.css";

import Logo from "@/components/shared/Logo/Logo";

const VIDEO_SRC = "/videos/heroii.mp4";
const POSTER = "/images/proof-poster.jpg"; // the clip's first frame
const EASE = 0.12; // how quickly the video catches up to the scroll (0 to 1)

export default function ProofStrip() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    // People who turn off motion get the still image.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let current = 0; // where the video is, in seconds
    let started = false;

    // 0 when the card first comes into view (or the page is at the very
    // top), 1 when it has scrolled completely off the top of the screen.
    const progress = () => {
      const rect = section.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const start = Math.max(0, top - window.innerHeight);
      const end = top + rect.height;
      if (end <= start) return 0;
      return Math.min(1, Math.max(0, (window.scrollY - start) / (end - start)));
    };

    const tick = () => {
      frame = requestAnimationFrame(tick);
      const duration = video.duration;
      if (!Number.isFinite(duration) || duration <= 0) return;

      // Stop just short of the last frame; some browsers go black on it.
      const target = progress() * Math.max(0, duration - 0.05);
      if (!started) {
        current = target; // no catch-up animation on page load
        started = true;
      }
      current += (target - current) * EASE;
      if (Math.abs(target - current) < 0.005) current = target;

      if (!video.seeking && Math.abs(video.currentTime - current) > 0.016) {
        video.currentTime = current;
      }
    };

    // iPhones don't load video frames until the video has played once, so
    // start it and pause it straight away. It's muted, so this is allowed.
    video
      .play()
      .then(() => video.pause())
      .catch(() => {});

    // Only do the work while the card is on (or near) the screen.
    const observer = new IntersectionObserver(
      ([entry]) => {
        cancelAnimationFrame(frame);
        if (entry.isIntersecting) frame = requestAnimationFrame(tick);
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(section);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={styles.container}
      aria-label='Results for Nier Transportation'
    >
      <video
        ref={videoRef}
        className={styles.video}
        src={VIDEO_SRC}
        poster={POSTER}
        muted
        playsInline
        preload='auto'
        disablePictureInPicture
        aria-hidden='true'
        tabIndex={-1}
      />
      <div className={styles.overlay} />

      <div className={styles.content}>
        <Logo noText blur='blur' logoLarge='logoLarge' />
      </div>
    </section>
  );
}
