"use client";

// Your own questions for one client: upload a .md file, see how it will
// look, choose whether it replaces the standard questionnaire or is added
// after it, and save. With nothing uploaded, they get the standard one.
// The format is in lib/dashboard/customQuestions.ts and the starter file.

import { useRef, useState } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "@/components/Dashboard/icons";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { useAction } from "@/components/Dashboard/useAction";
import { ui } from "@/components/Dashboard/ui/ui";
import {
  removeCustomQuestions,
  setCustomQuestions,
} from "@/app/admin/build-actions";
import {
  parseQuestions,
  type CustomQuestions as Custom,
} from "@/lib/dashboard/customQuestions";
import type { Question } from "@/lib/dashboard/questionnaire";
import { fmtDate } from "@/lib/dashboard/format";
import styles from "./CustomQuestions.module.css";

const STARTER = "/questionnaires/general-business.md";

const kind = (q: Question) =>
  q.type === "textarea"
    ? "Long answer"
    : q.type === "choice"
      ? "Pick one"
      : q.type === "multi"
        ? "Pick any"
        : q.type === "email"
          ? "Email"
          : q.type === "tel"
            ? "Phone"
            : q.type === "url"
              ? "Link"
              : "Short answer";

type Draft = { markdown: string; fileName: string; saved: boolean };

export default function CustomQuestions({
  clientId,
  firstName,
  custom,
  submitted,
}: {
  clientId: string;
  firstName: string;
  custom?: Custom;
  /** They've sent the questionnaire already. */
  submitted: boolean;
}) {
  const toast = useToast();
  const { run, pending } = useAction();
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(custom);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [mode, setMode] = useState<Custom["mode"]>(custom?.mode ?? "replace");

  const parsed = draft ? parseQuestions(draft.markdown) : null;

  const pick = async (file?: File) => {
    if (!file) return;
    if (!/\.(md|markdown|txt)$/i.test(file.name)) {
      toast("Choose a .md file.", { tone: "error" });
      return;
    }
    if (file.size > 100_000) {
      toast("That file is too big for a questionnaire.", { tone: "error" });
      return;
    }
    setDraft({ markdown: await file.text(), fileName: file.name, saved: false });
    setMode(current?.mode ?? "replace");
  };

  const save = () => {
    if (!draft || !parsed || parsed.errors.length) return;
    const next: Custom = {
      markdown: draft.markdown,
      fileName: draft.fileName,
      mode,
      uploadedAt: new Date().toISOString(),
    };
    run(
      () =>
        setCustomQuestions(clientId, {
          markdown: next.markdown,
          fileName: next.fileName,
          mode,
        }),
      (data) => {
        setCurrent(next);
        setDraft(null);
        return {
          message: "Questions saved",
          detail: `${data?.count ?? parsed.count} questions, ${mode === "replace" ? "instead of" : "after"} the standard ones. ${firstName} sees them now.`,
        };
      },
    );
  };

  const remove = () =>
    run(
      () => removeCustomQuestions(clientId),
      () => {
        setCurrent(undefined);
        return {
          message: "Back to the standard questions",
          detail: "Answers they already gave stay saved.",
        };
      },
    );

  return (
    <div className={styles.box}>
      <div className={styles.row}>
        <span className={styles.icon}>
          <Icon name='clipboard' />
        </span>
        <div className={styles.text}>
          <span className={styles.title}>
            {current ? "Your own questions" : "Standard questions"}
          </span>
          <span className={ui.monoMuted}>
            {current
              ? `${current.fileName} · ${current.mode === "replace" ? "Replaces the standard ones" : "Added after the standard ones"} · ${fmtDate(current.uploadedAt)}`
              : "Upload a .md file to ask your own"}
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        {current && (
          <button
            type='button'
            className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
            onClick={() =>
              setDraft({
                markdown: current.markdown,
                fileName: current.fileName,
                saved: true,
              })
            }
          >
            Preview
            <Icon name='eye' className={ui.btnIcon} />
          </button>
        )}
        <button
          type='button'
          className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
          onClick={() => input.current?.click()}
        >
          {current ? "Replace file" : "Upload questions (.md)"}
          <Icon name='upload' className={ui.btnIcon} />
        </button>
        {current ? (
          <button
            type='button'
            className={`${ui.btn} ${ui.btn_outline} ${ui.btnSmall}`}
            onClick={remove}
            disabled={pending}
          >
            Use standard
          </button>
        ) : (
          <a
            href={STARTER}
            download='general-business.md'
            className={`${ui.btn} ${ui.btn_outline} ${ui.btnSmall}`}
          >
            Starter file
            <Icon name='download' className={ui.btnIcon} />
          </a>
        )}
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
      {submitted && (
        <p className={styles.note}>
          {firstName} already sent the questionnaire. New questions show on
          their Questionnaire page; their answers so far stay saved.
        </p>
      )}

      <Modal
        isOpen={Boolean(draft)}
        onClose={() => setDraft(null)}
        label='Preview questions'
      >
        {draft && parsed && (
          <div className={ui.modalBody}>
            <span className={ui.monoMuted}>
              {draft.saved ? "Their questions" : "Preview"} · {draft.fileName}
            </span>
            <h2 className={ui.modalTitle}>
              {parsed.count} question{parsed.count === 1 ? "" : "s"} in{" "}
              {parsed.sections.length} section
              {parsed.sections.length === 1 ? "" : "s"}
            </h2>

            {parsed.errors.length > 0 && (
              <div className={styles.errors} role='alert'>
                <span className={styles.errorsTitle}>Fix these, then upload again</span>
                <ul>
                  {parsed.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {!draft.saved && (
              <div
                className={ui.chips}
                role='radiogroup'
                aria-label='How to use these questions'
              >
                <button
                  type='button'
                  role='radio'
                  aria-checked={mode === "replace"}
                  className={ui.chip}
                  onClick={() => setMode("replace")}
                >
                  Replace the standard questions
                </button>
                <button
                  type='button'
                  role='radio'
                  aria-checked={mode === "add"}
                  className={ui.chip}
                  onClick={() => setMode("add")}
                >
                  Add after the standard questions
                </button>
              </div>
            )}
            {!draft.saved && (
              <p className={styles.note}>
                {mode === "replace"
                  ? `For clients outside the limo world: ${firstName} sees only these, and their dashboard drops the ride and fleet wording.`
                  : `${firstName} answers the standard questions first, then these as the last sections.`}
              </p>
            )}

            <div className={styles.sections}>
              {parsed.sections.map((section) => (
                <section key={section.id} className={styles.section}>
                  <h3 className={styles.sectionTitle}>{section.title}</h3>
                  {section.intro && (
                    <p className={styles.intro}>{section.intro}</p>
                  )}
                  <ol className={styles.questions}>
                    {section.questions.map((q) => (
                      <li key={q.id} className={styles.question}>
                        <span className={styles.label}>
                          {q.label}
                          {q.required && (
                            <span className={styles.required}> · Required</span>
                          )}
                        </span>
                        <span className={ui.monoMuted}>
                          {kind(q)}
                          {q.options ? `: ${q.options.join(", ")}` : ""}
                        </span>
                        {q.help && <span className={styles.help}>{q.help}</span>}
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
                {draft.saved ? "Close" : "Cancel"}
              </button>
              {!draft.saved && (
                <button
                  type='button'
                  className={`${ui.btn} ${ui.btn_black}`}
                  disabled={parsed.errors.length > 0 || pending}
                  onClick={save}
                >
                  Save questions
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
