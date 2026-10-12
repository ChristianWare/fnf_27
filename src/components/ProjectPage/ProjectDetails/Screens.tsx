"use client";

// A project's screens, three across, and each one full size on a dark
// screen: back and forward with the arrows, the keyboard or a swipe. A
// full-page screenshot scrolls inside it instead of shrinking to a strip.

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "@/components/Dashboard/icons";
import styles from "./ProjectDetails.module.css";
import type { Screen } from "@/lib/projects";

export default function Screens({
  screens,
  name,
}: {
  screens: Screen[];
  /** The project's name, for screen readers. */
  name: string;
}) {
  const [shown, setShown] = useState<number | null>(null);
  const close = useCallback(() => setShown(null), []);
  const swipe = useRef<number | null>(null);
  const many = screens.length > 1;
  const at = shown ?? 0;
  const go = useCallback(
    (step: number) =>
      setShown((i) =>
        i === null ? i : (i + step + screens.length) % screens.length,
      ),
    [screens.length],
  );

  useEffect(() => {
    if (shown === null || !many) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, many, go]);

  const screen = screens[at];

  return (
    <>
      <ul className={styles.screens}>
        {screens.map((s, i) => (
          <li key={s.caption}>
            <button
              type='button'
              className={styles.screenButton}
              onClick={() => setShown(i)}
              aria-label={`See ${s.caption.toLowerCase()} full size`}
            >
              <Image
                src={s.src}
                alt={s.alt}
                fill
                sizes='(max-width: 568px) 100vw, (max-width: 968px) 50vw, 20vw'
                className={`${styles.screenImg} ${s.tall ? styles.screenTop : ""}`}
              />
              <span className={styles.shade} aria-hidden='true' />
              <span className={styles.expand} aria-hidden='true'>
                <Icon name='expand' />
                Click to expand
              </span>
            </button>
            <span className={styles.screenCaption}>{s.caption}</span>
          </li>
        ))}
      </ul>

      <Modal
        isOpen={shown !== null}
        onClose={close}
        variant='dark'
        label={`Screens from ${name}`}
      >
        {shown !== null && screen && (
          <div
            className={styles.lightbox}
            // A click on the dark around the picture closes it.
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
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
            <figure className={styles.lightboxFigure}>
              {screen.tall ? (
                <div className={styles.lightboxScroll} key={screen.caption}>
                  <Image
                    src={screen.src}
                    alt={screen.alt}
                    sizes='(max-width: 968px) 100vw, 1100px'
                    loading='eager'
                    className={styles.lightboxTall}
                  />
                </div>
              ) : (
                <Image
                  key={screen.caption}
                  src={screen.src}
                  alt={screen.alt}
                  sizes='100vw'
                  loading='eager'
                  className={styles.lightboxImg}
                />
              )}
              <figcaption className={styles.lightboxCaption}>
                {many && (
                  <span className={styles.lightboxCount}>
                    {at + 1} of {screens.length}
                  </span>
                )}
                <span>
                  {screen.caption}
                  {screen.tall ? " · Scroll to see it all" : ""}
                </span>
              </figcaption>
            </figure>
            {many && (
              <>
                <button
                  type='button'
                  className={`${styles.lightboxArrow} ${styles.lightboxPrev}`}
                  onClick={() => go(-1)}
                  aria-label='Previous screen'
                >
                  <Icon name='arrow' />
                </button>
                <button
                  type='button'
                  className={`${styles.lightboxArrow} ${styles.lightboxNext}`}
                  onClick={() => go(1)}
                  aria-label='Next screen'
                >
                  <Icon name='arrow' />
                </button>
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
