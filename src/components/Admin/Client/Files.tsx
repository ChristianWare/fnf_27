"use client";

// A client's files: their questionnaire answers, brand assets, design
// options and documents. You can copy the answers, download assets,
// upload design options and send documents to sign. Uploads go straight to
// Cloudinary; sending emails the client.

import Image from "next/image";
import { useRef, useState } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "@/components/Dashboard/icons";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { useAction } from "@/components/Dashboard/useAction";
import { upload, type Uploaded } from "@/components/Dashboard/upload";
import { Pill, ui } from "@/components/Dashboard/ui/ui";
import {
  adminUploadTicket,
  sendDesigns,
  sendDocument,
} from "@/app/admin/build-actions";
import { assetNeeds } from "@/lib/dashboard/helpers";
import { fmtDate, fmtShort, thumb } from "@/lib/dashboard/format";
import {
  isAnswered,
  type QuestionSection,
} from "@/lib/dashboard/questionnaire";
import type { Answers, Asset, Designs, Doc } from "@/lib/dashboard/types";
import styles from "./Client.module.css";

const show = (value: Answers[string] | undefined) =>
  Array.isArray(value) ? value.join(", ") : value || "";

export default function Files({
  clientId,
  firstName,
  email,
  sections,
  answers,
  submittedAt,
  assets,
  designs,
  documents,
}: {
  clientId: string;
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
  const { run, pending } = useAction();
  const all = sections.flatMap((s) => s.questions);
  const answered = all.filter((q) => isAnswered(answers[q.id])).length;
  const needs = assetNeeds(assets);

  const [uploads, setUploads] = useState<(Uploaded & { label: string })[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sentDesigns, setSentDesigns] = useState(false);
  const designInput = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState(documents);
  const [sending, setSending] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [needsSignature, setNeedsSignature] = useState(true);

  const uploadTo = async (kind: "designs" | "documents", files: File[]) => {
    const ticket = await adminUploadTicket(clientId, kind);
    if (!ticket.ok) {
      toast(ticket.error, { tone: "error" });
      return [];
    }
    const done: Uploaded[] = [];
    for (const file of files) {
      try {
        done.push(await upload(ticket.data!, file));
      } catch (error) {
        toast((error as Error).message, { tone: "error" });
      }
    }
    return done;
  };

  const addDesigns = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const added = await uploadTo("designs", files);
      setUploads((u) => [
        ...u,
        ...added.map((f) => ({
          ...f,
          label: f.name
            .replace(/\.[a-z0-9]+$/i, "")
            .replace(/[-_]+/g, " ")
            .replace(/^./, (c) => c.toUpperCase()),
        })),
      ]);
      if (added.length) {
        toast(`Added ${added.length} design${added.length === 1 ? "" : "s"}`, {
          detail: "Name each one, then send them.",
        });
      }
    } finally {
      setUploading(false);
    }
  };

  const sendDoc = async () => {
    const title = docTitle.trim();
    if (!title || !docFile) return;
    setUploading(true);
    try {
      const [file] = await uploadTo("documents", [docFile]);
      if (!file) return;
      run(
        () =>
          sendDocument(clientId, {
            title,
            url: file.url,
            publicId: file.publicId,
            fileName: file.name,
            needsSignature,
          }),
        (data) => {
          setDocs((list) => [
            {
              id: data?.id ?? `doc-${Date.now()}`,
              title,
              summary: needsSignature
                ? "Please read and sign."
                : "For your records.",
              kind: "OTHER",
              status: needsSignature ? "AWAITING" : "INFO",
              sentAt: new Date().toISOString(),
              body: [],
              fileUrl: file.url,
              fileName: file.name,
            },
            ...list,
          ]);
          setSending(false);
          setDocTitle("");
          setDocFile(null);
          return {
            message: needsSignature
              ? `Sent to ${firstName} to sign`
              : `Shared with ${firstName}`,
            detail: title,
          };
        },
      );
    } finally {
      setUploading(false);
    }
  };

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
                  ) : doc.status === "INFO" ? (
                    <Pill tone='gray' dot>
                      Shared
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
                        src={thumb(asset.src, 320)}
                        alt={asset.name}
                        fill
                        unoptimized
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
                    {(asset.url ?? asset.src) && (
                      <a
                        href={asset.url ?? asset.src}
                        target='_blank'
                        rel='noopener noreferrer'
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
                  disabled={uploading || uploads.length >= 3}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []).slice(
                      0,
                      3 - uploads.length,
                    );
                    e.target.value = "";
                    void addDesigns(files);
                  }}
                />
                <Icon name='upload' className={styles.dropIcon} />
                <span className={styles.dropText}>
                  {uploading ? "Uploading…" : "Upload screenshots, up to three"}
                </span>
              </label>
              {uploads.length > 0 && (
                <ul className={styles.uploads}>
                  {uploads.map((u, i) => (
                    <li key={u.publicId} className={styles.uploadItem}>
                      <span className={styles.upload}>
                        <Image
                          src={thumb(u.url, 320)}
                          alt={u.label}
                          fill
                          unoptimized
                          sizes='160px'
                          className={styles.cover}
                        />
                      </span>
                      <input
                        className={ui.input}
                        value={u.label}
                        onChange={(e) =>
                          setUploads((list) =>
                            list.map((x, j) =>
                              j === i ? { ...x, label: e.target.value } : x,
                            ),
                          )
                        }
                        aria-label={`Name for design ${i + 1}`}
                        placeholder={`Option ${i + 1}`}
                      />
                    </li>
                  ))}
                </ul>
              )}
              <div className={styles.actions}>
                <button
                  type='button'
                  className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
                  disabled={
                    uploads.length === 0 || sentDesigns || pending || uploading
                  }
                  onClick={() =>
                    run(
                      () =>
                        sendDesigns(
                          clientId,
                          uploads.map((u) => ({
                            name: u.label,
                            url: u.url,
                            publicId: u.publicId,
                          })),
                        ),
                      () => {
                        setSentDesigns(true);
                        return {
                          message: `${uploads.length} design${uploads.length === 1 ? "" : "s"} sent to ${firstName}`,
                          detail: `${email} gets an email to choose one.`,
                        };
                      },
                    )
                  }
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
            void sendDoc();
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
            <input
              className={styles.file}
              type='file'
              accept='.pdf,image/*'
              onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
            />
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
              disabled={!docTitle.trim() || !docFile || uploading || pending}
            >
              {uploading || pending ? "Sending…" : "Send"}
              <Icon name='send' className={ui.btnIcon} />
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
