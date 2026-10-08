"use client";

import Image, { type StaticImageData } from "next/image";
import { useState } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "../icons";
import { Pill, ui } from "../ui/ui";
import { useToast } from "../Toast/Toast";
import styles from "./Design.module.css";
import { fmtDate } from "@/lib/dashboard/format";
import type { DesignId, Designs } from "@/lib/dashboard/types";
import Night from "../../../../public/images/cadiMotion.png";
import Desert from "../../../../public/images/cadiv.png";
import Studio from "../../../../public/images/cadi.png";

const photos: Record<DesignId, StaticImageData> = {
  midnight: Night,
  desert: Desert,
  studio: Studio,
};

const headlines: Record<DesignId, string> = {
  midnight: "Arrive like you mean it.",
  desert: "Every mile, handled.",
  studio: "Booked in a minute.",
};

/** A small, live sketch of the homepage in each direction. */
function Mock({
  id,
  business,
  city,
}: {
  id: DesignId;
  business: string;
  city: string;
}) {
  return (
    <div className={`${styles.mock} ${styles[id]}`} aria-hidden='true'>
      <div className={styles.mockNav}>
        <span className={styles.mockLogo}>{business}</span>
        <span className={styles.mockLinks}>
          <i />
          <i />
          <i />
        </span>
        <span className={styles.mockBook}>Book</span>
      </div>
      <div className={styles.mockHero}>
        <div className={styles.mockText}>
          <span className={styles.mockKicker}>
            {city.split(",")[0]} black car
          </span>
          <span className={styles.mockHeadline}>{headlines[id]}</span>
          <span className={styles.mockCta}>Book a ride</span>
        </div>
        <div className={styles.mockPhoto}>
          <Image
            src={photos[id]}
            alt=''
            fill
            sizes='(max-width: 968px) 50vw, 220px'
            className={styles.mockImg}
          />
        </div>
      </div>
      <div className={styles.mockCards}>
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

export default function Design({
  designs,
  business,
  city,
  locked,
}: {
  designs: Designs;
  business: string;
  city: string;
  /** After launch the choice is history, not a decision. */
  locked: boolean;
}) {
  const toast = useToast();
  const [chosen, setChosen] = useState(designs.chosen);
  const [chosenAt, setChosenAt] = useState(designs.chosenAt);
  const [confirm, setConfirm] = useState<DesignId | null>(null);

  const pending = designs.options.find((o) => o.id === confirm);
  const current = designs.options.find((o) => o.id === chosen);

  if (!designs.options.length) {
    return (
      <section className={styles.waiting}>
        <span className={styles.waitingIcon}>
          <Icon name='palette' />
        </span>
        <h2 className={styles.waitingTitle}>Your designs are on the way</h2>
        <p>
          Once your questionnaire is in, we design three directions for your
          site. They show up here for you to choose from.
        </p>
      </section>
    );
  }

  return (
    <>
      {current && chosenAt && (
        <div className={styles.chosenBar}>
          <span className={styles.chosenSwatches} aria-hidden='true'>
            {current.palette.map((swatch) => (
              <i key={swatch.hex} style={{ backgroundColor: swatch.hex }} />
            ))}
          </span>
          <p>
            You chose <strong>{current.name}</strong> on {fmtDate(chosenAt)}.
            {!locked && " You can still switch until we start the build."}
          </p>
        </div>
      )}

      <section className={styles.options}>
        {designs.options.map((option) => {
          const isChosen = option.id === chosen;
          return (
            <article
              key={option.id}
              className={`${styles.option} ${isChosen ? styles.optionChosen : ""}`}
            >
              <Mock id={option.id} business={business} city={city} />
              <div className={styles.body}>
                <div className={styles.titleRow}>
                  <h2 className={styles.name}>{option.name}</h2>
                  {isChosen && (
                    <Pill tone='lime' dot>
                      Your choice
                    </Pill>
                  )}
                </div>
                <p>{option.mood}</p>
                <ul className={styles.palette}>
                  {option.palette.map((swatch) => (
                    <li key={swatch.hex} className={styles.swatch}>
                      <span
                        className={styles.swatchDot}
                        style={{ backgroundColor: swatch.hex }}
                      />
                      <span className={ui.monoMuted}>{swatch.name}</span>
                    </li>
                  ))}
                </ul>
                <ul className={styles.notes}>
                  <li className={styles.noteItem}>
                    <span className={ui.mono}>Type</span>
                    <p>{option.type}</p>
                  </li>
                  {option.notes.map((note) => (
                    <li key={note} className={styles.noteItem}>
                      <span className={styles.bullet} />
                      <p>{note}</p>
                    </li>
                  ))}
                </ul>
                {!locked && !isChosen && (
                  <button
                    type='button'
                    className={`${ui.btn} ${chosen ? ui.btn_light : ui.btn_black} ${styles.choose}`}
                    onClick={() => setConfirm(option.id)}
                  >
                    {chosen
                      ? `Switch to ${option.name}`
                      : `Choose ${option.name}`}
                    <Icon name='arrow' className={ui.btnIcon} />
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <Modal isOpen={Boolean(pending)} onClose={() => setConfirm(null)}>
        {pending && (
          <div className={ui.modalBody}>
            <span className={ui.monoMuted}>Your design</span>
            <h2 className={ui.modalTitle}>Go with {pending.name}?</h2>
            <p className={styles.modalCopy}>
              We&apos;ll build your site in this direction. Colors, photos and
              details still get fine-tuned along the way, and you&apos;ll see
              everything on your preview before launch.
            </p>
            <div className={ui.modalActions}>
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_light}`}
                onClick={() => setConfirm(null)}
              >
                Keep looking
              </button>
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_black}`}
                onClick={() => {
                  setChosen(pending.id);
                  setChosenAt(new Date().toISOString());
                  setConfirm(null);
                  toast(`${pending.name} it is`, {
                    detail: "We'll build your site in this direction.",
                  });
                }}
              >
                Choose {pending.name}
                <Icon name='check' className={ui.btnIcon} />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
