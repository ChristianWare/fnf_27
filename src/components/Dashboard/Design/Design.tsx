"use client";

import Image, { type StaticImageData } from "next/image";
import { useState } from "react";
import Icon from "../icons";
import { ui } from "../ui/ui";
import { useAction } from "../useAction";
import styles from "./Design.module.css";
import { chooseDesigns } from "@/app/dashboard/actions";
import { picksNeeded, picksOf } from "@/lib/dashboard/helpers";
import { fmtDate, thumb } from "@/lib/dashboard/format";
import type { DesignId, DesignOption, Designs } from "@/lib/dashboard/types";
import Night from "../../../../public/images/cadiMotion.png";
import Desert from "../../../../public/images/cadiv.png";
import Studio from "../../../../public/images/cadi.png";

type Look = "midnight" | "desert" | "studio";
const LOOKS: Look[] = ["midnight", "desert", "studio"];

const photos: Record<Look, StaticImageData> = {
  midnight: Night,
  desert: Desert,
  studio: Studio,
};

const headlines: Record<Look, string> = {
  midnight: "Arrive like you mean it.",
  desert: "Every mile, handled.",
  studio: "Booked in a minute.",
};

/** The design itself: its screenshot, or a small sketch of the homepage. */
function Preview({
  option,
  index,
  business,
  city,
}: {
  option: DesignOption;
  index: number;
  business: string;
  city: string;
}) {
  const shot = option.images?.[0];
  if (shot) {
    return (
      <a
        href={shot}
        target='_blank'
        rel='noopener noreferrer'
        className={styles.shot}
        aria-label={`Open the ${option.name} design full size`}
      >
        <Image
          src={thumb(shot, 1200)}
          alt={`${option.name}, a design for ${business}`}
          fill
          unoptimized
          sizes='(max-width: 968px) 100vw, 33vw'
          className={styles.shotImg}
        />
      </a>
    );
  }
  const look = LOOKS.includes(option.id as Look)
    ? (option.id as Look)
    : LOOKS[index % LOOKS.length];
  return <Mock id={look} business={business} city={city} />;
}

