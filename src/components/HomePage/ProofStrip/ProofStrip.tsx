"use client";

// A muted background video under a dark overlay, with the proof strip in
// white on top and a pause/play button in the bottom-right corner.

import { useEffect, useRef, useState } from "react";
import styles from "./ProofStrip.module.css";
import Image from "next/image";
import LogoImg from '../../../../public/logos/fnf_logo_black.png'

const VIDEO_SRC = "/videos/heroii.mp4";
const POSTER = "/images/proof-poster.jpg"; // the clip's first frame
const RATE = 1; // playback speed: 0.25 is quarter speed

export default function ProofStrip({
  googleRating,
}: {
  /** e.g. "4.9★". Leave it out until you have it, and that item is hidden. */
  googleRating?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.defaultPlaybackRate = RATE;
    video.playbackRate = RATE;

    // People who turn off motion get the still image. The button still
    // lets them play it.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Autoplay can be blocked (an iPhone in Low Power Mode, for example).
    // The poster stays up, and the button shows Play.
    video.play().catch(() => setPaused(true));
  }, []);

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.playbackRate = RATE;
      video.play().catch(() => setPaused(true));
    } else {
      video.pause();
    }
  }

  const items = [
    "Nier Transportation, Phoenix",
    "In business since 2004",
    "$0 per-booking fees",
    "Books online 24/7",
    ...(googleRating ? [`${googleRating} on Google`] : []),
  ];

  return (
    <section
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
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
      />
      <div className={styles.overlay} />

      <div className={styles.content}>
        <div className={styles.imgContainer}>
          <Image src={LogoImg} alt='' title='' className={styles.img} fill />
        </div>
        <h2 className={`${styles.heading} h6`}>
          Fonts & Footers is a Phoenix company that builds websites, booking
          software and a leads tool for black car and limo operators, and no one
          else.
        </h2>
      </div>

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
    </section>
  );
}
