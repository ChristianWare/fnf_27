"use client";

// The project's photos: one large picture, and the smaller ones under it to
// switch between (the shown one at full strength, the rest faded). On a
// phone the small ones give way to a next arrow and dots, and a swipe goes
// either way, and back and next arrows sit on the picture.

import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import Icon from "@/components/Dashboard/icons";
import styles from "./ProjectGallery.module.css";
import type { Photo } from "@/lib/projects";

export default function ProjectGallery({
  photos,
  name,
}: {
  photos: Photo[];
  /** The project's name, for screen readers. */
  name: string;
}) {
  const [at, setAt] = useState(0);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const count = photos.length;
  if (count === 0) return null;
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
      className={styles.gallery}
      role='region'
      aria-roledescription='carousel'
      aria-label={`Photos of ${name}`}
      tabIndex={many ? 0 : undefined}
      onKeyDown={onKey}
    >
      <div
        className={styles.frame}
        onTouchStart={(e) => {
          const t = e.touches[0];
          swipe.current = t ? { x: t.clientX, y: t.clientY } : null;
        }}
        onTouchEnd={(e) => {
          const start = swipe.current;
          swipe.current = null;
          const t = e.changedTouches[0];
          if (!many || !start || !t) return;
          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
            go(dx < 0 ? 1 : -1);
          }
        }}
      >
        {photos.map((photo, i) => (
          <div
            key={`${photo.caption}-${i}`}
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
              sizes='(max-width: 1268px) 100vw, 1200px'
              // The first is the page's main picture; the rest load right
              // after, so they're ready before anyone switches.
              loading='eager'
              fetchPriority={i === 0 ? "high" : "low"}
              className={`${styles.img} ${photo.top ? styles.imgTop : ""}`}
            />
          </div>
        ))}

        {many && (
          <>
            {/* On a phone: back and next, and a dot for each photo. */}
            <button
              type='button'
              className={`${styles.arrow} ${styles.prev}`}
              onClick={() => go(-1)}
              aria-label='Previous photo'
            >
              <Icon name='chevron' />
            </button>
            <button
              type='button'
              className={`${styles.arrow} ${styles.next}`}
              onClick={() => go(1)}
              aria-label='Next photo'
            >
              <Icon name='chevron' />
            </button>
            <div className={styles.dots} aria-hidden='true'>
              {photos.map((photo, i) => (
                <span
                  key={`${photo.caption}-${i}`}
                  className={`${styles.dot} ${i === at ? styles.dotOn : ""}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <p className={styles.srOnly} aria-live='polite'>
        Photo {at + 1} of {count}: {photos[at]?.caption}
      </p>

      {many && (
        <ul className={styles.thumbs}>
          {photos.map((photo, i) => (
            <li key={`${photo.caption}-${i}`}>
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
                  sizes='174px'
                  className={`${styles.thumbImg} ${photo.top ? styles.imgTop : ""}`}
                />
              </button>
            </li>
          ))}
        </ul>
      )}

    </div>
  );
}
