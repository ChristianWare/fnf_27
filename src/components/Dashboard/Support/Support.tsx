"use client";

import { useEffect, useState } from "react";
import Icon from "../icons";
import { Pill, ui } from "../ui/ui";
import { useAction } from "../useAction";
import styles from "./Support.module.css";
import {
  markThreadRead,
  replyThread,
  startThread,
} from "@/app/dashboard/actions";
import { fmtShort, fmtTime } from "@/lib/dashboard/format";
import type { Thread } from "@/lib/dashboard/types";

const EMAIL = "hello@fontsandfooters.com";

/** A message they just sent, shown straight away. */
const sentMessage = (name: string, text: string) => ({
  id: `m-${Date.now()}`,
  from: "you" as const,
  name,
  at: new Date().toISOString(),
  text,
});

const statusPill = {
  OPEN: { text: "Waiting on us", tone: "yellow" },
  ANSWERED: { text: "Answered", tone: "mint" },
  CLOSED: { text: "Closed", tone: "gray" },
} as const;

export default function Support({
  initial,
  you,
}: {
  initial: Thread[];
  you: string;
}) {
  const { run, pending } = useAction();
  // The first conversation opens on arrival, so it counts as read.
  const [threads, setThreads] = useState(() =>
    initial.map((t, i) => (i === 0 ? { ...t, unread: false } : t)),
  );
  const [activeId, setActiveId] = useState<string | "new">(
    initial[0]?.id ?? "new",
  );
  const [reply, setReply] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const active = threads.find((t) => t.id === activeId);

  // Opening the page shows the first conversation: that counts as read.
  useEffect(() => {
    if (initial[0]?.unread) void markThreadRead(initial[0].id);
  }, [initial]);

  const select = (id: string) => {
    if (threads.find((t) => t.id === id)?.unread) void markThreadRead(id);
    setActiveId(id);
    setReply("");
    setThreads((list) =>
      list.map((t) => (t.id === id ? { ...t, unread: false } : t)),
    );
    // On phones the conversation sits under the list: bring it into view.
    if (window.matchMedia("(max-width: 968px)").matches) {
      requestAnimationFrame(() =>
        document
          .getElementById("support-conversation")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  };

  const send = () => {
    const text = reply.trim();
    if (!active || !text || pending) return;
    run(
      () => replyThread(active.id, text),
      () => {
        setThreads((list) =>
          list.map((t) =>
            t.id === active.id
              ? {
                  ...t,
                  status: "OPEN",
                  messages: [...t.messages, sentMessage(you, text)],
                }
              : t,
          ),
        );
        setReply("");
        return {
          message: "Reply sent",
          detail: "Chris replies within one business day.",
        };
      },
    );
  };

  const start = () => {
    const topic = subject.trim();
    const text = body.trim();
    if (!topic || !text || pending) return;
    run(
      () => startThread(topic, text),
      (data) => {
        const id = data?.id ?? `t-${Date.now()}`;
        setThreads((list) => [
          {
            id,
            subject: topic,
            status: "OPEN",
            messages: [sentMessage(you, text)],
          },
          ...list,
        ]);
        setSubject("");
        setBody("");
        setActiveId(id);
        return {
          message: "Message sent",
          detail: "Chris replies within one business day.",
        };
      },
    );
  };

  return (
    <div className={styles.layout}>
      <section className={styles.list}>
        <div className={styles.listHead}>
          <h2 className={styles.heading}>Messages</h2>
          <button
            type='button'
            className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
            onClick={() => {
              setActiveId("new");
              if (window.matchMedia("(max-width: 968px)").matches) {
                requestAnimationFrame(() =>
                  document
                    .getElementById("support-conversation")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                );
              }
            }}
          >
            New
            <Icon name='plus' className={ui.btnIcon} />
          </button>
        </div>
        <ul className={styles.threads} data-lenis-prevent>
          {threads.map((thread) => {
            const last = thread.messages.at(-1);
            return (
              <li key={thread.id}>
                <button
                  type='button'
                  className={`${styles.thread} ${thread.id === activeId ? styles.threadActive : ""}`}
                  onClick={() => select(thread.id)}
                  aria-current={thread.id === activeId ? "true" : undefined}
                >
                  <span className={styles.threadTop}>
                    <span className={styles.threadSubject}>
                      {thread.unread && (
                        <span
                          className={styles.unread}
                          aria-label='New reply'
                        />
                      )}
                      {thread.subject}
                    </span>
                    {last && (
                      <span className={styles.threadTime}>
                        {fmtShort(last.at)}
                      </span>
                    )}
                  </span>
                  {last && (
                    <span className={styles.preview}>
                      {last.from === "us" ? "Chris: " : "You: "}
                      {last.text}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <div className={styles.contact}>
          <span className={ui.monoMuted}>Or email</span>
          <a href={`mailto:${EMAIL}`} className={styles.email}>
            {EMAIL}
          </a>
        </div>
      </section>

      <section id='support-conversation' className={styles.conversation}>
        {active ? (
          <>
            <div className={styles.convHead}>
              <div className={styles.convTitles}>
                <h2 className={styles.heading}>{active.subject}</h2>
                <span className={ui.monoMuted}>
                  {active.messages.length} message
                  {active.messages.length === 1 ? "" : "s"} · Started{" "}
                  {fmtShort(active.messages[0].at)}
                </span>
              </div>
              <Pill tone={statusPill[active.status].tone} dot>
                {statusPill[active.status].text}
              </Pill>
            </div>

            <ol className={styles.messages} data-lenis-prevent>
              {active.messages.map((m) => (
                <li
                  key={m.id}
                  className={`${styles.message} ${m.from === "you" ? styles.mine : ""}`}
                >
                  <span className={styles.meta}>
                    {m.from === "you" ? "You" : m.name} · {fmtShort(m.at)},{" "}
                    {fmtTime(m.at)}
                  </span>
                  <p className={styles.bubble}>{m.text}</p>
                </li>
              ))}
            </ol>

            <form
              className={styles.composer}
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <label className={ui.srOnly} htmlFor='support-reply'>
                Your reply
              </label>
              <textarea
                id='support-reply'
                className={`${ui.textarea} ${styles.replyBox}`}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder='Write a reply…'
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <button
                type='submit'
                className={`${ui.btn} ${ui.btn_black}`}
                disabled={!reply.trim()}
              >
                Send
                <Icon name='send' className={ui.btnIcon} />
              </button>
            </form>
          </>
        ) : (
          <form
            className={styles.newForm}
            onSubmit={(e) => {
              e.preventDefault();
              start();
            }}
          >
            <div className={styles.convTitles}>
              <h2 className={styles.heading}>New message</h2>
              <p>
                Chris reads every message and replies within one business day.
              </p>
            </div>
            <label className={ui.field}>
              <span className={ui.label}>Subject</span>
              <input
                className={ui.input}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder='e.g. Question about my airport page'
              />
            </label>
            <label className={ui.field}>
              <span className={ui.label}>Message</span>
              <textarea
                className={ui.textarea}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='How can we help?'
              />
            </label>
            <div className={styles.newActions}>
              <button
                type='submit'
                className={`${ui.btn} ${ui.btn_black}`}
                disabled={!subject.trim() || !body.trim()}
              >
                Send message
                <Icon name='send' className={ui.btnIcon} />
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
