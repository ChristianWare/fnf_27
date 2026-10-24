"use client";

// A muted background video that loops by itself, with a play/pause button,
// the way the Nier hero does it: phones get a still image and never
// download the video; bigger screens get a small WebM (or MP4) from
// Cloudinary that only loads when the section is nearly on screen, plays
// while it's visible and pauses when it isn't. People who turn off motion
// see the still until they press play.
//
// The section keeps its own look: pass its class names for the media
// wrapper, the video and the button.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { VIDEOS, skipTo, videoSources, type VideoKey } from "@/lib/videos";
import styles from "./BackgroundVideo.module.css";

// Phones: the still image only. Matches the CSS below.
const PHONE = "(max-width: 768px)";

export default function BackgroundVideo({
  video: key,
  classes = {},
  toggleInside = false,
  priority = false,
}: {
  video: VideoKey;
  classes?: { media?: string; video?: string; toggle?: string };
  /** Put the button inside the media wrapper (when the section places it there). */
  toggleInside?: boolean;
  /** At the top of the page: load the phone image straight away. */
  priority?: boolean;
}) {
  const v = VIDEOS[key];
  const start = skipTo(v);
  const mediaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Whether it should play when it's on screen. The button flips this.
  const wantsPlay = useRef(true);
  // Whether it's playing right now, from the video's own events.
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const media = mediaRef.current;
    const el = videoRef.current;
    if (!media || !el) return;

    const phone = window.matchMedia(PHONE);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) wantsPlay.current = false;
    let onScreen = false;

    const sync = () => {
      if (onScreen && wantsPlay.current && !phone.matches) {
        // Browsers only autoplay muted video; React doesn't always set it.
        el.muted = true;
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(media);

    const onMotion = (e: MediaQueryListEvent) => {
      wantsPlay.current = !e.matches;
      sync();
    };
    reduced.addEventListener("change", onMotion);
    phone.addEventListener("change", sync);

    // A local file that should skip its first seconds.
    const toStart = () => {
      if (start && el.currentTime < start) el.currentTime = start;
    };
    if (el.readyState >= 1) toStart();
    el.addEventListener("loadedmetadata", toStart);

    return () => {
      observer.disconnect();
      reduced.removeEventListener("change", onMotion);
      phone.removeEventListener("change", sync);
      el.removeEventListener("loadedmetadata", toStart);
      el.pause();
    };
  }, [start]);

  const toggle = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      wantsPlay.current = true;
      el.muted = true;
      el.play().catch(() => {});
    } else {
      wantsPlay.current = false;
      el.pause();
    }
  };

  const button = (
    <button
      type='button'
      className={`${classes.toggle ?? ""} ${styles.toggle}`}
      onClick={toggle}
      aria-label={playing ? "Pause background video" : "Play background video"}
    >
      {playing ? (
        <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
          <rect x='6' y='5' width='4' height='14' rx='1' />
          <rect x='14' y='5' width='4' height='14' rx='1' />
        </svg>
      ) : (
        <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
          <path d='M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z' />
        </svg>
      )}
    </button>
  );

  return (
    <>
      <div ref={mediaRef} className={classes.media}>
        <Image
          src={v.poster}
          alt=''
          fill
          sizes='100vw'
          priority={priority}
          className={styles.still}
        />
        <video
          ref={videoRef}
          className={`${classes.video ?? ""} ${styles.video}`}
          poster={v.poster}
          muted
          loop
          playsInline
          preload='none'
          disablePictureInPicture
          aria-hidden='true'
          tabIndex={-1}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={
            start
              ? (e) => {
                  // Loop back to the start, skipping the opening seconds.
                  const el = e.currentTarget;
                  if (el.duration - el.currentTime < 0.3)
                    el.currentTime = start;
                }
              : undefined
          }
        >
          {videoSources(v).map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </video>
        {toggleInside && button}
      </div>
      {!toggleInside && button}
    </>
  );
}
