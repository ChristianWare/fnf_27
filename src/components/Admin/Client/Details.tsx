"use client";

// The small editable bits of a client: your private notes, their site
// links, and archiving (or restoring) them.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "@/components/Dashboard/icons";
import { useAction } from "@/components/Dashboard/useAction";
import { ui } from "@/components/Dashboard/ui/ui";
import {
  archiveClient,
  deleteClient,
  restoreClient,
  saveNotes,
  saveSiteLinks,
} from "@/app/admin/actions";
import { fmtDate } from "@/lib/dashboard/format";
import styles from "./Client.module.css";

export function Notes({
  clientId,
  initial,
}: {
  clientId: string;
  initial?: string;
}) {
  const { run, pending } = useAction();
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
          disabled={!dirty || pending}
          onClick={() =>
            run(
              () => saveNotes(clientId, notes),
              () => {
                setDirty(false);
                return { message: "Notes saved" };
              },
            )
          }
        >
          Save notes
        </button>
      </div>
    </section>
  );
}

export function SiteLinks({
  clientId,
  domain,
  previewUrl,
  liveUrl,
  bookingAdminUrl,
  platform,
}: {
  clientId: string;
  domain: string;
  previewUrl?: string;
  liveUrl?: string;
  bookingAdminUrl?: string;
  platform: boolean;
}) {
  const { run, pending } = useAction();
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
          disabled={!dirty || pending}
          onClick={() =>
            run(
              () => saveSiteLinks(clientId, links),
              () => {
                setDirty(false);
                return { message: "Site links saved" };
              },
            )
          }
        >
          Save links
        </button>
      </div>
    </section>
  );
}

export function Archive({
  clientId,
  business,
  endsOn,
  archivedAt,
  paidInvoices,
  now,
}: {
  clientId: string;
  business: string;
  /** The last day of this month, when billing would stop. */
  endsOn: string;
  /** Archived (or, in the future, scheduled to be). */
  archivedAt?: string;
  /** How many paid invoices deleting them would take with it. */
  paidInvoices: number;
  now: string;
}) {
  const { run, pending } = useAction();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState<"end" | "now">("end");
  // Archived already (not just scheduled): only then can they be deleted.
  const [gone, setGone] = useState(Boolean(archivedAt && archivedAt <= now));
  const [deleting, setDeleting] = useState(false);
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === business.trim().toLowerCase();
  const describe = (at?: string) =>
    !at
      ? null
      : at > now
        ? `${business} will be archived on ${fmtDate(new Date(new Date(at).getTime() - 86_400_000))}. Their billing stops then.`
        : `${business} is archived. Billing has stopped and they're signed out.`;
  const [archived, setArchived] = useState<string | null>(describe(archivedAt));

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
      {archived && (
        <div className={styles.actions}>
          <button
            type='button'
            className={`${ui.btn} ${ui.btn_outline} ${ui.btnSmall}`}
            disabled={pending}
            onClick={() =>
              run(
                () => restoreClient(clientId),
                () => {
                  setArchived(null);
                  setGone(false);
                  return {
                    message: `${business} restored`,
                    detail:
                      "They can sign in again. Billing doesn't restart on its own: set it up from their Billing tab.",
                  };
                },
              )
            }
          >
            Restore {business}
          </button>
          {gone && (
            <button
              type='button'
              className={`${ui.btn} ${styles.dangerBtn} ${ui.btnSmall}`}
              onClick={() => {
                setTyped("");
                setDeleting(true);
              }}
            >
              Delete forever
              <Icon name='trash' className={ui.btnIcon} />
            </button>
          )}
        </div>
      )}
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
              disabled={pending}
              onClick={() =>
                run(
                  () => archiveClient(clientId, when),
                  () => {
                    setOpen(false);
                    const text =
                      when === "end"
                        ? `${business} will be archived on ${fmtDate(endsOn)}. Their billing stops then.`
                        : `${business} is archived. Billing has stopped and they're signed out.`;
                    setArchived(text);
                    setGone(when === "now");
                    return {
                      message:
                        when === "end"
                          ? "Archive scheduled"
                          : "Client archived",
                      tone: "info",
                      detail: text,
                    };
                  },
                )
              }
            >
              Archive
            </button>
          </div>
        </div>
      </Modal>

      {gone && (
        <Modal
          isOpen={deleting}
          onClose={() => setDeleting(false)}
          label={`Delete ${business} forever`}
        >
          <form
            className={ui.modalBody}
            onSubmit={(e) => {
              e.preventDefault();
              if (!matches || pending) return;
              run(
                () => deleteClient(clientId, typed),
                () => {
                  setDeleting(false);
                  router.replace("/admin/clients?filter=archived");
                  return {
                    message: `${business} deleted`,
                    tone: "info",
                    detail: "Everything of theirs is gone from the dashboard.",
                  };
                },
              );
            }}
          >
            <span className={ui.monoMuted}>Delete forever</span>
            <h2 className={ui.modalTitle}>Delete {business} for good?</h2>
            <p className={styles.help}>
              This deletes their sign-ins, website, blueprint, designs, files,
              documents, messages, change requests, invoices, saved leads and
              Growth numbers. It can&apos;t be undone. Stripe keeps its own
              record of the customer and their payments.
            </p>
            {paidInvoices > 0 && (
              <div className={`${ui.notice} ${ui.noticeBad}`}>
                <Icon name='info' className={ui.noticeIcon} />
                <p>
                  They have {paidInvoices} paid{" "}
                  {paidInvoices === 1 ? "invoice" : "invoices"}. Download any
                  you need for your books from their Billing tab first.
                </p>
              </div>
            )}
            <label className={ui.field}>
              <span className={ui.label}>Type {business} to confirm</span>
              <input
                className={ui.input}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete='off'
                spellCheck={false}
              />
            </label>
            <div className={ui.modalActions}>
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_light}`}
                onClick={() => setDeleting(false)}
              >
                Keep them
              </button>
              <button
                type='submit'
                className={`${ui.btn} ${styles.dangerBtn}`}
                disabled={!matches || pending}
              >
                Delete forever
                <Icon name='trash' className={ui.btnIcon} />
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
