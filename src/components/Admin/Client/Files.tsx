"use client";

// A client's files: their questionnaire answers, brand assets, design
// options and documents. You can copy the answers, download assets,
// upload design options, send documents to sign, and change the service
// agreement until it's signed. Uploads go straight to Cloudinary; sending
// emails the client.

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import Modal from "@/components/shared/Modal/Modal";
import ConfirmDialog from "@/components/Dashboard/ConfirmDialog/ConfirmDialog";
import Icon from "@/components/Dashboard/icons";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { useAction } from "@/components/Dashboard/useAction";
import {
  upload,
  type RemoteFile,
  type Uploaded,
} from "@/components/Dashboard/upload";
import { Pill, ui } from "@/components/Dashboard/ui/ui";
import {
  adminUploadTicket,
  discardDesignUpload,
  removeDesign,
  renameDesign,
  reorderDesigns,
  sendDesigns,
  sendDocument,
} from "@/app/admin/build-actions";
import {
  assetNeeds,
  MAX_DESIGNS,
  picksNeeded,
  picksOf,
} from "@/lib/dashboard/helpers";
import { fmtDate, fmtShort, thumb } from "@/lib/dashboard/format";
import {
  isAnswered,
  type QuestionSection,
} from "@/lib/dashboard/questionnaire";
import type {
  Answers,
  Asset,
  Designs,
  Doc,
  PlanId,
} from "@/lib/dashboard/types";
import type { CustomQuestions as Custom } from "@/lib/dashboard/customQuestions";
import CustomQuestions from "./CustomQuestions";
import { SortableDesign, SortableDesigns } from "./SortableDesigns";
import { arrayMove } from "@dnd-kit/sortable";
import AgreementEditor from "@/components/Admin/Agreement/AgreementEditor";
import { updateAgreement } from "@/app/admin/agreement-actions";
import type { AgreementDraft, AgreementTemplate } from "@/lib/agreements/types";
import styles from "./Client.module.css";
import own from "./Files.module.css";

const show = (value: Answers[string] | undefined) =>
  Array.isArray(value) ? value.join(", ") : value || "";

/**
 * What a drop holds: files from Finder or the desktop, or an image dragged
 * straight from another tab (its address, which Cloudinary can fetch).
 * "local" when it's an image the browser opened from a file on the
 * computer: a page can't read those from another tab.
 */
function droppedImages(data: DataTransfer): (File | RemoteFile)[] | "local" {
  const files = Array.from(data.files);
  if (files.length) return files;
  const html = data.getData("text/html");
  const fromImg = html
    .match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]
    ?.replace(/&amp;/g, "&");
  const fromList = data
    .getData("text/uri-list")
    .split(/\r?\n/)
    .find((line) => line && !line.startsWith("#"));
  const src = (fromImg || fromList || "").trim();
  if (!src) return [];
  if (/^(file|blob|filesystem):/i.test(src)) return "local";
  const looksLikeImage =
    Boolean(fromImg) ||
    /^data:image\//i.test(src) ||
    /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(src);
  if (!looksLikeImage || !/^(https?:|data:image\/)/i.test(src)) return [];
  let name = "Dropped image";
  if (!src.startsWith("data:")) {
    try {
      name = decodeURIComponent(
        new URL(src).pathname.split("/").filter(Boolean).pop() || name,
      );
    } catch {
      // An odd address: keep the plain name.
    }
  }
  return [{ url: src, name }];
}

