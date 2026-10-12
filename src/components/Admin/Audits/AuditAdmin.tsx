"use client";

// One audit, the studio's side: where you are with the operator, your
// notes, the report link to text them, running it again, using it as the
// public sample, and deleting it.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btn, ui } from "@/components/Dashboard/ui/ui";
import { useAction } from "@/components/Dashboard/useAction";
import { FOLLOW_UPS, FOLLOW_UP_LABELS, type FollowUp } from "@/lib/audit/kinds";
import {
  removeAudit,
  rerunAudit,
  saveAuditNotes,
  setFollowUp,
  setSample,
} from "@/app/admin/audits/actions";
import styles from "./Audits.module.css";

export default function AuditAdmin({
  id,
  followUp,
  notes,
  sample,
  done,
  reportPath,
}: {
  id: string;
  followUp: FollowUp;
  notes: string;
  sample: boolean;
  done: boolean;
  reportPath: string;
}) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [status, setStatus] = useState(followUp);
  const [text, setText] = useState(notes);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${reportPath}`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className={styles.panel} aria-label='Follow-up'>
      <div className={styles.runRow}>
        <label className={ui.field}>
          <span className={ui.label}>Where you are with them</span>
          <select
            className={ui.select}
            value={status}
            disabled={pending}
            onChange={(e) => {
              const next = e.target.value as FollowUp;
              setStatus(next);
              run(
                () => setFollowUp(id, next),
                () => ({ message: "Saved" }),
              );
            }}
          >
            {FOLLOW_UPS.map((f) => (
              <option key={f} value={f}>
                {FOLLOW_UP_LABELS[f]}
              </option>
            ))}
          </select>
        </label>
        <span />
        <div className={styles.actions}>
          <button type='button' className={btn("black")} onClick={copy}>
            {copied ? "Link copied" : "Copy the report link"}
          </button>
        </div>
      </div>

      <label className={ui.field}>
        <span className={ui.label}>Notes</span>
        <textarea
          className={`${ui.textarea} ${styles.notes}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='What they said on the call, what to follow up on…'
        />
      </label>

      <div className={styles.actions}>
        <button
          type='button'
          className={btn("light")}
          disabled={pending || text === notes}
          onClick={() =>
            run(
              () => saveAuditNotes(id, text),
              () => ({ message: "Notes saved" }),
            )
          }
        >
          Save notes
        </button>
        <button
          type='button'
          className={btn("light")}
          disabled={pending}
          onClick={() =>
            run(
              () => rerunAudit(id),
              (data) => {
                if (data?.id) router.push(`/admin/audits/${data.id}`);
                return { message: "Running it again" };
              },
            )
          }
        >
          Run it again
        </button>
        {done && (
          <button
            type='button'
            className={btn("light")}
            disabled={pending}
            onClick={() => {
              if (
                !sample &&
                !window.confirm(
                  "The sample takes out their name, website, address, phone and anything quoted from their site, but keeps their review count, rating and where they rank, which someone could look up. Use it for an operator who's fine being shown?",
                )
              )
                return;
              run(
                () => setSample(id, !sample),
                () => ({
                  message: sample
                    ? "No longer the sample"
                    : "Now the sample report",
                }),
              );
            }}
          >
            {sample ? "Stop using as the sample" : "Use as the sample report"}
          </button>
        )}
        <button
          type='button'
          className={btn("outline")}
          disabled={pending}
          onClick={() => {
            if (
              !window.confirm(
                "Delete this audit for good? Its link will stop working.",
              )
            )
              return;
            run(
              () => removeAudit(id),
              () => {
                router.push("/admin/audits");
                return { message: "Deleted" };
              },
            );
          }}
        >
          Delete
        </button>
      </div>
    </section>
  );
}
