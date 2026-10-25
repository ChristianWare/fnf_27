"use client";

// One audit's Semrush exports: drop in the CSVs and each is recognised by
// its columns, summarised and added to the report's Search deep-dive. The
// score doesn't change.

import { useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { Pill, btn, ui } from "@/components/Dashboard/ui/ui";
import { useAction } from "@/components/Dashboard/useAction";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { addSemrush, removeSemrush } from "@/app/admin/audits/actions";
import { parseSemrush } from "@/lib/audit/semrush/parse";
import {
  SEMRUSH_LABELS,
  type SemrushFile,
} from "@/lib/audit/semrush/types";
import { fmtShort } from "@/lib/dashboard/format";
import styles from "./SemrushUpload.module.css";

const ORDER = [
  "Organic Positions (Organic Research → Positions → Export, all rows)",
  "Overview trend (Domain Overview → Organic traffic → Export)",
  "Organic Competitors (Organic Research → Competitors → Export)",
  "Keyword Gap (them against two or three rivals)",
  "Backlinks or Referring Domains (Backlink Analytics → Export)",
  "Pages (Organic Research → Pages → Export)",
];

export default function SemrushUpload({
  id,
  domain,
  files,
  warnings,
}: {
  id: string;
  domain: string;
  files: SemrushFile[];
  warnings: string[];
}) {
  const { run, pending } = useAction();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const add = async (list: FileList) => {
    setBusy(true);
    try {
      for (const f of Array.from(list)) {
        const parsed = parseSemrush(f.name, await f.text(), domain);
        if (!parsed.ok) {
          toast(parsed.error, { tone: "error" });
          continue;
        }
        const res = await addSemrush(id, parsed);
        if (!res.ok) toast(res.error, { tone: "error" });
        else
          toast(`Added: ${SEMRUSH_LABELS[parsed.kind]}`, {
            detail: `${parsed.file.rows.toLocaleString("en-US")} rows${parsed.file.database ? `, ${parsed.file.database} database` : ""}`,
          });
      }
    } catch {
      toast("That file didn't read. Is it a CSV from Semrush?", { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Semrush data</h2>
          <p className={styles.text}>
            Add Semrush exports for {domain || "their site"} and the report
            gets a Search deep-dive: what Google sends them and what it&apos;s
            worth, the ride searches closest to the top, traffic over time,
            who&apos;s ahead and who links to them. The score stays the same.
            Export from the US database.
          </p>
        </div>
        <label className={`${btn("black")} ${busy || pending || !domain ? styles.off : ""}`}>
          <Icon name='upload' className={styles.icon} />
          {busy ? "Reading…" : "Add Semrush CSVs"}
          <input
            type='file'
            accept='.csv,text/csv'
            multiple
            disabled={busy || pending || !domain}
            className={ui.srOnly}
            onChange={(e) => {
              const list = e.target.files;
              if (list?.length) add(list);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {!domain && (
        <p className={styles.warn}>This audit has no website, so there&apos;s nothing for Semrush to measure.</p>
      )}

      {warnings.map((w) => (
        <p key={w} className={styles.warn} role='alert'>
          <Icon name='info' className={styles.icon} />
          {w}
        </p>
      ))}

      {files.length > 0 ? (
        <ul className={styles.files}>
          {files.map((f) => (
            <li key={f.kind} className={styles.file}>
              <span className={styles.fileText}>
                <span className={styles.fileName}>{SEMRUSH_LABELS[f.kind]}</span>
                <span className={styles.fileSub}>
                  {f.name} · {f.rows.toLocaleString("en-US")} rows · added {fmtShort(f.uploadedAt)}
                </span>
              </span>
              {f.database && (
                <Pill tone={f.database === "US" ? "mint" : "yellow"}>{f.database}</Pill>
              )}
              <button
                type='button'
                className={btn("light", true)}
                disabled={pending || busy}
                onClick={() =>
                  run(
                    () => removeSemrush(id, f.kind),
                    () => ({ message: `Removed: ${SEMRUSH_LABELS[f.kind]}` }),
                  )
                }
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.order}>
          <span className={styles.label}>Worth exporting, most useful first</span>
          <ol>
            {ORDER.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