export default function Files({
  clientId,
  firstName,
  email,
  sections,
  custom,
  answers,
  submittedAt,
  assets,
  designs,
  documents,
  plan,
  monthly,
  setup,
  templates: savedTemplates,
}: {
  clientId: string;
  firstName: string;
  email: string;
  sections: QuestionSection[];
  /** Their own questions from a .md file, if any. */
  custom?: Custom;
  answers: Answers;
  submittedAt?: string;
  assets: Asset[];
  designs: Designs;
  documents: Doc[];
  /** Their plan and rates, for the agreement preview. */
  plan: PlanId;
  monthly: number;
  setup: number;
  templates: AgreementTemplate[];
}) {
  const toast = useToast();
  const { run, pending } = useAction();
  const all = sections.flatMap((s) => s.questions);
  const answered = all.filter((q) => isAnswered(answers[q.id])).length;
  const needs = assetNeeds(assets, custom?.mode === "replace");

  const [uploads, setUploads] = useState<(Uploaded & { label: string })[]>([]);
  const [uploading, setUploading] = useState(false);
  const designInput = useRef<HTMLInputElement>(null);
  // Sent designs count toward the limit too: you can keep adding until the
  // client has MAX_DESIGNS in all.
  const sentCount = designs.options.length;
  // The client's favorites, #1 first.
  const picks = picksOf(designs).filter((id) =>
    designs.options.some((o) => o.id === id),
  );
  const designRoom = MAX_DESIGNS - sentCount - uploads.length;

  // The order you dragged the sent designs into. It shows while it saves;
  // once the server sends the designs back, their own order takes over.
  const [sentOrder, setSentOrder] = useState<{
    ids: string[];
    base: Designs["options"];
    saving: boolean;
  } | null>(null);
  const sentOptions = (() => {
    if (!sentOrder || !(sentOrder.saving || sentOrder.base === designs.options))
      return designs.options;
    const byId = new Map(designs.options.map((o) => [o.id, o]));
    const list = sentOrder.ids.flatMap((id) => byId.get(id) ?? []);
    return list.length === designs.options.length ? list : designs.options;
  })();
  const moveSent = (from: number, to: number) => {
    const ids = arrayMove(
      sentOptions.map((o) => o.id),
      from,
      to,
    );
    setSentOrder({ ids, base: designs.options, saving: true });
    run(
      () => reorderDesigns(clientId, ids),
      () => {
        setSentOrder((cur) =>
          cur?.ids === ids ? { ...cur, saving: false } : cur,
        );
        return {
          message: "Order saved",
          detail: `${firstName} sees the designs in this order.`,
        };
      },
      // Didn't save: back to how it was (the toast says why).
      () => setSentOrder((cur) => (cur?.ids === ids ? null : cur)),
    );
  };
  // A sent design being renamed, and the name typed so far.
  const [renaming, setRenaming] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const saveName = () => {
    const target = renaming;
    if (!target || pending) return;
    const name = target.value.trim();
    const before = designs.options.find((o) => o.id === target.id)?.name;
    if (!name || name === before) {
      setRenaming(null);
      return;
    }
    run(
      () => renameDesign(clientId, target.id, name),
      () => {
        setRenaming(null);
        return {
          message: `Renamed to ${name}`,
          detail: `${firstName} sees the new name on their Design page.`,
        };
      },
    );
  };
  // Screenshots dragged over the drop area. Entering a child fires
  // dragleave on the parent, so count the layers instead of trusting it.
  const [dropOver, setDropOver] = useState(false);
  const dropDepth = useRef(0);
  // Drops land anywhere on the Design options card, while there's room for
  // another design.
  const canDropDesigns = sentCount < MAX_DESIGNS;

  // A screenshot dropped just off the card would make the browser open the
  // image and leave this page. Catch those drops and ignore them.
  useEffect(() => {
    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const hold = (e: DragEvent) => {
      // A file input takes its own drops; leave those alone.
      if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
      if (hasFiles(e) && !e.defaultPrevented) e.preventDefault();
    };
    window.addEventListener("dragover", hold);
    window.addEventListener("drop", hold);
    return () => {
      window.removeEventListener("dragover", hold);
      window.removeEventListener("drop", hold);
    };
  }, []);
  // The design you pressed the red x on, waiting for "Remove" in the dialog:
  // one uploaded but not sent yet, or one already on the client's page.
  const [removing, setRemoving] = useState<
    | { kind: "upload"; publicId: string; name: string }
    | { kind: "sent"; id: string; name: string; rank: number }
    | null
  >(null);
  const confirmRemove = () => {
    const target = removing;
    if (!target || pending) return;
    if (target.kind === "upload") {
      run(
        () => discardDesignUpload(clientId, target.publicId),
        () => {
          setUploads((list) =>
            list.filter((x) => x.publicId !== target.publicId),
          );
          setRemoving(null);
          return { message: `Removed ${target.name}` };
        },
      );
      return;
    }
    run(
      () => removeDesign(clientId, target.id),
      () => {
        setRemoving(null);
        return {
          message: `Removed ${target.name}`,
          detail:
            target.rank > 0
              ? `It was ${firstName}'s #${target.rank} pick, so they'll need to pick again.`
              : `${firstName} won't see it on their Design page anymore.`,
        };
      },
    );
  };

  const [docs, setDocs] = useState(documents);
  const [sending, setSending] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [needsSignature, setNeedsSignature] = useState(true);

  // Changing the agreement before it's signed.
  const [templates, setTemplates] = useState(savedTemplates);
  const [editingDoc, setEditingDoc] = useState<string | null>(null);
  const [draft, setDraft] = useState<AgreementDraft | null>(null);
  const editDoc = (doc: Doc) => {
    if (!doc.agreement) return;
    const { template, service, summary, included, timeline, terms } =
      doc.agreement;
    setDraft({ template, service, summary, included, timeline, terms });
    setEditingDoc(doc.id);
  };
  const saveAgreement = () => {
    const docId = editingDoc;
    const next = draft;
    if (!docId || !next || pending) return;
    run(
      () => updateAgreement(clientId, docId, next),
      () => {
        setDocs((list) =>
          list.map((d) =>
            d.id === docId && d.agreement
              ? {
                  ...d,
                  agreement: {
                    ...d.agreement,
                    ...next,
                    included: next.included
                      .map((x) => x.trim())
                      .filter(Boolean),
                    date: new Date().toISOString(),
                  },
                }
              : d,
          ),
        );
        setEditingDoc(null);
        return {
          message: "Agreement updated",
          detail: `${firstName} sees the new version on their Documents page.`,
        };
      },
    );
  };

  const uploadTo = async (
    kind: "designs" | "documents",
    files: (File | RemoteFile)[],
  ) => {
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

  const addDesigns = async (picked: (File | RemoteFile)[]) => {
    const images = picked.filter(
      (f) => !(f instanceof File) || f.type.startsWith("image/"),
    );
    if (picked.length && !images.length) {
      toast("Those aren't images. Drop screenshots (PNG, JPG or WebP).", {
        tone: "error",
      });
      return;
    }
    const room = designRoom;
    const files = images.slice(0, Math.max(0, room));
    if (images.length > files.length) {
      toast(
        room > 0
          ? `Only ${room} more fit, so the first ${room} were added.`
          : `That's ${MAX_DESIGNS} designs, the most. Remove one to add another.`,
        { tone: room > 0 ? "info" : "error" },
      );
    }
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
          <CustomQuestions
            clientId={clientId}
            firstName={firstName}
            custom={custom}
            submitted={Boolean(submittedAt)}
          />
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
                  {doc.agreement && (
                    <span className={own.docTools}>
                      {doc.status === "AWAITING" && (
                        <button
                          type='button'
                          className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                          onClick={() => editDoc(doc)}
                        >
                          Edit
                          <Icon name='pen' className={ui.btnIcon} />
                        </button>
                      )}
                      <a
                        href={`/admin/clients/${clientId}/documents/${doc.id}`}
                        className={styles.download}
                        aria-label={`Download ${doc.title} as a PDF`}
                      >
                        <Icon name='download' />
                      </a>
                    </span>
                  )}
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

        {/* ── Design options: the whole card takes a drop ── */}
        <section
          className={`${styles.card} ${dropOver ? own.cardOver : ""}`}
          onDragEnter={(e) => {
            if (!canDropDesigns) return;
            e.preventDefault();
            dropDepth.current++;
            setDropOver(true);
          }}
          onDragOver={(e) => {
            if (!canDropDesigns) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = uploading ? "none" : "copy";
          }}
          onDragLeave={() => {
            if (!canDropDesigns) return;
            dropDepth.current = Math.max(0, dropDepth.current - 1);
            if (!dropDepth.current) setDropOver(false);
          }}
          onDrop={(e) => {
            if (!canDropDesigns) return;
            e.preventDefault();
            dropDepth.current = 0;
            setDropOver(false);
            if (uploading) return;
            const dropped = droppedImages(e.dataTransfer);
            if (dropped === "local") {
              toast("That image is open from a file on your computer.", {
                tone: "error",
                detail:
                  "The browser won't hand it over from a tab. Drag the file from Finder or your desktop instead.",
              });
              return;
            }
            if (!dropped.length) {
              toast(
                "Nothing to add there. Drop screenshots (PNG, JPG or WebP).",
                {
                  tone: "error",
                },
              );
              return;
            }
            void addDesigns(dropped);
          }}
        >
          <div className={styles.titles}>
            <h2 className={styles.heading}>Design options</h2>
            <p>
              {picks.length
                ? `${firstName}'s ${picks.length < picksNeeded(sentCount) ? `picks so far` : picks.length === 1 ? "pick" : `top ${picks.length}`}: ${picks
                    .map(
                      (id, i) =>
                        `${i + 1}. ${designs.options.find((o) => o.id === id)?.name}`,
                    )
                    .join(
                      " · ",
                    )}${designs.chosenAt ? ` (sent ${fmtDate(designs.chosenAt)})` : ""}.`
                : designs.options.length
                  ? `Sent ${designs.readyAt ? fmtDate(designs.readyAt) : ""}. Waiting for ${firstName} to pick their top ${picksNeeded(sentCount)}.`
                  : `Upload your design directions, up to ${MAX_DESIGNS}. They go to the client's Design page to rank.`}
            </p>
          </div>

          {sentCount > 0 && (
            <SortableDesigns
              id='sent-designs'
              ids={sentOptions.map((o) => o.id)}
              nameOf={(id) =>
                designs.options.find((o) => o.id === id)?.name ?? "Design"
              }
              onMove={moveSent}
              className={styles.uploads}
            >
              {sentOptions.map((option) => {
                const rank = picks.indexOf(option.id) + 1;
                const chosen = rank > 0;
                const image = option.images?.[0];
                const editing = renaming?.id === option.id;
                return (
                  <SortableDesign
                    key={option.id}
                    id={option.id}
                    disabled={editing || sentCount < 2}
                    className={`${styles.uploadItem} ${own.sentDesign} ${chosen ? own.sentChosen : ""}`}
                    liftedClassName={own.designLifted}
                  >
                    {(handle) => (
                      <>
                        <span className={styles.upload}>
                          {sentCount > 1 && (
                            <button
                              type='button'
                              className={own.gripDesign}
                              aria-label={`Move ${option.name}`}
                              {...handle}
                            >
                              <Icon name='grip' />
                            </button>
                          )}
                          {image ? (
                            <Image
                              src={thumb(image, 320)}
                              alt={option.name}
                              fill
                              unoptimized
                              sizes='160px'
                              className={styles.cover}
                            />
                          ) : (
                            <span
                              className={own.sentSwatches}
                              aria-hidden='true'
                            >
                              {option.palette.map((p) => (
                                <i
                                  key={p.hex}
                                  style={{ backgroundColor: p.hex }}
                                />
                              ))}
                            </span>
                          )}
                          <button
                            type='button'
                            className={own.removeDesign}
                            aria-label={`Remove ${option.name}`}
                            onClick={() =>
                              setRemoving({
                                kind: "sent",
                                id: option.id,
                                name: option.name,
                                rank,
                              })
                            }
                          >
                            <Icon name='close' />
                          </button>
                        </span>
                        {editing ? (
                          <form
                            className={own.renameRow}
                            onSubmit={(e) => {
                              e.preventDefault();
                              saveName();
                            }}
                          >
                            <input
                              className={ui.input}
                              value={renaming.value}
                              maxLength={60}
                              autoFocus
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) =>
                                setRenaming({
                                  id: option.id,
                                  value: e.target.value,
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Escape") setRenaming(null);
                              }}
                              aria-label={`New name for ${option.name}`}
                            />
                            <span className={own.renameActions}>
                              <button
                                type='submit'
                                className={own.renameSave}
                                aria-label='Save the name'
                                disabled={pending}
                              >
                                <Icon name='check' />
                              </button>
                              <button
                                type='button'
                                className={own.renameCancel}
                                aria-label='Keep the old name'
                                onClick={() => setRenaming(null)}
                              >
                                <Icon name='close' />
                              </button>
                            </span>
                          </form>
                        ) : (
                          <span className={own.sentName}>
                            <span className={own.sentNameLine}>
                              <span className={own.sentNameText}>
                                {option.name}
                              </span>
                              <button
                                type='button'
                                className={own.renameBtn}
                                aria-label={`Rename ${option.name}`}
                                onClick={() =>
                                  setRenaming({
                                    id: option.id,
                                    value: option.name,
                                  })
                                }
                              >
                                <Icon name='pen' />
                              </button>
                            </span>
                            {chosen && (
                              <Pill tone={rank === 1 ? "lime" : "gray"} dot>
                                #{rank} pick
                              </Pill>
                            )}
                          </span>
                        )}
                      </>
                    )}
                  </SortableDesign>
                );
              })}
            </SortableDesigns>
          )}
          {sentCount > 1 && (
            <p className={own.orderHint}>
              Drag the dots to change the order {firstName} sees them in.
            </p>
          )}

          {sentCount >= MAX_DESIGNS ? (
            <p className={styles.help}>
              That&apos;s {MAX_DESIGNS} designs, the most. Remove one to add
              another.
            </p>
          ) : (
            <>
              {sentCount > 0 && (
                <h3 className={own.addMoreTitle}>Add more designs</h3>
              )}
              <label
                className={`${styles.drop} ${sentCount > 0 ? own.dropCompact : ""} ${dropOver ? own.dropOver : ""} ${designRoom <= 0 ? own.dropFull : ""}`}
              >
                <input
                  ref={designInput}
                  type='file'
                  accept='image/*'
                  multiple
                  className={ui.srOnly}
                  disabled={uploading || designRoom <= 0}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    void addDesigns(files);
                  }}
                />
                <Icon name='upload' className={styles.dropIcon} />
                <span className={styles.dropText}>
                  {uploading
                    ? "Uploading…"
                    : dropOver
                      ? "Drop to add them"
                      : designRoom <= 0
                        ? `That's ${MAX_DESIGNS}, the most you can send`
                        : "Drag screenshots here, or click to upload"}
                </span>
                <span className={own.dropHint}>
                  {sentCount + uploads.length
                    ? `${sentCount + uploads.length} of up to ${MAX_DESIGNS}${sentCount ? ` · ${sentCount} sent` : ""}`
                    : `Up to ${MAX_DESIGNS} designs`}
                </span>
              </label>
              {uploads.length > 0 && (
                <SortableDesigns
                  id='new-designs'
                  ids={uploads.map((u) => u.publicId)}
                  nameOf={(id) =>
                    uploads.find((u) => u.publicId === id)?.label || "Design"
                  }
                  onMove={(from, to) =>
                    setUploads((list) => arrayMove(list, from, to))
                  }
                  className={styles.uploads}
                >
                  {uploads.map((u, i) => (
                    <SortableDesign
                      key={u.publicId}
                      id={u.publicId}
                      disabled={uploads.length < 2}
                      className={styles.uploadItem}
                      liftedClassName={own.designLifted}
                    >
                      {(handle) => (
                        <>
                          <span className={styles.upload}>
                            {uploads.length > 1 && (
                              <button
                                type='button'
                                className={own.gripDesign}
                                aria-label={`Move ${u.label || `design ${i + 1}`}`}
                                {...handle}
                              >
                                <Icon name='grip' />
                              </button>
                            )}
                            <Image
                              src={thumb(u.url, 320)}
                              alt={u.label}
                              fill
                              unoptimized
                              sizes='160px'
                              className={styles.cover}
                            />
                            <button
                              type='button'
                              className={own.removeDesign}
                              aria-label={`Remove ${u.label || `design ${i + 1}`}`}
                              onClick={() =>
                                setRemoving({
                                  kind: "upload",
                                  publicId: u.publicId,
                                  name: u.label.trim() || `Design ${i + 1}`,
                                })
                              }
                            >
                              <Icon name='close' />
                            </button>
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
                            placeholder={`Option ${sentCount + i + 1}`}
                          />
                        </>
                      )}
                    </SortableDesign>
                  ))}
                </SortableDesigns>
              )}
              {(sentCount === 0 || uploads.length > 0) && (
                <div className={styles.actions}>
                  <button
                    type='button'
                    className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
                    disabled={uploads.length === 0 || pending || uploading}
                    onClick={() => {
                      const batch = uploads;
                      const adding = sentCount > 0;
                      run(
                        () =>
                          sendDesigns(
                            clientId,
                            batch.map((u) => ({
                              name: u.label,
                              url: u.url,
                              publicId: u.publicId,
                            })),
                          ),
                        () => {
                          setUploads([]);
                          const n = `${batch.length}${adding ? " more" : ""} design${batch.length === 1 ? "" : "s"}`;
                          return {
                            message: `${n} sent to ${firstName}`,
                            detail: adding
                              ? `${email} gets an email about the new ones.`
                              : `${email} gets an email to choose one.`,
                          };
                        },
                      );
                    }}
                  >
                    {sentCount > 0
                      ? `Send ${uploads.length > 1 ? `${uploads.length} more` : "it"} to ${firstName}`
                      : `Send to ${firstName}`}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(removing)}
        tone='danger'
        icon='trash'
        title='Remove this design?'
        items={removing ? [removing.name] : undefined}
        text={
          removing?.kind === "sent"
            ? removing.rank > 0
              ? `${firstName} picked this as their #${removing.rank}. Removing it takes it off their Design page and out of their picks, and they'll need to pick again.`
              : `It comes off ${firstName}'s Design page, and the screenshot is deleted.`
            : `It won't be sent to ${firstName}, and the screenshot is deleted.`
        }
        confirmLabel='Remove'
        pendingLabel='Removing…'
        pending={pending}
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      />

      <Modal isOpen={Boolean(editingDoc)} onClose={() => setEditingDoc(null)}>
        {draft && (
          <div className={ui.modalBody}>
            <span className={ui.monoMuted}>Service agreement</span>
            <h2 className={ui.modalTitle}>Edit {firstName}&apos;s agreement</h2>
            <p className={styles.help}>
              They haven&apos;t signed it yet, so they&apos;ll see this version
              as soon as you save.
            </p>
            <AgreementEditor
              value={draft}
              onChange={setDraft}
              plan={plan}
              templates={templates}
              onTemplates={setTemplates}
              preview={{ clientId, plan, monthly, setup }}
            />
            <div className={ui.modalActions}>
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_light}`}
                onClick={() => setEditingDoc(null)}
              >
                Cancel
              </button>
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_black}`}
                disabled={pending}
                onClick={saveAgreement}
              >
                Save changes
                <Icon name='check' className={ui.btnIcon} />
              </button>
            </div>
          </div>
        )}
      </Modal>

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