/** A small, live sketch of the homepage in each direction. */
function Mock({
  id,
  business,
  city,
}: {
  id: Look;
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
  const { run, pending: saving } = useAction();
  const need = picksNeeded(designs.options.length);
  const byId = new Map(designs.options.map((o) => [o.id, o]));
  // Their picks as sent, and the ones they're making now, #1 first.
  const [saved, setSaved] = useState<DesignId[]>(() =>
    picksOf(designs).filter((id) => byId.has(id)),
  );
  const [draft, setDraft] = useState<DesignId[]>(saved);
  const [chosenAt, setChosenAt] = useState(designs.chosenAt);
  const ready = draft.length === need;
  const dirty = draft.join() !== saved.join();
  const sentBefore = saved.length > 0 && Boolean(chosenAt);
  const top = need === 1 ? "pick" : `top ${need}`;

  if (!designs.options.length) {
    return (
      <section className={styles.waiting}>
        <span className={styles.waitingIcon}>
          <Icon name='palette' />
        </span>
        <h2 className={styles.waitingTitle}>Your designs are on the way</h2>
        <p>
          Once your questionnaire is in, we design a few directions for your
          site. They show up here for you to choose from.
        </p>
      </section>
    );
  }

  const toggle = (id: DesignId) =>
    setDraft((list) =>
      list.includes(id)
        ? list.filter((x) => x !== id)
        : list.length < need
          ? [...list, id]
          : list,
    );

  const send = () => {
    const picks = draft;
    if (picks.length !== need || saving) return;
    run(
      () => chooseDesigns(picks),
      (data) => {
        setSaved(picks);
        setChosenAt(data?.chosenAt ?? new Date().toISOString());
        const first = byId.get(picks[0])?.name ?? "your #1";
        return need === 1
          ? {
              message: `${first} it is`,
              detail: "We'll build your site in this direction.",
            }
          : {
              message: `Your top ${need} are in`,
              detail: `Thanks! We'll start from your #1 pick, ${first}, and fine-tune it in the build.`,
            };
      },
    );
  };

  const status = locked
    ? "Your picks, favorite first."
    : !ready
      ? need === 1
        ? "Pick the design you like best."
        : draft.length === 0
          ? `Pick your ${need} favorites in order: your #1 first. Tap a pick again to take it back.`
          : `${need - draft.length} more to go. Tap a pick again to take it back.`
      : dirty
        ? `That's your ${top}. Send ${need === 1 ? "it" : "them"} over when you're happy with the order.`
        : sentBefore
          ? `Sent ${fmtDate(chosenAt!)}. You can change ${need === 1 ? "it" : "them"} until we start the build.`
          : "";

  return (
    <>
      <section className={styles.picksBar} aria-label={`Your ${top}`}>
        <div className={styles.picksIntro}>
          <span className={ui.monoMuted}>
            Your {top}
            {sentBefore && !dirty ? " · sent" : ""}
          </span>
          <p aria-live='polite'>{status}</p>
        </div>
        <ol className={styles.slots}>
          {Array.from({ length: need }, (_, i) => {
            const option = draft[i] ? byId.get(draft[i]) : undefined;
            return (
              <li
                key={i}
                className={`${styles.slot} ${option ? styles.slotFilled : ""}`}
              >
                <span className={styles.slotNum}>{i + 1}</span>
                <span className={styles.slotName}>
                  {option ? option.name : "Not picked yet"}
                </span>
                {option && !locked && (
                  <button
                    type='button'
                    className={styles.slotRemove}
                    aria-label={`Take ${option.name} out of your picks`}
                    onClick={() => toggle(option.id)}
                  >
                    <Icon name='close' />
                  </button>
                )}
              </li>
            );
          })}
        </ol>
        {!locked && (
          <button
            type='button'
            className={`${ui.btn} ${ui.btn_black} ${styles.sendPicks}`}
            disabled={!ready || !dirty || saving}
            onClick={send}
          >
            {saving
              ? "Sending…"
              : sentBefore && !dirty
                ? "Sent"
                : sentBefore
                  ? "Send my new picks"
                  : need === 1
                    ? "Send my pick"
                    : `Send my top ${need}`}
            <Icon
              name={sentBefore && !dirty ? "check" : "arrow"}
              className={ui.btnIcon}
            />
          </button>
        )}
      </section>

      <section className={styles.options}>
        {designs.options.map((option, index) => {
          const rank = draft.indexOf(option.id);
          const picked = rank >= 0;
          return (
            <article
              key={option.id}
              className={`${styles.option} ${picked ? styles.optionChosen : ""}`}
            >
              <div className={styles.previewWrap}>
                <Preview
                  option={option}
                  index={index}
                  business={business}
                  city={city}
                />
                {picked && (
                  <span className={styles.rankBadge} aria-hidden='true'>
                    #{rank + 1}
                  </span>
                )}
              </div>
              <div className={styles.body}>
                <div className={styles.titleRow}>
                  <h2 className={styles.name}>{option.name}</h2>
                </div>
                {option.mood && <p>{option.mood}</p>}
                {option.palette.length > 0 && (
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
                )}
                {(option.type || option.notes.length > 0) && (
                  <ul className={styles.notes}>
                    {option.type && (
                      <li className={styles.noteItem}>
                        <span className={ui.mono}>Type</span>
                        <p>{option.type}</p>
                      </li>
                    )}
                    {option.notes.map((note) => (
                      <li key={note} className={styles.noteItem}>
                        <span className={styles.bullet} />
                        <p>{note}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {!locked && (
                  <button
                    type='button'
                    aria-pressed={picked}
                    className={`${ui.btn} ${picked ? ui.btn_light : ui.btn_black} ${styles.choose} ${picked ? styles.choosePicked : ""}`}
                    disabled={!picked && draft.length >= need}
                    onClick={() => toggle(option.id)}
                  >
                    {picked ? (
                      <>
                        <Icon name='check' className={styles.pickCheck} />
                        {need === 1 ? "Picked" : `Your #${rank + 1} pick`}
                        <span className={styles.pickUndo}>Undo</span>
                      </>
                    ) : draft.length >= need ? (
                      need === 1 ? (
                        "Take back your pick to switch"
                      ) : (
                        `Your top ${need} is full`
                      )
                    ) : (
                      <>
                        {need === 1
                          ? `Pick ${option.name}`
                          : `Pick as #${draft.length + 1}`}
                        <Icon name='arrow' className={ui.btnIcon} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}
