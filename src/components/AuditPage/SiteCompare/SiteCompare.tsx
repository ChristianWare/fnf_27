"use client";

// Their site today next to the concept site with their name on it: the top
// of each, side by side (stacked on a phone). Clicking one opens the whole
// page to scroll through. Not in the PDF.

import { useState } from "react";
import Modal from "@/components/shared/Modal/Modal";
import type { AuditCompare } from "@/lib/audit/types";
import styles from "./SiteCompare.module.css";

/** A Cloudinary image at a sensible width. */
const sized = (url: string, w: number) =>
  url.replace("/upload/", `/upload/w_${w},q_auto,f_auto/`);

export default function SiteCompare({
  compare,
  business,
}: {
  compare: AuditCompare;
  business: string;
}) {
  const [open, setOpen] = useState<"before" | "after" | null>(null);
  const panels = [
    { key: "before" as const, label: compare.beforeLabel, shot: compare.before },
    { key: "after" as const, label: compare.afterLabel, shot: compare.after },
  ];
  const current = panels.find((p) => p.key === open);

  return (
    <section className={styles.container} aria-labelledby='site-compare'>
      <div className={styles.head}>
        <span className={styles.label}>Before and after</span>
        <h3 id='site-compare' className={`${styles.title} h5`}>
          What riders see now, and what they could
        </h3>
      </div>

      <div className={styles.grid}>
        {panels.map((p) =>
          p.shot ? (
            <figure key={p.key} className={styles.panel}>
              <figcaption className={styles.caption}>{p.label}</figcaption>
              <button
                type='button'
                className={styles.frame}
                onClick={() => setOpen(p.key)}
                aria-label={`${p.label}: open the full page`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- an uploaded screenshot */}
                <img
                  src={sized(p.shot.url, 1200)}
                  alt={`${p.label}, ${business}`}
                  className={styles.img}
                  loading='lazy'
                />
                <span className={styles.expand}>See the whole page</span>
              </button>
            </figure>
          ) : null,
        )}
      </div>

      {compare.notes.length > 0 && (
        <ul className={styles.notes}>
          {compare.notes.map((n) => (
            <li key={n} className={styles.note}>
              {n}
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={Boolean(current)}
        onClose={() => setOpen(null)}
        label={current?.label ?? "Full page"}
      >
        {current?.shot && (
          <div className={styles.full}>
            <p className={styles.fullLabel}>{current.label}</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- an uploaded screenshot */}
            <img
              src={sized(current.shot.url, 1600)}
              alt={`${current.label}, the whole page`}
              className={styles.fullImg}
            />
          </div>
        )}
      </Modal>
    </section>
  );
}
