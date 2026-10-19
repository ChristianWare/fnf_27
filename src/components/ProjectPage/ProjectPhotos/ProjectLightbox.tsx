"use client";

// A project's photos, full size, on a dark screen: back and forward (arrows,
// the keyboard, or a swipe) and how many there are. A photo is shown at its
// full width, so a tall full-page screenshot scrolls top to bottom. Built
// on the shared Modal's dark look, like the lead photos.

import Image from "next/image";
import { useEffect, useRef } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "@/components/Dashboard/icons";
import styles from "./ProjectPhotos.module.css";
import type { Photo } from "@/lib/projects";

export default function ProjectLightbox({
  photos,
  index,
  onIndex,
  onClose,
  title,
}: {
  photos: Photo[];
  /** Which photo is showing; null when it's closed. */
  index: number | null;
  onIndex: (index: number) => void;
  onClose: () => void;
  /** The project's name, for screen readers. */
  title: string;
}) {
  const open = index !== null && photos.length > 0;
  const at = Math.min(index ?? 0, Math.max(0, photos.length - 1));
  const many = photos.length > 1;
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // A new photo starts at its top.
  useEffect(() => {
    if (open) scroller.current?.scrollTo({ top: 0 });
  }, [open, at]);

  useEffect(() => {
    if (!open || !many) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        onIndex((at + 1) % photos.length);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        onIndex((at - 1 + photos.length) % photos.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, many, at, photos.length, onIndex]);

  const go = (step: number) =>
    onIndex((at + step + photos.length) % photos.length);
  const photo = photos[at];

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      variant='dark'
      label={`Photos of ${title}`}
    >
      {open && photo && (
        <div
          ref={scroller}
          className={styles.lightbox}
          // A click on the dark around the photo closes it.
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
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
            // Sideways only: scrolling down a tall photo isn't a swipe.
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5)
              go(dx < 0 ? 1 : -1);
          }}
        >
          <figure
            className={styles.lightboxFigure}
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <figcaption className={styles.lightboxCaption}>
              {many && (
                <span className={styles.lightboxCount}>
                  {at + 1} of {photos.length}
                </span>
              )}
              <span>{photo.caption}</span>
            </figcaption>
            <Image
              key={at}
              src={photo.src}
              alt={photo.alt}
              sizes='(max-width: 968px) 100vw, 1200px'
              loading='eager'
              className={styles.lightboxImg}
            />
          </figure>
          {many && (
            <>
              <button
                type='button'
                className={`${styles.lightboxArrow} ${styles.lightboxPrev}`}
                onClick={() => go(-1)}
                aria-label='Previous photo'
              >
                <Icon name='arrow' />
              </button>
              <button
                type='button'
                className={`${styles.lightboxArrow} ${styles.lightboxNext}`}
                onClick={() => go(1)}
                aria-label='Next photo'
              >
                <Icon name='arrow' />
              </button>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
