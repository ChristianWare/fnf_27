"use client";

// A lead's photos, full size, on a dark screen: back and forward (arrows,
// the keyboard, or a swipe), how many there are, and who took each one.
// Built on the shared Modal's dark look.

import { useEffect, useRef } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "../icons";
import { NoImage, Photo } from "./bits";
import styles from "./Leads.module.css";
import type { LeadPhoto } from "@/lib/leads/types";

export default function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
  title,
}: {
  photos: LeadPhoto[];
  /** Which photo is showing; null when it's closed. */
  index: number | null;
  onIndex: (index: number) => void;
  onClose: () => void;
  /** The lead's name, for screen readers. */
  title: string;
}) {
  const open = index !== null && photos.length > 0;
  const at = Math.min(index ?? 0, Math.max(0, photos.length - 1));
  const many = photos.length > 1;
  const swipe = useRef<number | null>(null);

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
          className={styles.lightbox}
          // A click on the dark around the photo closes it.
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
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
            <Photo
              key={photo.full}
              srcs={[photo.full]}
              className={styles.lightboxImg}
              eager
              fallback={<NoImage className={styles.lightboxNone} />}
            />
            <figcaption className={styles.lightboxCaption}>
              {many && (
                <span className={styles.lightboxCount}>
                  {at + 1} of {photos.length}
                </span>
              )}
              <span>
                {photo.creditUrl ? (
                  <a
                    href={photo.creditUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    {photo.credit}
                  </a>
                ) : (
                  photo.credit
                )}
              </span>
            </figcaption>
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
