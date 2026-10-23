"use client";

// The whole blueprint as a .md file: upload one to write or rewrite every
// page at once, or download what's there to edit. The preview shows what
// changes before anything is saved. Format: lib/dashboard/blueprintMarkdown.

import { useRef, useState } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "@/components/Dashboard/icons";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { useAction } from "@/components/Dashboard/useAction";
import { ui } from "@/components/Dashboard/ui/ui";
import { importBlueprint } from "@/app/admin/build-actions";
import {
  blueprintToMarkdown,
  parseBlueprint,
} from "@/lib/dashboard/blueprintMarkdown";
import type { BlueprintPage } from "@/lib/dashboard/types";
import styles from "./BlueprintFile.module.css";

const key = (text: string) => text.trim().toLowerCase();

export default function BlueprintFile({
  clientId,
  firstName,
  pages,
  onImported,
}: {
  clientId: string;
  firstName: string;
  pages: BlueprintPage[];
  onImported: (pages: BlueprintPage[]) => void;
}) {
  const toast = useToast();
  const { run, pending } = useAction();
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<{ markdown: string; name: string } | null>(
    null,
  );
  const [send, setSend] = useState(true);

  const parsed = draft ? parseBlueprint(draft.markdown) : null;

  // What the upload does to what's there now.
  const changes = (() => {
    if (!parsed) return null;
    let added = 0;
    let changed = 0;
    let kept = 0;
    for (const p of parsed.pages) {
      const old = pages.find((x) => key(x.name) === key(p.name));
      for (const sec of p.sections) {
        const was = old?.sections.find((x) => key(x.title) === key(sec.title));
        if (!was) added++;
        else if (
          was.copy.length === sec.copy.length &&
          was.copy.every((line, i) => line === sec.copy[i].trim())
        )
          kept++;
        else changed++;
      }
    }
    const names = new Set(parsed.pages.map((p) => key(p.name)));
    const removed = pages
      .filter((p) => !names.has(key(p.name)))
      .reduce((n, p) => n + p.sections.length, 0);
    return { added, changed, kept, removed };
  })();

  const pick = async (file?: File) => {
    if (!file) return;
    if (!/\.(md|markdown|txt)$/i.test(file.name)) {
      toast("Choose a .md file.", { tone: "error" });
      return;
    }
    if (file.size > 300_000) {
      toast("That file is too big for a blueprint.", { tone: "error" });
      return;
    }
    setDraft({ markdown: await file.text(), name: file.name });
    setSend(true);
  };

  const download = () => {
    const blob = new Blob([blueprintToMarkdown(pages)], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blueprint-${firstName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const save = () => {
    if (!draft || !parsed || parsed.errors.length) return;
    run(
      () => importBlueprint(clientId, { markdown: draft.markdown, send }),
      (data) => {
        if (data) onImported(data.pages);
        setDraft(null);
        return {
          message: "Blueprint saved",
          detail: data?.sent
            ? `${data.sent} section${data.sent === 1 ? "" : "s"} sent to ${firstName}, with an email.`
            : "Nothing new went to the client yet.",
        };
      },
    );
  };

  return (
    <section className={styles.bar}>
      <div className={styles.text}>
        <span className={styles.title}>Blueprint file</span>
        <span className={styles.help}>
          Write every page in one .md file and upload it. Unchanged sections
          keep their notes.
        </span>
      </div>
      <div className={styles.actions}>
        {pages.length > 0 && (
          <button
            type='button'
            className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
            onClick={download}
          >
            Download .md
            <Icon name='download' className={ui.btnIcon} />
          </button>
        )}
        <button
          type='button'
          className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
          onClick={() => input.current?.click()}
        >
          Upload .md
          <Icon name='upload' className={ui.btnIcon} />
        </button>
        <input
          ref={input}
          type='file'
          accept='.md,.markdown,.txt,text/markdown,text/plain'
          hidden
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <Modal
        isOpen={Boolean(draft)}
        onClose={() => setDraft(null)}
        label='Preview blueprint'
      >
        {draft && parsed && changes && (
          <div className={ui.modalBody}>
            <span className={ui.monoMuted}>Preview · {draft.name}</span>
            <h2 className={ui.modalTitle}>
              {parsed.pages.length} page{parsed.pages.length === 1 ? "" : "s"},{" "}
              {parsed.sections} section{parsed.sections === 1 ? "" : "s"}
            </h2>

            {parsed.errors.length > 0 && (
              <div className={styles.errors} role='alert'>
                <span className={styles.errorsTitle}>
                  Fix these, then upload again
                </span>
                <ul>
                  {parsed.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {pages.length > 0 && parsed.errors.length === 0 && (
              <dl className={styles.diff}>
                <div className={styles.diffItem}>
                  <dt className={ui.monoMuted}>New</dt>
                  <dd>{changes.added}</dd>
                </div>
                <div className={styles.diffItem}>
                  <dt className={ui.monoMuted}>Rewritten</dt>
                  <dd>{changes.changed}</dd>
                </div>
                <div className={styles.diffItem}>
                  <dt className={ui.monoMuted}>Unchanged</dt>
                  <dd>{changes.kept}</dd>
                </div>
                <div className={styles.diffItem}>
                  <dt className={ui.monoMuted}>Removed</dt>
                  <dd>{changes.removed}</dd>
                </div>
              </dl>
            )}

            <div
              className={ui.chips}
              role='radiogroup'
              aria-label='Send to the client'
            >
              <button
                type='button'
                role='radio'
                aria-checked={send}
                className={ui.chip}
                onClick={() => setSend(true)}
              >
                Send the blueprint to {firstName}
              </button>
              <button
                type='button'
                role='radio'
                aria-checked={!send}
                className={ui.chip}
                onClick={() => setSend(false)}
              >
                Save as drafts
              </button>
            </div>
            <p className={styles.help}>
              {send
                ? `The whole blueprint goes to ${firstName} now, with an email, for them to approve as one. Unchanged sections keep their notes.`
                : "New and rewritten sections stay drafts until you press Send blueprint. Unchanged ones keep their status and notes."}
            </p>

            <div className={styles.pages}>
              {parsed.pages.map((p) => (
                <section key={p.name} className={styles.page}>
                  <div className={styles.pageHead}>
                    <h3 className={styles.pageName}>{p.name}</h3>
                    <span className={ui.monoMuted}>{p.path}</span>
                  </div>
                  {p.purpose && <p className={styles.help}>{p.purpose}</p>}
                  {p.keyword && (
                    <p className={styles.help}>Keyword: {p.keyword}</p>
                  )}
                  <ol className={styles.sections}>
                    {p.sections.map((sec) => (
                      <li key={sec.title} className={styles.section}>
                        <span className={styles.sectionTitle}>{sec.title}</span>
                        <span className={styles.excerpt}>
                          {sec.copy[0] ?? "No copy yet: stays a draft."}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>

            <div className={ui.modalActions}>
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_light}`}
                onClick={() => setDraft(null)}
              >
                Cancel
              </button>
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_black}`}
                disabled={parsed.errors.length > 0 || pending}
                onClick={save}
              >
                Save blueprint
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
