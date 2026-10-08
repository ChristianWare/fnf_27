"use client";

import { useState } from "react";
import Icon from "../icons";
import { Pill, Progress, ui } from "../ui/ui";
import { useToast } from "../Toast/Toast";
import styles from "./Blueprint.module.css";
import { blueprintCounts } from "@/lib/dashboard/helpers";
import { fmtShort } from "@/lib/dashboard/format";
import type {
  BlueprintPage,
  BlueprintSection,
  SectionStatus,
} from "@/lib/dashboard/types";

const statusPill: Record<
  SectionStatus,
  { text: string; tone: "lime" | "yellow" | "gray" }
> = {
  APPROVED: { text: "Approved", tone: "lime" },
  REVIEW: { text: "Ready for you", tone: "yellow" },
  DRAFT: { text: "We're writing", tone: "gray" },
};

export default function Blueprint({
  initial,
  you,
}: {
  initial: BlueprintPage[];
  you: string;
}) {
  const toast = useToast();
  const [pages, setPages] = useState(initial);
  const [activeId, setActiveId] = useState(
    () =>
      initial.find((p) => p.sections.some((s) => s.status === "REVIEW"))?.id ??
      initial[0]?.id,
  );
  const [commenting, setCommenting] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const counts = blueprintCounts(pages);
  const page = pages.find((p) => p.id === activeId) ?? pages[0];

  const update = (
    sectionId: string,
    change: (section: BlueprintSection) => BlueprintSection,
  ) =>
    setPages((list) =>
      list.map((p) => ({
        ...p,
        sections: p.sections.map((s) => (s.id === sectionId ? change(s) : s)),
      })),
    );

  const markApproved = (sectionId: string) =>
    update(sectionId, (s) => ({ ...s, status: "APPROVED" }));

  const approve = (section: BlueprintSection) => {
    markApproved(section.id);
    toast(`Approved: ${section.title}`);
  };

  const approveAll = () => {
    const waiting = page.sections.filter((s) => s.status === "REVIEW");
    waiting.forEach((s) => markApproved(s.id));
    toast(
      `${waiting.length} section${waiting.length === 1 ? "" : "s"} approved`,
      { detail: `${page.name} is ready to build.` },
    );
  };

  const sendChange = (sectionId: string) => {
    if (!draft.trim()) return;
    update(sectionId, (s) => ({
      ...s,
      status: "DRAFT",
      comments: [
        ...s.comments,
        {
          id: `c-${Date.now()}`,
          from: "you",
          name: you,
          at: new Date().toISOString(),
          text: draft.trim(),
        },
      ],
    }));
    setDraft("");
    setCommenting(null);
    toast("Sent to Chris", {
      detail: "He'll rewrite the section and send it back for approval.",
    });
  };

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

  const inReview = page.sections.filter((s) => s.status === "REVIEW").length;

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
              {counts.approved}
              <span className={styles.tileOf}>/{counts.total}</span>
            </dd>
          </div>
          <div
            className={`${styles.tile} ${counts.review ? styles.tileYou : ""}`}
          >
            <dt className={ui.monoMuted}>Ready for you</dt>
            <dd className={styles.tileValue}>{counts.review}</dd>
          </div>
          <div className={styles.tile}>
            <dt className={ui.monoMuted}>We&apos;re writing</dt>
            <dd className={styles.tileValue}>{counts.draft}</dd>
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
              const review = p.sections.filter(
                (s) => s.status === "REVIEW",
              ).length;
              const allApproved = p.sections.every(
                (s) => s.status === "APPROVED",
              );
              return (
                <li key={p.id}>
                  <button
                    type='button'
                    className={`${styles.pageBtn} ${p.id === page.id ? styles.pageActive : ""}`}
                    aria-current={p.id === page.id ? "page" : undefined}
                    onClick={() => {
                      setActiveId(p.id);
                      setCommenting(null);
                    }}
                  >
                    <span className={styles.pageText}>
                      <span className={styles.pageName}>{p.name}</span>
                      <span className={styles.pagePath}>{p.path}</span>
                    </span>
                    {review > 0 ? (
                      <span className={styles.count}>{review}</span>
                    ) : allApproved ? (
                      <span className={styles.done}>
                        <Icon name='check' />
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
              <p className={styles.copy}>{page.purpose}</p>
              {page.keyword && (
                <span className={styles.keyword}>
                  <Icon name='search' />
                  Written to rank for “{page.keyword}”
                </span>
              )}
            </div>
            {inReview > 1 && (
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_black}`}
                onClick={approveAll}
              >
                Approve all {inReview}
                <Icon name='check' className={ui.btnIcon} />
              </button>
            )}
          </div>

          <ol className={styles.sections}>
            {page.sections.map((section, index) => {
              const pill = statusPill[section.status];
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
                    <Pill tone={pill.tone} dot>
                      {pill.text}
                    </Pill>
                  </div>

                  <div className={styles.copyBlock}>
                    {section.copy.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>

                  {section.comments.length > 0 && (
                    <ul className={styles.comments}>
                      {section.comments.map((comment) => (
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
                  )}

                  {section.status === "REVIEW" &&
                    (commenting === section.id ? (
                      <div className={styles.changeForm}>
                        <label className={ui.field}>
                          <span className={ui.label}>What should change?</span>
                          <textarea
                            className={ui.textarea}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder='e.g. Say “since 2012” instead, and mention the Sprinter.'
                            autoFocus
                          />
                        </label>
                        <div className={styles.actions}>
                          <button
                            type='button'
                            className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                            onClick={() => {
                              setCommenting(null);
                              setDraft("");
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type='button'
                            className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
                            disabled={!draft.trim()}
                            onClick={() => sendChange(section.id)}
                          >
                            Send to Chris
                            <Icon name='send' className={ui.btnIcon} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.actions}>
                        <button
                          type='button'
                          className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                          onClick={() => {
                            setCommenting(section.id);
                            setDraft("");
                          }}
                        >
                          Ask for a change
                        </button>
                        <button
                          type='button'
                          className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
                          onClick={() => approve(section)}
                        >
                          Approve
                          <Icon name='check' className={ui.btnIcon} />
                        </button>
                      </div>
                    ))}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </>
  );
}
