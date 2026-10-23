"use client";

// The client's blueprint: every page of their site, section by section.
// They read it through, then approve the whole thing at once (a note is
// optional) or ask for changes (a note tells us what, on any page). We
// send it back after making the changes.

import { useState } from "react";
import Icon from "../icons";
import { Pill, ui } from "../ui/ui";
import { useAction } from "../useAction";
import styles from "./Blueprint.module.css";
import { decideBlueprint } from "@/app/dashboard/actions";
import {
  blueprintStatus,
  type PageStatus,
} from "@/lib/dashboard/helpers";
import { fmtShort } from "@/lib/dashboard/format";
import type { BlueprintPage, SectionStatus } from "@/lib/dashboard/types";

const statusPill: Record<
  PageStatus,
  { text: string; tone: "lime" | "yellow" | "gray" | "red" }
> = {
  APPROVED: { text: "Approved", tone: "lime" },
  REVIEW: { text: "Ready for you", tone: "yellow" },
  CHANGES: { text: "We're making your changes", tone: "red" },
  DRAFT: { text: "We're writing", tone: "gray" },
};

const headline: Record<PageStatus, { title: string; text: string }> = {
  REVIEW: {
    title: "Your blueprint is ready",
    text: "Read every page through, then approve the whole blueprint, or tell us what to change on any page.",
  },
  CHANGES: {
    title: "We're making your changes",
    text: "Thanks for your notes. We'll update the blueprint and send it back to you to approve.",
  },
  APPROVED: {
    title: "Blueprint approved",
    text: "Thank you. This is what we build your site from.",
  },
  DRAFT: {
    title: "We're writing your blueprint",
    text: "Every page and section of your site, written for the searches your customers make. We'll email you when it's ready to read.",
  },
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
  const [activeId, setActiveId] = useState(initial[0]?.id);
  // The pages they've opened, for "4 of 6 read".
  const [read, setRead] = useState<string[]>(() =>
    initial[0] ? [initial[0].id] : [],
  );
  const [deciding, setDeciding] = useState<"APPROVE" | "CHANGES" | null>(
    null,
  );
  const [note, setNote] = useState("");

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

  const status = blueprintStatus(pages);
  const pill = statusPill[status];
  const head = headline[status];
  const index = pages.findIndex((p) => p.id === page.id);
  const nextPage = pages[index + 1];

  const open = (id: string) => {
    setActiveId(id);
    setRead((list) => (list.includes(id) ? list : [...list, id]));
    const top = document.getElementById("blueprint-pages");
    top?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const decide = () => {
    if (!deciding || pending) return;
    const text = note.trim();
    if (deciding === "CHANGES" && !text) return;
    const choice = deciding;
    run(
      () => decideBlueprint(choice, text),
      () => {
        const next: SectionStatus =
          choice === "APPROVE" ? "APPROVED" : "CHANGES";
        setPages((list) =>
          list.map((p, pi) => ({
            ...p,
            sections: p.sections.map((sec, si) => ({
              ...sec,
              status:
                choice === "APPROVE" || sec.status === "REVIEW"
                  ? next
                  : sec.status,
              comments:
                pi === 0 && si === 0 && text
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
          })),
        );
        setDeciding(null);
        setNote("");
        return choice === "APPROVE"
          ? {
              message: "Blueprint approved",
              detail: "Thank you. This is what we build your site from.",
            }
          : {
              message: "Sent to Chris",
              detail: "He'll make your changes and send the blueprint back.",
            };
      },
    );
  };

  // Every note on the blueprint, oldest first.
  const notes = pages
    .flatMap((p) => p.sections.flatMap((sec) => sec.comments))
    .sort((a, b) => (a.at < b.at ? -1 : 1));

  // Approve or request changes: in the card up top, and again after the
  // last page.
  const decision = (
    <div className={styles.decision}>
      {deciding ? (
        <div className={styles.changeForm}>
          <label className={ui.field}>
            <span className={ui.label}>
              {deciding === "APPROVE"
                ? "Anything to add? (optional)"
                : "What should change? Mention the page for each change."}
            </span>
            <textarea
              className={ui.textarea}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                deciding === "APPROVE"
                  ? "e.g. Love it. Could we mention Mesa on the Home page too?"
                  : "e.g. Home: say “since 2012” in the hero. Fleet: add the Sprinter."
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
              disabled={pending || (deciding === "CHANGES" && !note.trim())}
              onClick={decide}
            >
              {deciding === "APPROVE" ? "Approve blueprint" : "Send my changes"}
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
              Happy with your blueprint?
            </span>
            <p className={styles.copy}>
              You&apos;ve opened {read.length} of {pages.length} page
              {pages.length === 1 ? "" : "s"}. Approve it all at once, or tell
              us what to change.
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
              Approve blueprint
              <Icon name='check' className={ui.btnIcon} />
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <section className={styles.summary}>
        <div className={styles.summaryHead}>
          <div className={styles.summaryText}>
            <h2 className={styles.summaryTitle}>{head.title}</h2>
            <p className={styles.copy}>{head.text}</p>
          </div>
          <Pill tone={pill.tone} dot>
            {pill.text}
          </Pill>
        </div>
        {status === "REVIEW" && decision}
        {notes.length > 0 && (
          <div className={styles.notes}>
            <span className={ui.monoMuted}>Notes</span>
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
      </section>

      <div className={styles.layout} id='blueprint-pages'>
        <nav className={styles.pages} aria-label='Pages in your blueprint'>
          <span className={`${ui.monoMuted} ${styles.pagesTitle}`}>
            Your pages
          </span>
          <ul className={styles.pageList}>
            {pages.map((p) => (
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
                  {read.includes(p.id) && status === "REVIEW" && (
                    <span className={styles.done} aria-label='Read'>
                      <Icon name='eye' />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <section className={styles.panel}>
          <div className={styles.pageHead}>
            <div className={styles.pageHeadText}>
              <span className={ui.monoMuted}>
                Page {index + 1} of {pages.length} · {page.path}
              </span>
              <h2 className={styles.pageTitle}>{page.name}</h2>
              {page.purpose && <p className={styles.copy}>{page.purpose}</p>}
              {page.keyword && (
                <span className={styles.keyword}>
                  <Icon name='search' />
                  Written to rank for “{page.keyword}”
                </span>
              )}
            </div>
          </div>

          <ol className={styles.sections}>
            {page.sections.map((section, i) => (
              <li
                key={section.id}
                className={styles.section}
              >
                <div className={styles.sectionTop}>
                  <span className={styles.sectionTitle}>
                    <span className={styles.sectionNum}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {section.title}
                  </span>
                </div>
                {section.copy.length > 0 ? (
                  <div className={styles.copyBlock}>
                    {section.copy.map((line, j) => (
                      <p key={j}>{line}</p>
                    ))}
                  </div>
                ) : (
                  <p className={styles.copy}>
                    We&apos;re still writing this one.
                  </p>
                )}
              </li>
            ))}
          </ol>

          {nextPage ? (
            <div className={styles.nextRow}>
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_black}`}
                onClick={() => open(nextPage.id)}
              >
                Next page: {nextPage.name}
                <Icon name='arrow' className={ui.btnIcon} />
              </button>
            </div>
          ) : (
            status === "REVIEW" && decision
          )}
        </section>
      </div>
    </>
  );
}
