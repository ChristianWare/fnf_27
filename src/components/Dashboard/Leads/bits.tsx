"use client";

// Small pieces every leads page uses: the lead's photo (or icon) tile, its
// reasons, its stage, an event's date, the save button and the "won"
// dialog.

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "../icons";
import { Pill, ui } from "../ui/ui";
import { useToast } from "../Toast/Toast";
import { useLeads } from "./Store";
import styles from "./Leads.module.css";
import { reasonsFor, thisWeek, type Reason } from "@/lib/leads/advice";
import { CATEGORIES, EVENT_TYPES, stageOf } from "@/lib/leads/catalog";
import type { LeadStage, Located, Target } from "@/lib/leads/types";
import { fmtMonth, money } from "@/lib/dashboard/format";

/** "Hotel · Scottsdale" or "Gala · Phoenix". */
export const kindOf = (target: Target) =>
  `${target.kind === "ACCOUNT" ? CATEGORIES[target.category].short : EVENT_TYPES[target.type].short}${target.city ? ` · ${target.city}` : ""}`;

/** A Google photo that steps aside for something else if it won't load. */
export function Photo({
  src,
  className,
  fallback = null,
}: {
  src?: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  // A photo that failed before the page came to life never says so: check.
  const check = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth === 0) setBroken(true);
  }, []);
  if (!src || broken) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Google's photos come through our own proxy, not next/image.
    <img
      ref={check}
      src={src}
      alt=''
      className={className}
      loading='lazy'
      decoding='async'
      onError={() => setBroken(true)}
    />
  );
}

export function Tile({
  target,
  now,
  size = "md",
}: {
  target: Target;
  now: string;
  size?: "md" | "lg";
}) {
  const icon =
    target.kind === "ACCOUNT"
      ? CATEGORIES[target.category].icon
      : EVENT_TYPES[target.type].icon;
  const tone =
    target.kind === "ACCOUNT"
      ? styles.tileAccount
      : thisWeek(target, now)
        ? styles.tileSoon
        : styles.tileEvent;
  return (
    <span
      className={`${styles.tile} ${tone} ${size === "lg" ? styles.tileLg : ""}`}
      aria-hidden='true'
    >
      <Photo
        src={target.photo}
        className={styles.tilePhoto}
        fallback={<Icon name={icon} />}
      />
    </span>
  );
}

/** An event's date as a little calendar page. */
export function DateBlock({ date }: { date: string }) {
  const day = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    timeZone: "America/Phoenix",
  }).format(new Date(date));
  return (
    <span className={styles.dateBlock} aria-hidden='true'>
      <span className={styles.dateMonth}>{fmtMonth(date)}</span>
      <span className={styles.dateDay}>{day}</span>
    </span>
  );
}

export function Reasons({
  target,
  now,
  limit,
}: {
  target: Located;
  now: string;
  limit?: number;
}) {
  const reasons: Reason[] = reasonsFor(target, now).slice(0, limit);
  return (
    <span className={styles.reasons}>
      {reasons.map((reason) => (
        <span
          key={reason.text}
          className={`${styles.reason} ${styles[`reason_${reason.tone}`]}`}
        >
          {reason.text}
        </span>
      ))}
    </span>
  );
}

export function StagePill({ stage }: { stage: LeadStage }) {
  const s = stageOf(stage);
  return (
    <Pill tone={s.tone} dot>
      {s.label}
    </Pill>
  );
}

/** Save a lead, or show where it is in the pipeline once it's saved. */
export function SaveButton({
  id,
  from,
  small = true,
}: {
  id: string;
  from: string;
  small?: boolean;
}) {
  const { save, savedFor, target, saving, href } = useLeads();
  const toast = useToast();
  const lead = savedFor(id);
  const busy = saving.includes(id);
  if (lead) {
    return (
      <Link href={href(id)} className={styles.savedLink}>
        <StagePill stage={lead.stage} />
      </Link>
    );
  }
  return (
    <button
      type='button'
      className={`${ui.btn} ${ui.btn_black} ${small ? ui.btnSmall : ""}`}
      disabled={busy}
      aria-busy={busy}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const t = target(id);
        if (!t) return;
        const result = await save(id, from);
        if (!result) return;
        toast(`Saved ${t.name}`, {
          detail: result.contact
            ? `We found ${result.contact.name}, ${result.contact.title}, and wrote your scripts.`
            : "We wrote your scripts. No contact yet, so start with their main line.",
        });
      }}
    >
      {busy ? "Saving…" : "Save"}
      {!busy && <Icon name='plus' className={ui.btnIcon} />}
    </button>
  );
}

/** Asks what a win is worth, so the tool can show what leads bring in. */
export function WinDialog({
  id,
  open,
  onClose,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
}) {
  const { target, win } = useLeads();
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [per, setPer] = useState<"MONTH" | "ONCE">("MONTH");
  const [busy, setBusy] = useState(false);
  const t = target(id);
  const value = Number(amount);

  return (
    <Modal isOpen={open} onClose={onClose}>
      {open && t && (
        <form
          className={ui.modalBody}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!value || busy) return;
            setBusy(true);
            const ok = await win(id, value, per);
            setBusy(false);
            if (!ok) return;
            onClose();
            setAmount("");
            toast(`Won ${t.name}`, {
              detail: `${money(value)}${per === "MONTH" ? " a month" : ""} added to what your leads have brought in.`,
            });
          }}
        >
          <span className={styles.modalIcon}>
            <Icon name='star' />
          </span>
          <h2 className={ui.modalTitle}>Nice work. What&apos;s it worth?</h2>
          <p className={styles.modalText}>
            A rough number is fine. It&apos;s only for you, to see what your
            leads bring in.
          </p>
          <div className={styles.winRow}>
            <label className={ui.field}>
              <span className={ui.label}>About</span>
              <span className={styles.money}>
                <span aria-hidden='true'>$</span>
                <input
                  className={ui.input}
                  inputMode='decimal'
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value.replace(/[^\d.]/g, ""))
                  }
                  placeholder='800'
                  autoFocus
                />
              </span>
            </label>
            <div
              className={styles.perPick}
              role='radiogroup'
              aria-label='How often'
            >
              {(
                [
                  ["MONTH", "A month"],
                  ["ONCE", "One time"],
                ] as const
              ).map(([key, text]) => (
                <button
                  key={key}
                  type='button'
                  role='radio'
                  aria-checked={per === key}
                  className={ui.chip}
                  onClick={() => setPer(key)}
                >
                  {per === key && <Icon name='check' />}
                  {text}
                </button>
              ))}
            </div>
          </div>
          <div className={ui.modalActions}>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light}`}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type='submit'
              className={`${ui.btn} ${ui.btn_black}`}
              disabled={!value || busy}
            >
              Mark won
              <Icon name='check' className={ui.btnIcon} />
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
