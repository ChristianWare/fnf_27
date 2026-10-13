"use client";

// The hero's photos, one at a time: back and forward with the arrows (or
// the keyboard's arrow keys, or a swipe), going round from the last to the
// first and back. Every photo is stacked in the frame and the shown one
// fades in over the last, so a change is smooth in either direction. The
// small previews along the bottom jump straight to a photo.

import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import Icon from "@/components/Dashboard/icons";
import styles from "./ProjectHero.module.css";
import type { Photo } from "@/lib/projects";

export default function HeroCarousel({
  photos,
  name,
}: {
  photos: Photo[];
  /** The project's name, for screen readers. */
  name: string;
}) {
  const [at, setAt] = useState(0);
  const swipe = useRef<number | null>(null);
  const count = photos.length;
  const many = count > 1;
  const go = (step: number) => setAt((i) => (i + step + count) % count);

  const onKey = (e: KeyboardEvent) => {
    if (!many) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  };

  return (
    <div
      className={styles.photo}
      role='region'
      aria-roledescription='carousel'
      aria-label={`Photos of ${name}`}
      tabIndex={many ? 0 : undefined}
      onKeyDown={onKey}
      onTouchStart={(e) => {
        swipe.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = swipe.current;
        swipe.current = null;
        const end = e.changedTouches[0]?.clientX;
        if (!many || start === null || end === undefined) return;
        if (Math.abs(end - start) > 50) go(end < start ? 1 : -1);
      }}
    >
      {photos.map((photo, i) => (
        <div
          key={photo.caption}
          className={`${styles.slide} ${i === at ? styles.slideOn : ""}`}
          aria-hidden={i !== at}
          role='group'
          aria-roledescription='slide'
          aria-label={`${i + 1} of ${count}: ${photo.caption}`}
        >
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            sizes='(max-width: 968px) 100vw, 50vw'
            // The first is the page's main picture; the rest load right
            // after, so they're ready before anyone clicks.
            loading='eager'
            fetchPriority={i === 0 ? "high" : "low"}
            className={`${styles.img} ${photo.top ? styles.imgTop : ""}`}
          />
        </div>
      ))}

      {many && (
        <>
          <span className={styles.shadeBottom} aria-hidden='true' />

          <button
            type='button'
            className={`${styles.arrow} ${styles.arrowPrev}`}
            onClick={() => go(-1)}
            aria-label='Previous photo'
          >
            <Icon name='arrow' />
          </button>
          <button
            type='button'
            className={`${styles.arrow} ${styles.arrowNext}`}
            onClick={() => go(1)}
            aria-label='Next photo'
          >
            <Icon name='arrow' />
          </button>

          <div className={styles.carouselFoot}>
            <span className={styles.caption} aria-live='polite'>
              <span className={styles.count}>
                {at + 1} / {count}
              </span>
              {photos[at]?.caption}
            </span>
            <ul className={styles.thumbs}>
              {photos.map((photo, i) => (
                <li key={photo.caption}>
                  <button
                    type='button'
                    className={`${styles.thumb} ${i === at ? styles.thumbOn : ""}`}
                    onClick={() => setAt(i)}
                    aria-label={`Show photo ${i + 1}: ${photo.caption}`}
                    aria-current={i === at}
                  >
                    <Image
                      src={photo.src}
                      alt=''
                      fill
                      sizes='100px'
                      className={`${styles.thumbImg} ${photo.top ? styles.imgTop : ""}`}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
