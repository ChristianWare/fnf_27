"use client";

// Every client conversation in one inbox, the ones waiting on you first.
// Replying emails the client. Used for every client on the Messages page,
// and for one client on their page. SAMPLE: lasts until you reload.

import { useMemo, useState } from "react";
import Mark from "../Mark";
import Icon from "@/components/Dashboard/icons";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { Pill, ui } from "@/components/Dashboard/ui/ui";
import type { ClientKind } from "@/lib/admin/derive";
import { fmtAgo, fmtShort, fmtTime } from "@/lib/dashboard/format";
import type { Thread } from "@/lib/dashboard/types";
import styles from "./Inbox.module.css";

export type ThreadRow = Thread & {
  key: string;
  clientId: string;
  business: string;
  kind: ClientKind;
  contact: string;
  email: string;
};

type Filter = "waiting" | "all" | "closed";

const needsYou = (t: ThreadRow) =>
  t.status === "OPEN" && t.messages.at(-1)?.from === "you";

export default function Inbox({
  initial,
  now,
  openKey,
  showClient = true,
}: {
  initial: ThreadRow[];
  now: string;
  openKey?: string;
  showClient?: boolean;
}) {
  const toast = useToast();
  const [threads, setThreads] = useState(initial);
  // Open on the list that holds the conversation you came for.
  const [filter, setFilter] = useState<Filter>(() => {
    const opened = initial.find((t) => t.key === openKey);
    if (opened && !needsYou(opened)) {
      return opened.status === "CLOSED" ? "closed" : "all";
    }
    return initial.some(needsYou) ? "waiting" : "all";
  });
  const [activeKey, setActiveKey] = useState<string | undefined>(
    initial.find((t) => t.key === openKey)?.key ??
      initial.find(needsYou)?.key ??
      initial[0]?.key,
  );
  const [reply, setReply] = useState("");

  const sorted = useMemo(
    () =>
      [...threads].sort((a, b) => {
        if (needsYou(a) !== needsYou(b)) return needsYou(a) ? -1 : 1;
        return (b.messages.at(-1)?.at ?? "").localeCompare(
          a.messages.at(-1)?.at ?? "",
        );
      }),
    [threads],
  );
  const shown = sorted.filter((t) =>
    filter === "waiting"
      ? needsYou(t)
      : filter === "closed"
        ? t.status === "CLOSED"
        : true,
  );
  const active = threads.find((t) => t.key === activeKey);

  const send = () => {
    if (!active || !reply.trim()) return;
    const text = reply.trim();
    setThreads((list) =>
      list.map((t) =>
        t.key === active.key
          ? {
              ...t,
              status: "ANSWERED",
              messages: [
                ...t.messages,
                {
                  id: `m-${Date.now()}`,
                  from: "us",
                  name: "Chris Ware",
                  at: new Date().toISOString(),
                  text,
                },
              ],
            }
          : t,
      ),
    );
    setReply("");
    toast(`Reply sent to ${active.contact.split(" ")[0]}`, {
      detail: `Emailed to ${active.email}.`,
    });
  };

  const setStatus = (status: Thread["status"]) => {
    if (!active) return;
    setThreads((list) =>
      list.map((t) => (t.key === active.key ? { ...t, status } : t)),
    );
    toast(
      status === "CLOSED" ? "Conversation closed" : "Conversation reopened",
      {
        tone: "info",
      },
    );
  };

  return (
    <div className={styles.layout}>
      <section className={styles.list}>
        <div className={styles.filters} role='group' aria-label='Show'>
          {(
            [
              ["waiting", "Needs reply", threads.filter(needsYou).length],
              ["all", "All", threads.length],
              [
                "closed",
                "Closed",
                threads.filter((t) => t.status === "CLOSED").length,
              ],
            ] as const
          ).map(([key, text, count]) => (
            <button
              key={key}
              type='button'
              className={ui.chip}
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {text}
              <span className={styles.count}>{count}</span>
            </button>
          ))}
        </div>

        {shown.length ? (
          <ul className={styles.threads} data-lenis-prevent>
            {shown.map((thread) => {
              const last = thread.messages.at(-1);
              return (
                <li key={thread.key}>
                  <button
                    type='button'
                    className={`${styles.thread} ${thread.key === activeKey ? styles.threadOn : ""}`}
                    onClick={() => {
                      setActiveKey(thread.key);
                      setReply("");
                    }}
                    aria-current={thread.key === activeKey ? "true" : undefined}
                  >
                    {showClient && (
                      <Mark
                        business={thread.business}
                        kind={thread.kind}
                        size='sm'
                      />
                    )}
                    <span className={styles.threadText}>
                      <span className={styles.threadTop}>
                        <span className={styles.threadWho}>
                          {needsYou(thread) && (
                            <span
                              className={styles.unread}
                              aria-label='Needs a reply'
                            />
                          )}
                          {showClient ? thread.business : thread.contact}
                        </span>
                        {last && (
                          <span className={styles.when}>
                            {fmtAgo(last.at, now)}
                          </span>
                        )}
                      </span>
                      <span className={styles.subject}>{thread.subject}</span>
                      {last && (
                        <span className={styles.preview}>
                          {last.from === "us" ? "You: " : ""}
                          {last.text}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={styles.empty}>
            {filter === "waiting"
              ? "Nobody's waiting on you."
              : "Nothing here."}
          </p>
        )}
      </section>

      <section className={styles.conversation}>
        {active ? (
          <>
            <div className={styles.head}>
              <div className={styles.headWho}>
                <Mark business={active.business} kind={active.kind} />
                <span className={styles.headText}>
                  <span className={styles.headSubject}>{active.subject}</span>
                  <span className={ui.monoMuted}>
                    {active.contact} · {active.business}
                  </span>
                </span>
              </div>
              <div className={styles.headActions}>
                {needsYou(active) ? (
                  <Pill tone='yellow' dot>
                    Needs reply
                  </Pill>
                ) : active.status === "CLOSED" ? (
                  <Pill tone='gray' dot>
                    Closed
                  </Pill>
                ) : (
                  <Pill tone='mint' dot>
                    Answered
                  </Pill>
                )}
                <button
                  type='button'
                  className={`${ui.btn} ${ui.btn_outline} ${ui.btnSmall}`}
                  onClick={() =>
                    setStatus(active.status === "CLOSED" ? "OPEN" : "CLOSED")
                  }
                >
                  {active.status === "CLOSED" ? "Reopen" : "Close"}
                </button>
              </div>
            </div>

            <ol className={styles.messages} data-lenis-prevent>
              {active.messages.map((m) => (
                <li
                  key={m.id}
                  className={`${styles.message} ${m.from === "us" ? styles.mine : ""}`}
                >
                  <span className={styles.meta}>
                    {m.from === "us" ? "You" : m.name} · {fmtShort(m.at)},{" "}
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
              <label className={ui.srOnly} htmlFor='admin-reply'>
                Reply to {active.contact}
              </label>
              <textarea
                id='admin-reply'
                className={`${ui.textarea} ${styles.replyBox}`}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={`Reply to ${active.contact.split(" ")[0]}…`}
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
          <div className={styles.none}>
            <Icon name='inbox' className={styles.noneIcon} />
            <p>No conversations yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
