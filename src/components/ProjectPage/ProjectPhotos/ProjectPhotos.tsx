"use client";

// A project's photos, three across, like the photos on a lead's page.
// Click any one (or "See them all") to open it full size on a dark screen,
// where a tall full-page screenshot scrolls top to bottom.

import Image from "next/image";
import { useCallback, useState } from "react";
import Icon from "@/components/Dashboard/icons";
import ProjectLightbox from "./ProjectLightbox";
import styles from "./ProjectPhotos.module.css";
import type { Photo } from "@/lib/projects";

export default function ProjectPhotos({
  photos,
  name,
}: {
  photos: Photo[];
  /** The project's name, for the copy and screen readers. */
  name: string;
}) {
  const [shown, setShown] = useState<number | null>(null);
  const close = useCallback(() => setShown(null), []);

  if (photos.length === 0) return null;
  const count = photos.length;

  return (
    <section className={styles.container} aria-label={`Photos of ${name}`}>
      <div className={styles.panel}>
        <div className={styles.head}>
          <div className={styles.titles}>
            <h2 className={styles.title}>Photos</h2>
            <p>
              {count} {count === 1 ? "photo" : "photos"} of {name}. Click any
              one to see it full size.
            </p>
          </div>
          <button
            type='button'
            className={styles.allBtn}
            onClick={() => setShown(0)}
          >
            See them all
            <Icon name='expand' className={styles.allIcon} />
          </button>
        </div>

        <ul className={styles.grid}>
          {photos.map((photo, i) => (
            <li key={`${photo.caption}-${i}`}>
              <button
                type='button'
                className={styles.gridButton}
                onClick={() => setShown(i)}
                aria-label={`See photo ${i + 1} of ${count} full size: ${photo.caption}`}
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes='(max-width: 568px) 100vw, (max-width: 968px) 50vw, 33vw'
                  className={`${styles.gridImg} ${photo.top ? styles.imgTop : ""}`}
                />
                <span className={styles.shade} aria-hidden='true' />
                <span className={styles.expand} aria-hidden='true'>
                  <Icon name='expand' />
                  Click to expand
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <ProjectLightbox
        photos={photos}
        index={shown}
        onIndex={setShown}
        onClose={close}
        title={name}
      />
    </section>
  );
}
