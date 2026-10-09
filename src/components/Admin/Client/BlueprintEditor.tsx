"use client";

// Write a client's blueprint: pages, the sections on each, their copy and
// status, and replies to the client's comments. Sending drafts for review
// shows them to the client to approve, and emails them.

import { useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { useAction } from "@/components/Dashboard/useAction";
import { Pill, ui } from "@/components/Dashboard/ui/ui";
import {
  addBlueprintPage,
  addBlueprintSection,
  saveSectionCopy,
  sendSectionsForReview,
  setSectionStatus,
  startBlueprint,
  studioComment,
} from "@/app/admin/build-actions";
import { blueprintCounts } from "@/lib/dashboard/helpers";
import { fmtShort } from "@/lib/dashboard/format";
import type {
  BlueprintPage,
  BlueprintSection,
  SectionStatus,
} from "@/lib/dashboard/types";
import styles from "./Client.module.css";

const statuses: { key: SectionStatus; label: string }[] = [
  { key: "DRAFT", label: "Draft" },
  { key: "REVIEW", label: "With client" },
  { key: "APPROVED", label: "Approved" },
];

// A starting set of pages for a black car site.
const STARTER: {
  name: string;
  path: string;
  purpose: string;
  sections: string[];
}[] = [
  {
    name: "Home",
    path: "/",
    purpose: "Turn a local search into a booking.",
    sections: ["Hero", "What we drive", "Why us", "Reviews and questions"],
  },
  {
    name: "Airport transfers",
    path: "/airport-car-service",
    purpose: "Rank for the searches people make before a flight.",
    sections: ["Hero", "How pickup works", "Rates"],
  },
  {
    name: "Corporate travel",
    path: "/corporate",
    purpose: "Win the assistants who book for executives.",
    sections: ["Hero", "Accounts and invoicing"],
  },
  {
    name: "Fleet",
    path: "/fleet",
    purpose: "Show riders exactly what they're booking.",
    sections: ["The vehicles"],
  },
  {
    name: "About",
    path: "/about",
    purpose: "Put a face to the name.",
    sections: ["Your story"],
  },
  {
    name: "Contact",
    path: "/contact",
    purpose: "Every way to reach them, and book.",
    sections: ["Contact details"],
  },
];

export default function BlueprintEditor({
  clientId,
  initial,
  firstName,
  you,
}: {
  clientId: string;
  initial: BlueprintPage[];
  firstName: string;
  /** The signed-in admin, for their comments. */
  you: string;
}) {
  const { run, pending } = useAction();
  const [pages, setPages] = useState(initial);
  const [activeId, setActiveId] = useState(initial[0]?.id);
  const [editing, setEditing] = useState<string | null>(null);
  const [copyDraft, setCopyDraft] = useState("");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [newPage, setNewPage] = useState("");
  const [newSection, setNewSection] = useState("");

  const page = pages.find((p) => p.id === activeId) ?? pages[0];
  const counts = blueprintCounts(pages);

  const updateSection = (
    id: string,
    change: (s: BlueprintSection) => BlueprintSection,
  ) =>
    setPages((list) =>
      list.map((p) => ({
        ...p,
        sections: p.sections.map((s) => (s.id === id ? change(s) : s)),
      })),
    );

  const start = () =>
    run(
      () => startBlueprint(clientId, STARTER),
      (seeded) => {
        if (!seeded?.length) return;
        setPages(seeded);
        setActiveId(seeded[0].id);
        return {
          message: "Blueprint started",
          detail: `${seeded.length} pages, ready for you to write.`,
        };
      },
    );

  if (!page) {
    return (
      <section className={`${styles.card} ${styles.emptyCard}`}>
        <span className={styles.emptyIcon}>
          <Icon name='blueprint' />
        </span>
        <h2 className={styles.heading}>No blueprint yet</h2>
        <p className={styles.help}>
          Start with the pages most black car sites need, then shape them from{" "}
          {firstName}&apos;s questionnaire.
        </p>
        <button
          type='button'
          className={`${ui.btn} ${ui.btn_black}`}
          onClick={start}
          disabled={pending}
        >
          Start with the standard pages
          <Icon name='plus' className={ui.btnIcon} />
        </button>
      </section>
    );
  }

  const drafts = page.sections.filter(
    (s) => s.status === "DRAFT" && s.copy.length > 0,
  );

  return (
    <>
      <section className={styles.bpSummary}>
        {statuses.map((s) => (
          <div
            key={s.key}
            className={`${styles.bpStat} ${styles[`bp_${s.key}`]}`}
          >
            <span className={ui.monoMuted}>{s.label}</span>
            <span className={styles.bpValue}>
              {s.key === "DRAFT"
                ? counts.draft
                : s.key === "REVIEW"
                  ? counts.review
                  : counts.approved}
            </span>
          </div>
        ))}
        <div className={styles.bpStat}>
          <span className={ui.monoMuted}>Pages</span>
          <span className={styles.bpValue}>{pages.length}</span>
        </div>
      </section>

      <div className={styles.bpLayout}>
        <nav className={styles.bpPages} aria-label='Pages'>
          <ul className={styles.bpPageList}>
            {pages.map((p) => {
              const c = blueprintCounts([p]);
              return (
                <li key={p.id}>
                  <button
                    type='button'
                    className={`${styles.bpPage} ${p.id === page.id ? styles.bpPageOn : ""}`}
                    onClick={() => {
                      setActiveId(p.id);
                      setEditing(null);
                    }}
                    aria-current={p.id === page.id ? "page" : undefined}
                  >
                    <span className={styles.bpPageText}>
                      <span className={styles.bpPageName}>{p.name}</span>
                      <span className={styles.bpPagePath}>{p.path}</span>
                    </span>
                    <span
                      className={styles.bpDots}
                      aria-label={`${c.approved} of ${c.total} approved`}
                    >
                      {p.sections.map((s) => (
                        <i key={s.id} className={styles[`dot_${s.status}`]} />
                      ))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <form
            className={styles.inlineAdd}
            onSubmit={(e) => {
              e.preventDefault();
              const name = newPage.trim();
              if (!name || pending) return;
              run(
                () => addBlueprintPage(clientId, name),
                (data) => {
                  if (!data) return;
                  setPages((list) => [
                    ...list,
                    {
                      id: data.id,
                      name,
                      path: data.path,
                      purpose: "",
                      sections: [],
                    },
                  ]);
                  setActiveId(data.id);
                  setNewPage("");
                  return { message: `Page added: ${name}` };
                },
              );
            }}
          >
            <input
              className={ui.input}
              value={newPage}
              onChange={(e) => setNewPage(e.target.value)}
              placeholder='New page, e.g. Weddings'
              aria-label='New page name'
            />
            <button
              type='submit'
              className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
              disabled={!newPage.trim()}
              aria-label='Add page'
            >
              <Icon name='plus' className={ui.btnIcon} />
            </button>
          </form>
        </nav>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div className={styles.titles}>
              <span className={ui.monoMuted}>{page.path}</span>
              <h2 className={styles.bpTitle}>{page.name}</h2>
              {page.purpose && <p>{page.purpose}</p>}
              {page.keyword && (
                <span className={styles.keyword}>
                  <Icon name='search' />
                  Written to rank for “{page.keyword}”
                </span>
              )}
            </div>
            {drafts.length > 0 && (
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_black}`}
                disabled={pending}
                onClick={() =>
                  run(
                    () =>
                      sendSectionsForReview(
                        clientId,
                        drafts.map((x) => x.id),
                      ),
                    () => {
                      drafts.forEach((x) =>
                        updateSection(x.id, (y) => ({
                          ...y,
                          status: "REVIEW",
                        })),
                      );
                      return {
                        message: `${drafts.length} section${drafts.length === 1 ? "" : "s"} sent to ${firstName}`,
                        detail:
                          "They'll see them on their Blueprint page to approve, and get an email.",
                      };
                    },
                  )
                }
              >
                Send {drafts.length} for review
                <Icon name='send' className={ui.btnIcon} />
              </button>
            )}
          </div>

          <ol className={styles.bpSections}>
            {page.sections.map((section, index) => (
              <li key={section.id} className={styles.bpSection}>
                <div className={styles.bpSectionTop}>
                  <span className={styles.bpSectionTitle}>
                    <span className={styles.bpNum}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {section.title}
                  </span>
                  <div
                    className={styles.segmented}
                    role='radiogroup'
                    aria-label={`${section.title} status`}
                  >
                    {statuses.map((s) => (
                      <button
                        key={s.key}
                        type='button'
                        role='radio'
                        aria-checked={section.status === s.key}
                        className={`${styles.segment} ${section.status === s.key ? styles[`seg_${s.key}`] : ""}`}
                        onClick={() => {
                          if (section.status === s.key) return;
                          const next = s.key;
                          run(
                            () => setSectionStatus(clientId, section.id, next),
                            () => {
                              updateSection(section.id, (x) => ({
                                ...x,
                                status: next,
                              }));
                              return {
                                message: `${section.title}: ${s.label.toLowerCase()}`,
                                tone: "info",
                              };
                            },
                          );
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {editing === section.id ? (
                  <div className={styles.bpEdit}>
                    <textarea
                      className={ui.textarea}
                      value={copyDraft}
                      onChange={(e) => setCopyDraft(e.target.value)}
                      aria-label={`Copy for ${section.title}`}
                      placeholder='One paragraph per line.'
                      autoFocus
                    />
                    <div className={styles.actions}>
                      <button
                        type='button'
                        className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                        onClick={() => setEditing(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type='button'
                        className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
                        disabled={pending}
                        onClick={() => {
                          const copy = copyDraft
                            .split("\n")
                            .map((line) => line.trim())
                            .filter(Boolean);
                          run(
                            () => saveSectionCopy(clientId, section.id, copy),
                            () => {
                              updateSection(section.id, (x) => ({
                                ...x,
                                copy,
                              }));
                              setEditing(null);
                              return { message: `Saved: ${section.title}` };
                            },
                          );
                        }}
                      >
                        Save copy
                      </button>
                    </div>
                  </div>
                ) : section.copy.length ? (
                  <button
                    type='button'
                    className={styles.bpCopy}
                    onClick={() => {
                      setEditing(section.id);
                      setCopyDraft(section.copy.join("\n"));
                    }}
                  >
                    {section.copy.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                    <span className={styles.bpEditHint}>
                      <Icon name='pen' />
                      Edit
                    </span>
                  </button>
                ) : (
                  <button
                    type='button'
                    className={styles.bpWrite}
                    onClick={() => {
                      setEditing(section.id);
                      setCopyDraft("");
                    }}
                  >
                    <Icon name='pen' />
                    Write this section
                  </button>
                )}

                {section.comments.length > 0 && (
                  <ul className={styles.comments}>
                    {section.comments.map((c) => (
                      <li
                        key={c.id}
                        className={`${styles.comment} ${c.from === "us" ? styles.commentUs : ""}`}
                      >
                        <span className={ui.monoMuted}>
                          {c.from === "us" ? "You" : c.name} · {fmtShort(c.at)}
                        </span>
                        <p>{c.text}</p>
                      </li>
                    ))}
                  </ul>
                )}

                <form
                  className={styles.reply}
                  onSubmit={(e) => {
                    e.preventDefault();
                    const text = replies[section.id]?.trim();
                    if (!text || pending) return;
                    run(
                      () => studioComment(clientId, section.id, text),
                      (data) => {
                        updateSection(section.id, (x) => ({
                          ...x,
                          comments: [
                            ...x.comments,
                            {
                              id: data?.id ?? `c-${Date.now()}`,
                              from: "us",
                              name: you,
                              at: new Date().toISOString(),
                              text,
                            },
                          ],
                        }));
                        setReplies((r) => ({ ...r, [section.id]: "" }));
                        return { message: `Comment sent to ${firstName}` };
                      },
                    );
                  }}
                >
                  <input
                    className={ui.input}
                    value={replies[section.id] ?? ""}
                    onChange={(e) =>
                      setReplies((r) => ({
                        ...r,
                        [section.id]: e.target.value,
                      }))
                    }
                    placeholder={`Comment to ${firstName}…`}
                    aria-label={`Comment on ${section.title}`}
                  />
                  <button
                    type='submit'
                    className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                    disabled={!replies[section.id]?.trim()}
                    aria-label='Send comment'
                  >
                    <Icon name='send' className={ui.btnIcon} />
                  </button>
                </form>
              </li>
            ))}
          </ol>

          <form
            className={styles.inlineAdd}
            onSubmit={(e) => {
              e.preventDefault();
              const title = newSection.trim();
              if (!title || pending) return;
              const pageId = page.id;
              run(
                () => addBlueprintSection(clientId, pageId, title),
                (data) => {
                  setPages((list) =>
                    list.map((p) =>
                      p.id === pageId
                        ? {
                            ...p,
                            sections: [
                              ...p.sections,
                              {
                                id: data?.id ?? `s-${Date.now()}`,
                                title,
                                status: "DRAFT",
                                copy: [],
                                comments: [],
                              },
                            ],
                          }
                        : p,
                    ),
                  );
                  setNewSection("");
                  return { message: `Section added to ${page.name}` };
                },
              );
            }}
          >
            <input
              className={ui.input}
              value={newSection}
              onChange={(e) => setNewSection(e.target.value)}
              placeholder='New section, e.g. Frequently asked questions'
              aria-label='New section title'
            />
            <button
              type='submit'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              disabled={!newSection.trim()}
            >
              Add section
            </button>
          </form>
        </section>
      </div>
      {counts.review > 0 && (
        <p className={styles.footnote}>
          <Pill tone='yellow' dot>
            {counts.review} with {firstName}
          </Pill>{" "}
          Sections marked “With client” are on {firstName}&apos;s Blueprint page
          now, waiting for approval or comments.
        </p>
      )}
    </>
  );
}
