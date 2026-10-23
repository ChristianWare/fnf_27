"use client";

// The client's blueprint: every page of their site, section by section.
// They read a whole page, then approve it (a note is optional) or ask for
// changes (a note tells us what). A page we've rewritten comes back here
// to read again.

import { useState } from "react";
import Icon from "../icons";
import { Pill, Progress, ui } from "../ui/ui";
import { useAction } from "../useAction";
import styles from "./Blueprint.module.css";
import { decidePage } from "@/app/dashboard/actions";
import {
  blueprintCounts,
  pageStatus,
  type PageStatus,
} from "@/lib/dashboard/helpers";
import { fmtShort } from "@/lib/dashboard/format";
import type {
  BlueprintPage,
  SectionStatus,
} from "@/lib/dashboard/types";

const statusPill: Record<
  SectionStatus,
  { text: string; tone: "lime" | "yellow" | "gray" | "red" }
> = {
  APPROVED: { text: "Approved", tone: "lime" },
  REVIEW: { text: "Ready for you", tone: "yellow" },
  CHANGES: { text: "Changes requested", tone: "red" },
  DRAFT: { text: "We're writing", tone: "gray" },
};

const pagePill: Record<
  PageStatus,
  { text: string; tone: "lime" | "yellow" | "gray" | "red" }
> = {
  APPROVED: { text: "Page approved", tone: "lime" },
  REVIEW: { text: "Ready for you", tone: "yellow" },
  CHANGES: { text: "We're making your changes", tone: "red" },
  DRAFT: { text: "We're writing", tone: "gray" },
};

