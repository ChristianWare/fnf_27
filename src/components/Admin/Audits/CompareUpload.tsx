"use client";

// One audit's before-and-after: a full-page screenshot of their site today
// and one of the concept site with their name on it. The report shows the
// top of each side by side; the PDF leaves them out.

import { useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { btn, ui } from "@/components/Dashboard/ui/ui";
import { useAction } from "@/components/Dashboard/useAction";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { upload } from "@/components/Dashboard/upload";
import { compareUploadTicket, saveCompare } from "@/app/admin/audits/actions";
import {
  COMPARE_DEFAULTS,
  type AuditCompare,
  type CompareShot,
} from "@/lib/audit/types";
import styles from "./CompareUpload.module.css";

type Side = "before" | "after";

export default function CompareUpload({
  id,
  compare,
}: {
  id: string;
  compare: AuditCompare | null;
}) {
  const { run, pending } = useAction();
  const toast = useToast();
  const start = compare ?? { ...COMPARE_DEFAULTS, show: true };
  const [before, setBefore] = useState<CompareShot | undefined>(start.before);
  const [after, setAfter] = useState<CompareShot | undefined>(start.after);
  const [beforeLabel, setBeforeLabel] = useState(start.beforeLabel);
  const [afterLabel, setAfterLabel] = useState(start.afterLabel);
  const [notes, setNotes] = useState<string[]>([
    ...start.notes,
    "",
    "",
    "",
  ].slice(0, 3));
  const [show, setShow] = useState(start.show);
  const [busy, setBusy] = useState<Side | null>(null);

  const save = (next?: Partial<{ before: CompareShot; after: CompareShot; show: boolean }>) =>
    run(
      () =>
        saveCompare(id, {
          before: next && "before" in next ? next.before : before,
          after: next && "after" in next ? next.after : after,
          beforeLabel,
          afterLabel,
          notes,
          show: next && "show" in next ? Boolean(next.show) : show,
        }),
      () => ({ message: "Saved" }),
    );

  const pick = async (side: Side, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast("That isn't an image. Use a PNG or JPG.", { tone: "error" });
      return;
    }
    setBusy(side);
    try {
      const ticket = await compareUploadTicket(id);
      if (!ticket.ok || !ticket.data) {
        toast(ticket.ok ? "Uploads aren't set up." : ticket.error, { tone: "error" });
        return;
      }
      const up = await upload(ticket.data, file);
      const shot = { url: up.url, publicId: up.publicId };
      if (side === "before") setBefore(shot);
      else setAfter(shot);
      save({ [side]: shot });
    } catch (e) {
      toast(e instanceof Error ? e.message : "That didn't upload.", { tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const slot = (side: Side, shot: CompareShot | undefined, title: string, help: string) => (
    <div className={styles.slot}>
      <div className={styles.slotHead}>
        <span className={styles.slotTitle}>{title}</span>
        <span className={styles.help}>{help}</span>
      </div>
      <div className={styles.frame}>
        {shot ? (
          // eslint-disable-next-line @next/next/no-img-element -- an uploaded screenshot
          <img src={shot.url.replace("/upload/", "/upload/w_900,q_auto,f_auto/")} alt='' className={styles.img} />
        ) : (
          <span className={styles.empty}>No screenshot yet</span>
        )}
      </div>
      <div className={styles.row}>
        <label className={`${btn(shot ? "light" : "black", true)} ${busy || pending ? styles.off : ""}`}>
          <Icon name='upload' className={styles.icon} />
          {busy === side ? "Uploading…" : shot ? "Replace" : "Upload screenshot"}
          <input
            type='file'
            accept='image/png,image/jpeg,image/webp'
            className={ui.srOnly}
            disabled={Boolean(busy) || pending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void pick(side, f);
            }}
          />
        </label>
        {shot && (
          <a className={btn("light", true)} href={shot.url} target='_blank' rel='noopener noreferrer'>
            Open
          </a>
        )}
      </div>
    </div>
  );

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Before and after</h2>
          <p className={styles.text}>
            A full-page screenshot of their site today, and one of the concept
            site with their name on it (GoFullPage works well). The report shows
            the top of each side by side, and opens the full page on a click.
            It isn&apos;t in the PDF.
          </p>
        </div>
        <div className={styles.toggle}>
          <button
            type='button'
            role='switch'
            aria-checked={show}
            aria-label='Show on the report'
            className={ui.switch}
            disabled={pending}
            onClick={() => {
              setShow(!show);
              save({ show: !show });
            }}
          />
          <span>{show ? "On the report" : "Hidden"}</span>
        </div>
      </div>

      <div className={styles.slots}>
        {slot("before", before, "1 · Their site today", "Full-page screenshot of their homepage")}
        {slot("after", after, "2 · The concept site", "With their business name on it")}
      </div>

      <div className={styles.fields}>
        <label className={ui.field}>
          <span className={ui.label}>Label over screenshot 1</span>
          <input className={ui.input} value={beforeLabel} onChange={(e) => setBeforeLabel(e.target.value)} />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Label over screenshot 2</span>
          <input className={ui.input} value={afterLabel} onChange={(e) => setAfterLabel(e.target.value)} />
        </label>
      </div>
      <div className={styles.notes}>
        <span className={ui.label}>What&apos;s different (up to three, shown under the pair)</span>
        {notes.map((n, i) => (
          <input
            key={i}
            className={ui.input}
            value={n}
            placeholder='Optional'
            aria-label={`Difference ${i + 1}`}
            onChange={(e) => setNotes(notes.map((x, j) => (j === i ? e.target.value : x)))}
          />
        ))}
      </div>
      <div className={styles.row}>
        <button type='button' className={btn("black")} disabled={pending || Boolean(busy)} onClick={() => save()}>
          Save
        </button>
        {(!before || !after) && (
          <span className={styles.help}>It shows on the report once both screenshots are in.</span>
        )}
      </div>
    </section>
  );
}
