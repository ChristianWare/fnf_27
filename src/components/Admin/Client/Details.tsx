"use client";

// The small editable bits of a client: your private notes, their site
// links, and archiving them. SAMPLE: saves show a toast and last until you
// reload.

import { useState } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "@/components/Dashboard/icons";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { ui } from "@/components/Dashboard/ui/ui";
import { fmtDate } from "@/lib/dashboard/format";
import styles from "./Client.module.css";

export function Notes({ initial }: { initial?: string }) {
  const toast = useToast();
  const [notes, setNotes] = useState(initial ?? "");
  const [dirty, setDirty] = useState(false);

  return (
    <section className={styles.card}>
      <div className={styles.titles}>
        <h2 className={styles.heading}>Notes</h2>
        <p>Only admins see these.</p>
      </div>
      <textarea
        className={`${ui.textarea} ${styles.notes}`}
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setDirty(true);
        }}
        placeholder='Rates you agreed, how they like to be reached, what to bring up next time…'
      />
      <div className={styles.actions}>
        <button
          type='button'
          className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
          disabled={!dirty}
          onClick={() => {
            setDirty(false);
            toast("Notes saved");
          }}
        >
          Save notes
        </button>
      </div>
    </section>
  );
}

export function SiteLinks({
  domain,
  previewUrl,
  liveUrl,
  bookingAdminUrl,
  platform,
}: {
  domain: string;
  previewUrl?: string;
  liveUrl?: string;
  bookingAdminUrl?: string;
  platform: boolean;
}) {
  const toast = useToast();
  const [links, setLinks] = useState({
    domain,
    previewUrl: previewUrl ?? "",
    liveUrl: liveUrl ?? "",
    bookingAdminUrl: bookingAdminUrl ?? "",
  });
  const [dirty, setDirty] = useState(false);
  const set = (key: keyof typeof links, value: string) => {
    setLinks((l) => ({ ...l, [key]: value }));
    setDirty(true);
  };

  const fields: {
    key: keyof typeof links;
    label: string;
    placeholder: string;
  }[] = [
    { key: "domain", label: "Domain", placeholder: "theircompany.com" },
    { key: "previewUrl", label: "Private preview", placeholder: "https://" },
    { key: "liveUrl", label: "Live site", placeholder: "https://" },
    ...(platform
      ? [
          {
            key: "bookingAdminUrl" as const,
            label: "Booking dashboard",
            placeholder: "https://",
          },
        ]
      : []),
  ];

  return (
    <section className={styles.card}>
      <div className={styles.titles}>
        <h2 className={styles.heading}>Site links</h2>
        <p>The preview link shows up on their Project status page.</p>
      </div>
      <div className={styles.fieldList}>
        {fields.map((field) => (
          <label key={field.key} className={ui.field}>
            <span className={ui.label}>{field.label}</span>
            <input
              className={ui.input}
              value={links[field.key]}
              placeholder={field.placeholder}
              onChange={(e) => set(field.key, e.target.value)}
            />
          </label>
        ))}
      </div>
      <div className={styles.actions}>
        <button
          type='button'
          className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
          disabled={!dirty}
          onClick={() => {
            setDirty(false);
            toast("Site links saved");
          }}
        >
          Save links
        </button>
      </div>
    </section>
  );
}

export function Archive({
  business,
  endsOn,
}: {
  business: string;
  /** The last day of this month, when billing would stop. */
  endsOn: string;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState<"end" | "now">("end");
  const [archived, setArchived] = useState<string | null>(null);

  return (
    <section className={`${styles.card} ${styles.danger}`}>
      <div className={styles.titles}>
        <h2 className={styles.heading}>Archive</h2>
        <p>
          {archived
            ? archived
            : "Cancels their billing, signs them out and hides them from your lists. Invoices and files are kept, and you can restore them anytime."}
        </p>
      </div>
      {!archived && (
        <div className={styles.actions}>
          <button
            type='button'
            className={`${ui.btn} ${ui.btn_outline} ${ui.btnSmall}`}
            onClick={() => setOpen(true)}
          >
            Archive {business}
            <Icon name='archive' className={ui.btnIcon} />
          </button>
        </div>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <div className={ui.modalBody}>
          <span className={ui.monoMuted}>Archive client</span>
          <h2 className={ui.modalTitle}>Archive {business}?</h2>
          <div className={styles.choices} role='radiogroup' aria-label='When'>
            {(
              [
                [
                  "end",
                  `At the end of the month, on ${fmtDate(endsOn)}`,
                  "They keep everything until then. Nothing more is charged.",
                ],
                [
                  "now",
                  "Now",
                  "Billing stops today. Refunds for this month are up to you, in Stripe.",
                ],
              ] as const
            ).map(([value, title, text]) => (
              <button
                key={value}
                type='button'
                role='radio'
                aria-checked={when === value}
                className={`${styles.choice} ${when === value ? styles.choiceOn : ""}`}
                onClick={() => setWhen(value)}
              >
                <span className={styles.radio} aria-hidden='true' />
                <span className={styles.choiceText}>
                  <span className={styles.choiceTitle}>{title}</span>
                  <p>{text}</p>
                </span>
              </button>
            ))}
          </div>
          <div className={ui.modalActions}>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light}`}
              onClick={() => setOpen(false)}
            >
              Keep them
            </button>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black}`}
              onClick={() => {
                setOpen(false);
                const text =
                  when === "end"
                    ? `${business} will be archived on ${fmtDate(endsOn)}.`
                    : `${business} is archived. Billing has stopped.`;
                setArchived(text);
                toast(
                  when === "end" ? "Archive scheduled" : "Client archived",
                  {
                    tone: "info",
                    detail: text,
                  },
                );
              }}
            >
              Archive
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