export default function Blueprint({
  initial,
  you,
}: {
  initial: BlueprintPage[];
  you: string;
}) {
  const { run, pending } = useAction();
  const [pages, setPages] = useState(initial);
  const [activeId, setActiveId] = useState(
    () =>
      initial.find((p) => pageStatus(p) === "REVIEW")?.id ?? initial[0]?.id,
  );
  // Which decision they're writing a note for.
  const [deciding, setDeciding] = useState<"APPROVE" | "CHANGES" | null>(
    null,
  );
  const [note, setNote] = useState("");

  const counts = blueprintCounts(pages);
  const page = pages.find((p) => p.id === activeId) ?? pages[0];

  // Nothing written yet. This comes before anything that reads `page`:
  // the React Compiler checks what the functions below depend on
  // (page.name, page.sections) on every render, so with no page at all
  // those checks would throw before we ever got here.
  if (!page) {
    return (
      <section className={styles.panel}>
        <p className={styles.copy}>
          We&apos;re writing your blueprint. It shows up here, page by page, as
          soon as it&apos;s ready for you.
        </p>
      </section>
    );
  }

  const status = pageStatus(page);
  const pill = pagePill[status];
  const pagesWaiting = pages.filter((p) => pageStatus(p) === "REVIEW");
  const pagesApproved = pages.filter((p) => pageStatus(p) === "APPROVED");

  const open = (id: string) => {
    setActiveId(id);
    setDeciding(null);
    setNote("");
  };

  const decide = () => {
    if (!deciding || pending) return;
    const text = note.trim();
    if (deciding === "CHANGES" && !text) return;
    const choice = deciding;
    run(
      () => decidePage(page.id, choice, text),
      () => {
        const next: SectionStatus = choice === "APPROVE" ? "APPROVED" : "CHANGES";
        setPages((list) =>
          list.map((p) =>
            p.id !== page.id
              ? p
              : {
                  ...p,
                  sections: p.sections.map((sec, i) => ({
                    ...sec,
                    status: sec.status === "REVIEW" ? next : sec.status,
                    comments:
                      i === 0 && text
                        ? [
                            ...sec.comments,
                            {
                              id: `c-${Date.now()}`,
                              from: "you",
                              name: you,
                              at: new Date().toISOString(),
                              text: `${choice === "APPROVE" ? "Approved" : "Changes requested"}: ${text}`,
                            },
                          ]
                        : sec.comments,
                  })),
                },
          ),
        );
        setDeciding(null);
        setNote("");
        // On to the next page waiting for them.
        const nextPage = pagesWaiting.find((p) => p.id !== page.id);
        if (nextPage) setActiveId(nextPage.id);
        return choice === "APPROVE"
          ? {
              message: `Approved: ${page.name}`,
              detail: nextPage
                ? `Next up: ${nextPage.name}.`
                : "Thank you. That's every page that was waiting.",
            }
          : {
              message: `Sent to Chris: ${page.name}`,
              detail: "He'll make your changes and send the page back to you.",
            };
      },
    );
  };

  // Every note on this page, oldest first.
  const notes = page.sections
    .flatMap((sec) => sec.comments)
    .sort((a, b) => (a.at < b.at ? -1 : 1));

  return (
    <>
      <section className={styles.summary}>
        <dl className={styles.tiles}>
          <div className={styles.tile}>
            <dt className={ui.monoMuted}>Pages</dt>
            <dd className={styles.tileValue}>{pages.length}</dd>
          </div>
          <div className={styles.tile}>
            <dt className={ui.monoMuted}>Approved</dt>
            <dd className={styles.tileValue}>
              {pagesApproved.length}
              <span className={styles.tileOf}>/{pages.length}</span>
            </dd>
          </div>
          <div
            className={`${styles.tile} ${pagesWaiting.length ? styles.tileYou : ""}`}
          >
            <dt className={ui.monoMuted}>Ready for you</dt>
            <dd className={styles.tileValue}>{pagesWaiting.length}</dd>
          </div>
          <div className={styles.tile}>
            <dt className={ui.monoMuted}>We&apos;re writing</dt>
            <dd className={styles.tileValue}>
              {
                pages.filter((p) => {
                  const st = pageStatus(p);
                  return st === "DRAFT" || st === "CHANGES";
                }).length
              }
            </dd>
          </div>
        </dl>
        <Progress
          value={counts.approved}
          max={counts.total}
          label='Sections approved'
          tone='lime'
        />
      </section>

      <div className={styles.layout}>
        <nav className={styles.pages} aria-label='Pages in your blueprint'>
          <span className={`${ui.monoMuted} ${styles.pagesTitle}`}>
            Your pages
          </span>
          <ul className={styles.pageList}>
            {pages.map((p) => {
              const st = pageStatus(p);
              return (
                <li key={p.id}>
                  <button
                    type='button'
                    className={`${styles.pageBtn} ${p.id === page.id ? styles.pageActive : ""}`}
                    aria-current={p.id === page.id ? "page" : undefined}
                    onClick={() => open(p.id)}
                  >
                    <span className={styles.pageText}>
                      <span className={styles.pageName}>{p.name}</span>
                      <span className={styles.pagePath}>{p.path}</span>
                    </span>
                    {st === "REVIEW" ? (
                      <span className={styles.count} aria-label='Ready for you'>
                        <Icon name='eye' />
                      </span>
                    ) : st === "APPROVED" ? (
                      <span className={styles.done} aria-label='Approved'>
                        <Icon name='check' />
                      </span>
                    ) : st === "CHANGES" ? (
                      <span
                        className={styles.changes}
                        aria-label='Changes requested'
                      >
                        <Icon name='pen' />
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className={styles.panel}>
          <div className={styles.pageHead}>
            <div className={styles.pageHeadText}>
              <span className={ui.monoMuted}>{page.path}</span>
              <h2 className={styles.pageTitle}>{page.name}</h2>
              {page.purpose && <p className={styles.copy}>{page.purpose}</p>}
              {page.keyword && (
                <span className={styles.keyword}>
                  <Icon name='search' />
                  Written to rank for “{page.keyword}”
                </span>
              )}
            </div>
            <Pill tone={pill.tone} dot>
              {pill.text}
            </Pill>
          </div>

          <ol className={styles.sections}>
            {page.sections.map((section, index) => {
              const sp = statusPill[section.status];
              return (
                <li
                  key={section.id}
                  className={`${styles.section} ${section.status === "REVIEW" ? styles.sectionReview : ""}`}
                >
                  <div className={styles.sectionTop}>
                    <span className={styles.sectionTitle}>
                      <span className={styles.sectionNum}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {section.title}
                    </span>
                    {section.status !== status && (
                      <Pill tone={sp.tone} dot>
                        {sp.text}
                      </Pill>
                    )}
                  </div>

                  {section.copy.length > 0 ? (
                    <div className={styles.copyBlock}>
                      {section.copy.map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.copy}>We&apos;re still writing this one.</p>
                  )}
                </li>
              );
            })}
          </ol>

          {notes.length > 0 && (
            <div className={styles.notes}>
              <span className={ui.monoMuted}>Notes on this page</span>
              <ul className={styles.comments}>
                {notes.map((comment) => (
                  <li
                    key={comment.id}
                    className={`${styles.comment} ${comment.from === "you" ? styles.commentYou : ""}`}
                  >
                    <span className={ui.monoMuted}>
                      {comment.name} · {fmtShort(comment.at)}
                    </span>
                    <p>{comment.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* The decision, for a page that's waiting for them. */}
          {status === "REVIEW" && (
            <div className={styles.decision}>
              {deciding ? (
                <div className={styles.changeForm}>
                  <label className={ui.field}>
                    <span className={ui.label}>
                      {deciding === "APPROVE"
                        ? "Anything to add? (optional)"
                        : "What should change?"}
                    </span>
                    <textarea
                      className={ui.textarea}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={
                        deciding === "APPROVE"
                          ? "e.g. Love it. Could we mention Mesa in the hero too?"
                          : "e.g. Say “since 2012” in the hero, and add the Sprinter to the fleet section."
                      }
                      autoFocus
                    />
                  </label>
                  <div className={styles.actions}>
                    <button
                      type='button'
                      className={`${ui.btn} ${ui.btn_light}`}
                      onClick={() => {
                        setDeciding(null);
                        setNote("");
                      }}
                    >
                      Back
                    </button>
                    <button
                      type='button'
                      className={`${ui.btn} ${ui.btn_black}`}
                      disabled={
                        pending || (deciding === "CHANGES" && !note.trim())
                      }
                      onClick={decide}
                    >
                      {deciding === "APPROVE"
                        ? `Approve ${page.name}`
                        : "Send my changes"}
                      <Icon
                        name={deciding === "APPROVE" ? "check" : "send"}
                        className={ui.btnIcon}
                      />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.decisionText}>
                    <span className={styles.decisionTitle}>
                      Happy with this page?
                    </span>
                    <p className={styles.copy}>
                      Approve it, or tell us what to change and we&apos;ll
                      rewrite it and send it back.
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <button
                      type='button'
                      className={`${ui.btn} ${ui.btn_light}`}
                      onClick={() => setDeciding("CHANGES")}
                    >
                      Request changes
                      <Icon name='pen' className={ui.btnIcon} />
                    </button>
                    <button
                      type='button'
                      className={`${ui.btn} ${ui.btn_black}`}
                      onClick={() => setDeciding("APPROVE")}
                    >
                      Approve page
                      <Icon name='check' className={ui.btnIcon} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
