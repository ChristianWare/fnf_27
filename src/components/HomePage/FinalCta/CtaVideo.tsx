"use client";

// The call-to-action's background video: muted and looping, with a small
// pause/play button in the corner. It only plays while it's on screen, so
// the file isn't downloaded by people who never scroll this far.

import { useEffect, useRef, useState } from "react";
import styles from "./FinalCta.module.css";

const VIDEO_SRC = "/videos/heroiii.mp4";

export default function CtaVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(true);
  // Set when the visitor presses pause, so scrolling doesn't restart it.
  const stoppedByUser = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // People who turn off motion get a still frame. The button still works.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!stoppedByUser.current) video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      stoppedByUser.current = false;
      video.play().catch(() => {});
    } else {
      stoppedByUser.current = true;
      video.pause();
    }
  }

  return (
    <div className={styles.media}>
      <video
        ref={videoRef}
        className={styles.video}
        src={VIDEO_SRC}
        muted
        loop
        playsInline
        preload='metadata'
        disablePictureInPicture
        aria-hidden='true'
        tabIndex={-1}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
      />
      <button
        type='button'
        className={styles.toggle}
        onClick={toggle}
        aria-label={paused ? "Play background video" : "Pause background video"}
      >
        {paused ? (
          <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
            <path d='M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z' />
          </svg>
        ) : (
          <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
            <rect x='6' y='5' width='4' height='14' rx='1' />
            <rect x='14' y='5' width='4' height='14' rx='1' />
          </svg>
        )}
      </button>
    </div>
  );
}
