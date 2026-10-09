"use client";

// A client's files: their questionnaire answers, brand assets, design
// options and documents. You can copy the answers, download assets,
// upload design options and send documents to sign. SAMPLE: uploads and
// sends last until you reload.

import Image from "next/image";
import { useRef, useState } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "@/components/Dashboard/icons";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { Pill, ui } from "@/components/Dashboard/ui/ui";
import { assetNeeds } from "@/lib/dashboard/helpers";
import { fmtDate, fmtShort } from "@/lib/dashboard/format";
import {
  isAnswered,
  type QuestionSection,
} from "@/lib/dashboard/questionnaire";
import type { Answers, Asset, Designs, Doc } from "@/lib/dashboard/types";
import styles from "./Client.module.css";

const show = (value: Answers[string] | undefined) =>
  Array.isArray(value) ? value.join(", ") : value || "";

export default function Files({
  firstName,
  email,
  sections,
  answers,
  submittedAt,
  assets,
  designs,
  documents,
}: {
  firstName: string;
  email: string;
  sections: QuestionSection[];
  answers: Answers;
  submittedAt?: string;
  assets: Asset[];
  designs: Designs;
  documents: Doc[];
}) {
  const toast = useToast();
  const all = sections.flatMap((s) => s.questions);
  const answered = all.filter((q) => isAnswered(answers[q.id])).length;
  const needs = assetNeeds(assets);

  const [uploads, setUploads] = useState<{ name: string; src: string }[]>([]);
  const [sentDesigns, setSentDesigns] = useState(false);
  const designInput = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState(documents);
  const [sending, setSending] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [needsSignature, setNeedsSignature] = useState(true);

  const copyAnswers = async () => {
    const text = sections
      .map(
        (s) =>
          `## ${s.title}\n` +
          s.questions
            .map((q) => `${q.label}\n${show(answers[q.id]) || "(no answer)"}`)
            .join("\n\n"),
      )
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      toast("Answers copied", { detail: "Paste them anywhere as plain text." });
    } catch {
      toast("Couldn't copy", {
        tone: "error",
        detail: "Your browser blocked it.",
      });
    }
  };

  return (
    <div className={styles.split}>
      <div className={styles.column}>
        {/* ── Questionnaire ── */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div className={styles.titles}>
              <h2 className={styles.heading}>Questionnaire</h2>
              <p>
                {submittedAt
                  ? `Sent ${fmtDate(submittedAt)} · ${answered} of ${all.length} answered`
                  : answered
                    ? `In progress · ${answered} of ${all.length} answered`
                    : `${firstName} hasn't started it yet.`}
              </p>
            </div>
            {answered > 0 && (
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                onClick={copyAnswers}
              >
                Copy as text
                <Icon name='copy' className={ui.btnIcon} />
              </button>
            )}
          </div>
          {answered > 0 && (
            <div className={styles.accordion}>
              {sections.map((section, i) => {
                const done = section.questions.filter((q) =>
                  isAnswered(answers[q.id]),
                ).length;
                return (
                  <details
                    key={section.id}
                    className={styles.acc}
                    open={i === 0}
                  >
                    <summary className={styles.accHead}>
                      <span className={styles.accTitle}>{section.title}</span>
                      <span className={ui.monoMuted}>
                        {done}/{section.questions.length}
                      </span>
                      <Icon name='chevron' className={styles.accChevron} />
                    </summary>
                    <dl className={styles.qa}>
                      {section.questions.map((q) => (
                        <div key={q.id} className={styles.qaRow}>
                          <dt className={ui.monoMuted}>{q.label}</dt>
                          <dd
                            className={
                              isAnswered(answers[q.id])
                                ? styles.answer
                                : styles.noAnswer
                            }
                          >
                            {show(answers[q.id]) || "No answer"}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Documents ── */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div className={styles.titles}>
              <h2 className={styles.heading}>Documents</h2>
              <p>
                Anything you send for signature shows up on their Documents
                page.
              </p>
            </div>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              onClick={() => setSending(true)}
            >
              Send a document
              <Icon name='plus' className={ui.btnIcon} />
            </button>
          </div>
          {docs.length ? (
            <ul className={styles.docList}>
              {docs.map((doc) => (
                <li key={doc.id} className={styles.doc}>
                  <span className={styles.docIcon}>
                    <Icon name='file' />
                  </span>
                  <span className={styles.docText}>
                    <span className={styles.docTitle}>{doc.title}</span>
                    <span className={ui.monoMuted}>
                      Sent {fmtShort(doc.sentAt)}
                      {doc.signedAt
                        ? ` · Signed ${fmtShort(doc.signedAt)} by ${doc.signedBy}`
                        : ""}
                    </span>
                  </span>
                  {doc.status === "SIGNED" ? (
                    <Pill tone='lime' dot>
                      Signed
                    </Pill>
                  ) : (
                    <Pill tone='yellow' dot>
                      Waiting on {firstName}
                    </Pill>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.help}>No documents yet.</p>
          )}
        </section>
      </div>

      <div className={styles.column}>
        {/* ── Brand assets ── */}
        <section className={styles.card}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>Brand assets</h2>
            <p>
              {needs
                .filter((n) => n.need > 0)
                .map((n) => `${n.label} ${Math.min(n.have, n.need)}/${n.need}`)
                .join(" · ")}
            </p>
          </div>
          {assets.length ? (
            <ul className={styles.assets}>
              {assets.map((asset) => (
                <li key={asset.id} className={styles.asset}>
                  <span className={styles.assetThumb}>
                    {asset.src ? (
                      <Image
                        src={asset.src}
                        alt={asset.name}
                        fill
                        sizes='160px'
                        className={styles.cover}
                      />
                    ) : (
                      <span className={styles.ext}>
                        {asset.name.split(".").pop()?.toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span className={styles.assetName} title={asset.name}>
                    {asset.name}
                  </span>
                  <span className={styles.assetMeta}>
                    <span className={ui.monoMuted}>{asset.label}</span>
                    {asset.src && (
                      <a
                        href={asset.src}
                        download={asset.name}
                        className={styles.download}
                        aria-label={`Download ${asset.name}`}
                      >
                        <Icon name='download' />
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.help}>Nothing uploaded yet.</p>
          )}
        </section>

        {/* ── Design options ── */}
        <section className={styles.card}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>Design options</h2>
            <p>
              {designs.chosen
                ? `${firstName} chose ${designs.options.find((o) => o.id === designs.chosen)?.name}${designs.chosenAt ? ` on ${fmtDate(designs.chosenAt)}` : ""}.`
                : designs.options.length
                  ? `Sent ${designs.readyAt ? fmtDate(designs.readyAt) : ""}. Waiting for ${firstName} to choose.`
                  : "Upload three directions. They go to the client's Design page to choose from."}
            </p>
          </div>

          {designs.options.length > 0 ? (
            <ul className={styles.designs}>
              {designs.options.map((option) => (
                <li
                  key={option.id}
                  className={`${styles.design} ${designs.chosen === option.id ? styles.designOn : ""}`}
                >
                  <span className={styles.swatches} aria-hidden='true'>
                    {option.palette.map((p) => (
                      <i key={p.hex} style={{ backgroundColor: p.hex }} />
                    ))}
                  </span>
                  <span className={styles.designName}>{option.name}</span>
                  {designs.chosen === option.id && (
                    <Pill tone='lime' dot>
                      Chosen
                    </Pill>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <>
              <label className={styles.drop}>
                <input
                  ref={designInput}
                  type='file'
                  accept='image/*'
                  multiple
                  className={ui.srOnly}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []).slice(
                      0,
                      3 - uploads.length,
                    );
                    setUploads((u) => [
                      ...u,
                      ...files.map((f) => ({
                        name: f.name,
                        src: URL.createObjectURL(f),
                      })),
                    ]);
                    if (files.length) {
                      toast(
                        `Added ${files.length} design${files.length === 1 ? "" : "s"}`,
                      );
                    }
                    e.target.value = "";
                  }}
                />
                <Icon name='upload' className={styles.dropIcon} />
                <span className={styles.dropText}>
                  Upload screenshots, up to three
                </span>
              </label>
              {uploads.length > 0 && (
                <ul className={styles.uploads}>
                  {uploads.map((u) => (
                    <li key={u.src} className={styles.upload}>
                      <Image
                        src={u.src}
                        alt={u.name}
                        fill
                        unoptimized
                        sizes='160px'
                        className={styles.cover}
                      />
                    </li>
                  ))}
                </ul>
              )}
              <div className={styles.actions}>
                <button
                  type='button'
                  className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
                  disabled={uploads.length === 0 || sentDesigns}
                  onClick={() => {
                    setSentDesigns(true);
                    toast(
                      `${uploads.length} design${uploads.length === 1 ? "" : "s"} sent to ${firstName}`,
                      {
                        detail: `${email} gets an email to choose one.`,
                      },
                    );
                  }}
                >
                  {sentDesigns ? "Sent" : `Send to ${firstName}`}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      <Modal isOpen={sending} onClose={() => setSending(false)}>
        <form
          className={ui.modalBody}
          onSubmit={(e) => {
            e.preventDefault();
            if (!docTitle.trim()) return;
            setDocs((list) => [
              {
                id: `doc-${Date.now()}`,
                title: docTitle.trim(),
                summary: "",
                status: needsSignature ? "AWAITING" : "SIGNED",
                sentAt: new Date().toISOString(),
                body: [],
              },
              ...list,
            ]);
            setSending(false);
            setDocTitle("");
            toast(
              needsSignature
                ? `Sent to ${firstName} to sign`
                : `Shared with ${firstName}`,
              { detail: docTitle.trim() },
            );
          }}
        >
          <span className={ui.monoMuted}>Send a document</span>
          <h2 className={ui.modalTitle}>Send {firstName} a document</h2>
          <label className={ui.field}>
            <span className={ui.label}>Title</span>
            <input
              className={ui.input}
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder='e.g. Design approval'
            />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>File</span>
            <input className={styles.file} type='file' accept='.pdf,image/*' />
          </label>
          <label className={styles.check}>
            <input
              type='checkbox'
              checked={needsSignature}
              onChange={(e) => setNeedsSignature(e.target.checked)}
            />
            <p>Needs their signature</p>
          </label>
          <div className={ui.modalActions}>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light}`}
              onClick={() => setSending(false)}
            >
              Cancel
            </button>
            <button
              type='submit'
              className={`${ui.btn} ${ui.btn_black}`}
              disabled={!docTitle.trim()}
            >
              Send
              <Icon name='send' className={ui.btnIcon} />
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
