"use client";

// A muted background video that plays on a loop by itself, with a
// play/pause button in the bottom right corner.

import { useEffect, useRef, useState } from "react";
import styles from "./ProofStrip.module.css";

import Logo from "@/components/shared/Logo/Logo";

const VIDEO_SRC = "/videos/heroV.mp4";
const POSTER = "/images/proof-poster.jpg"; // the clip's first frame

export default function ProofStrip() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Whether the video should be playing when it's on screen. The button
  // flips this, and it starts as false for people who turn off motion.
  const wantsPlay = useRef(true);

  // Whether the video is actually playing right now. This follows the
  // video's own play/pause events, so the button always shows the truth,
  // even when the browser blocks autoplay.
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    // People who turn off motion get the still image until they press play.
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) wantsPlay.current = false;

    let onScreen = false;

    // Play while the card is on (or near) the screen, pause otherwise.
    const sync = () => {
      if (onScreen && wantsPlay.current) {
        // React doesn't always write the muted attribute into the HTML, and
        // browsers only allow autoplay for muted video, so set it here too.
        video.muted = true;
        // If the browser refuses (e.g. iPhone Low Power Mode), the poster
        // stays up and the button shows "play".
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(section);

    // React if the visitor changes their motion setting while on the page.
    const onMotionChange = (event: MediaQueryListEvent) => {
      wantsPlay.current = !event.matches;
      sync();
    };
    reducedMotion.addEventListener("change", onMotionChange);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", onMotionChange);
      video.pause();
    };
  }, []);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      wantsPlay.current = true;
      video.muted = true;
      video.play().catch(() => {});
    } else {
      wantsPlay.current = false;
      video.pause();
    }
  };

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
        loop
        playsInline
        preload='auto'
        disablePictureInPicture
        aria-hidden='true'
        tabIndex={-1}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <div className={styles.overlay} />

      <div className={styles.content}>
        <Logo noText blur='blur'  />
      </div>

      <button
        type='button'
        className={styles.toggle}
        onClick={toggle}
        aria-label={
          playing ? "Pause background video" : "Play background video"
        }
      >
        {playing ? (
          <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
            <rect x='5' y='4' width='5' height='16' rx='1' />
            <rect x='14' y='4' width='5' height='16' rx='1' />
          </svg>
        ) : (
          <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
            <path d='M7 4v16l14-8z' />
          </svg>
        )}
      </button>
    </section>
  );
}
