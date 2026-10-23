"use client";

// Shape a client's service agreement before they see it: start from a
// template, then change the plan's name and description, what's included
// and any term. The names, the fees and the signatures fill in from the
// account. Used when approving a sign-up, and on an agreement that hasn't
// been signed yet.

import { useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { useAction } from "@/components/Dashboard/useAction";
import { ui } from "@/components/Dashboard/ui/ui";
import {
  deleteAgreementTemplate,
  saveAgreementTemplate,
} from "@/app/admin/agreement-actions";
import {
  BUILT_IN,
  LIMITS,
  builtInDraft,
  fromTemplate,
  type AgreementDraft,
  type AgreementTemplate,
  type AgreementTerm,
} from "@/lib/agreements/types";
import type { PlanId } from "@/lib/dashboard/types";
import styles from "./AgreementEditor.module.css";

export type PreviewInput = {
  clientId: string;
  plan: PlanId;
  monthly: number;
  setup: number;
};

export default function AgreementEditor({
  value,
  onChange,
  plan,
  templates,
  onTemplates,
  preview,
}: {
  value: AgreementDraft;
  onChange: (next: AgreementDraft) => void;
  /** For the built-in templates, which differ by plan. */
  plan: PlanId;
  templates: AgreementTemplate[];
  onTemplates: (list: AgreementTemplate[]) => void;
  preview: PreviewInput;
}) {
  const toast = useToast();
  const { run, pending } = useAction();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [previewing, setPreviewing] = useState(false);

  const set = (change: Partial<AgreementDraft>) =>
    onChange({ ...value, ...change });
  const setTerm = (i: number, change: Partial<AgreementTerm>) =>
    set({
      terms: value.terms.map((t, j) => (j === i ? { ...t, ...change } : t)),
    });
  const move = (i: number, by: -1 | 1) => {
    const j = i + by;
    if (j < 0 || j >= value.terms.length) return;
    const terms = [...value.terms];
    [terms[i], terms[j]] = [terms[j], terms[i]];
    set({ terms });
  };

  const choose = (id: string) => {
    if (id === value.template) return;
    const saved = templates.find((t) => t.id === id);
    onChange(saved ? fromTemplate(saved) : builtInDraft(id, plan));
  };

  const downloadPreview = async () => {
    setPreviewing(true);
    try {
      const response = await fetch("/admin/agreements/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...preview, agreement: value }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "The preview didn't work.");
      }
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download =
        /filename="([^"]+)"/.exec(
          response.headers.get("Content-Disposition") ?? "",
        )?.[1] ?? "Agreement-preview.pdf";
      link.click();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
    } catch (error) {
      toast((error as Error).message, { tone: "error" });
    } finally {
      setPreviewing(false);
    }
  };

  const saveTemplate = () => {
    const title = name.trim();
    if (!title || pending) return;
    run(
      () => saveAgreementTemplate(title, value),
      (list) => {
        if (list) {
          onTemplates(list);
          const saved = list.find(
            (t) => t.name.toLowerCase() === title.toLowerCase(),
          );
          if (saved) set({ template: saved.id });
        }
        setNaming(false);
        setName("");
        return {
          message: `Template saved: ${title}`,
          detail: "Pick it next time you approve someone.",
        };
      },
    );
  };

  const removeTemplate = (t: AgreementTemplate) =>
    run(
      () => deleteAgreementTemplate(t.id),
      (list) => {
        if (list) onTemplates(list);
        return { message: `Template removed: ${t.name}`, tone: "info" };
      },
    );

  return (
    <div className={styles.editor}>
      <div className={styles.block}>
        <span className={ui.label}>Start from</span>
        <div className={styles.templates} role='radiogroup' aria-label='Template'>
          {BUILT_IN.map((t) => (
            <button
              key={t.id}
              type='button'
              role='radio'
              aria-checked={value.template === t.id}
              className={`${styles.template} ${value.template === t.id ? styles.templateOn : ""}`}
              onClick={() => choose(t.id)}
              title={t.help}
            >
              {t.name}
            </button>
          ))}
          {templates.map((t) => (
            <span
              key={t.id}
              className={`${styles.template} ${styles.saved} ${value.template === t.id ? styles.templateOn : ""}`}
            >
              <button
                type='button'
                role='radio'
                aria-checked={value.template === t.id}
                className={styles.savedPick}
                onClick={() => choose(t.id)}
              >
                {t.name}
              </button>
              <button
                type='button'
                className={styles.savedRemove}
                aria-label={`Remove the ${t.name} template`}
                disabled={pending}
                onClick={() => removeTemplate(t)}
              >
                <Icon name='close' />
              </button>
            </span>
          ))}
        </div>
        <p className={styles.help}>
          Switching replaces everything below. Names, fees and signatures
          fill in from their account.
        </p>
      </div>

      <div className={styles.block}>
        <span className={styles.blockTitle}>The plan</span>
        <label className={ui.field}>
          <span className={ui.label}>Service name</span>
          <input
            className={ui.input}
            value={value.service}
            maxLength={LIMITS.service}
            onChange={(e) => set({ service: e.target.value })}
            placeholder='e.g. Custom Booking Website'
          />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Description</span>
          <textarea
            className={`${ui.textarea} ${styles.short}`}
            value={value.summary}
            maxLength={LIMITS.summary}
            onChange={(e) => set({ summary: e.target.value })}
          />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>What&apos;s included (one per line)</span>
          <textarea
            className={ui.textarea}
            value={value.included.join("\n")}
            onChange={(e) =>
              set({
                included: e.target.value.split("\n").slice(0, LIMITS.included),
              })
            }
          />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Timeline (optional)</span>
          <input
            className={ui.input}
            value={value.timeline}
            maxLength={LIMITS.timeline}
            onChange={(e) => set({ timeline: e.target.value })}
            placeholder='e.g. About 3 weeks from kickoff to launch.'
          />
        </label>
      </div>

      <div className={styles.block}>
        <span className={styles.blockTitle}>Terms</span>
        <ol className={styles.terms}>
          {value.terms.map((term, i) => (
            <li key={i} className={styles.term}>
              <div className={styles.termTop}>
                <span className={styles.num}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <input
                  className={ui.input}
                  value={term.heading}
                  maxLength={LIMITS.heading}
                  onChange={(e) => setTerm(i, { heading: e.target.value })}
                  placeholder='Heading'
                  aria-label={`Term ${i + 1} heading`}
                />
                <div className={styles.termTools}>
                  <button
                    type='button'
                    className={styles.tool}
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move term ${i + 1} up`}
                  >
                    <Icon name='chevron' className={styles.up} />
                  </button>
                  <button
                    type='button'
                    className={styles.tool}
                    onClick={() => move(i, 1)}
                    disabled={i === value.terms.length - 1}
                    aria-label={`Move term ${i + 1} down`}
                  >
                    <Icon name='chevron' />
                  </button>
                  <button
                    type='button'
                    className={styles.tool}
                    onClick={() =>
                      set({ terms: value.terms.filter((_, j) => j !== i) })
                    }
                    disabled={value.terms.length === 1}
                    aria-label={`Remove term ${i + 1}`}
                  >
                    <Icon name='trash' />
                  </button>
                </div>
              </div>
              <textarea
                className={`${ui.textarea} ${styles.termText}`}
                value={term.text}
                maxLength={LIMITS.text}
                onChange={(e) => setTerm(i, { text: e.target.value })}
                aria-label={`Term ${i + 1} wording`}
              />
            </li>
          ))}
        </ol>
        <button
          type='button'
          className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall} ${styles.add}`}
          disabled={value.terms.length >= LIMITS.terms}
          onClick={() =>
            set({ terms: [...value.terms, { heading: "", text: "" }] })
          }
        >
          Add a term
          <Icon name='plus' className={ui.btnIcon} />
        </button>
      </div>

      <div className={styles.footer}>
        {naming ? (
          <form
            className={styles.nameForm}
            onSubmit={(e) => {
              e.preventDefault();
              saveTemplate();
            }}
          >
            <input
              className={ui.input}
              value={name}
              maxLength={LIMITS.templateName}
              onChange={(e) => setName(e.target.value)}
              placeholder='Template name, e.g. Wellness'
              aria-label='Template name'
              autoFocus
            />
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
              onClick={() => setNaming(false)}
            >
              Cancel
            </button>
            <button
              type='submit'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              disabled={!name.trim() || pending}
            >
              Save template
            </button>
          </form>
        ) : (
          <>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
              onClick={() => setNaming(true)}
            >
              Save as a template
              <Icon name='copy' className={ui.btnIcon} />
            </button>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
              onClick={() => void downloadPreview()}
              disabled={previewing}
            >
              {previewing ? "Making the PDF…" : "Preview the PDF"}
              <Icon name='download' className={ui.btnIcon} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
