"use client";

// Change requests as a board: Received, In progress, Done. Open one to read
// it, move it along and reply; the client gets an email each time. Used for
// every client on the Change requests page, and for one client on their
// page.

import { useState } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Mark from "../Mark";
import Icon from "@/components/Dashboard/icons";
import { useAction } from "@/components/Dashboard/useAction";
import { Pill, ui } from "@/components/Dashboard/ui/ui";
import { updateChangeRequest } from "@/app/admin/actions";
import type { ClientKind } from "@/lib/admin/derive";
import { fmtAgo, fmtShort } from "@/lib/dashboard/format";
import type { ChangeRequest, ChangeStatus } from "@/lib/dashboard/types";
import styles from "./RequestsBoard.module.css";

export type RequestRow = ChangeRequest & {
  key: string;
  clientId: string;
  business: string;
  kind: ClientKind;
  firstName: string;
  email: string;
};

const columns: { status: ChangeStatus; title: string; tone: string }[] = [
  { status: "PENDING", title: "Received", tone: styles.colNew },
  { status: "IN_PROGRESS", title: "In progress", tone: styles.colDoing },
  { status: "COMPLETED", title: "Done", tone: styles.colDone },
  { status: "DECLINED", title: "Not doing", tone: styles.colNo },
];

const label: Record<ChangeStatus, string> = {
  PENDING: "Received",
  IN_PROGRESS: "In progress",
  COMPLETED: "Done",
  DECLINED: "Not doing",
};

export default function RequestsBoard({
  initial,
  now,
  openKey,
  showClient = true,
}: {
  initial: RequestRow[];
  now: string;
  openKey?: string;
  showClient?: boolean;
}) {
  const { run, pending } = useAction();
  const [rows, setRows] = useState(initial);
  const [open, setOpen] = useState<string | null>(
    initial.some((r) => r.key === openKey) ? openKey! : null,
  );
  const [status, setStatus] = useState<ChangeStatus>("PENDING");
  const [reply, setReply] = useState("");

  const current = rows.find((r) => r.key === open);

  const openRow = (row: RequestRow) => {
    setOpen(row.key);
    setStatus(row.status);
    setReply("");
  };

  const save = () => {
    if (!current || pending) return;
    const text = reply.trim();
    const row = current;
    const next = status;
    run(
      () =>
        updateChangeRequest(row.clientId, row.id, {
          status: next,
          reply: text,
        }),
      () => {
        setRows((list) =>
          list.map((r) =>
            r.key === row.key
              ? {
                  ...r,
                  status: next,
                  updatedAt: new Date().toISOString(),
                  reply: text || r.reply,
                }
              : r,
          ),
        );
        setOpen(null);
        return {
          message:
            next !== row.status
              ? `#${row.number} is ${label[next].toLowerCase()}`
              : `Reply sent to ${row.firstName}`,
          detail: `${row.firstName} gets an email at ${row.email}.`,
        };
      },
    );
  };

  // Done and not-doing columns show the latest few.
  const inColumn = (s: ChangeStatus) => {
    const list = rows
      .filter((r) => r.status === s)
      .sort((a, b) =>
        (b.updatedAt ?? b.submittedAt).localeCompare(
          a.updatedAt ?? a.submittedAt,
        ),
      );
    return s === "COMPLETED" || s === "DECLINED" ? list.slice(0, 6) : list;
  };

  return (
    <>
      <div className={styles.board}>
        {columns.map((col) => {
          const list = inColumn(col.status);
          return (
            <section
              key={col.status}
              className={`${styles.column} ${col.tone}`}
            >
              <div className={styles.colHead}>
                <span className={styles.colTitle}>{col.title}</span>
                <span className={styles.colCount}>
                  {rows.filter((r) => r.status === col.status).length}
                </span>
              </div>
              {list.length ? (
                <ul className={styles.cards}>
                  {list.map((row) => (
                    <li key={row.key}>
                      <button
                        type='button'
                        className={styles.card}
                        onClick={() => openRow(row)}
                      >
                        {showClient && (
                          <span className={styles.who}>
                            <Mark
                              business={row.business}
                              kind={row.kind}
                              size='sm'
                            />
                            <span className={styles.business}>
                              {row.business}
                            </span>
                          </span>
                        )}
                        <span className={styles.title}>
                          <span className={styles.number}>#{row.number}</span>{" "}
                          {row.title}
                        </span>
                        <span className={styles.meta}>
                          <span>{row.area}</span>
                          <span>
                            {fmtAgo(row.updatedAt ?? row.submittedAt, now)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.empty}>Nothing here.</p>
              )}
            </section>
          );
        })}
      </div>

      <Modal isOpen={Boolean(current)} onClose={() => setOpen(null)}>
        {current && (
          <div className={ui.modalBody}>
            <div className={styles.modalTop}>
              <Mark business={current.business} kind={current.kind} />
              <span className={styles.modalWho}>
                <span className={styles.modalBiz}>{current.business}</span>
                <span className={ui.monoMuted}>
                  #{current.number} · {current.area} · Sent{" "}
                  {fmtShort(current.submittedAt)}
                </span>
              </span>
              <Pill
                tone={
                  current.status === "PENDING"
                    ? "yellow"
                    : current.status === "IN_PROGRESS"
                      ? "mint"
                      : current.status === "COMPLETED"
                        ? "lime"
                        : "gray"
                }
                dot
              >
                {label[current.status]}
              </Pill>
            </div>
            <h2 className={ui.modalTitle}>{current.title}</h2>
            <div className={styles.details}>
              <span className={ui.mono}>{current.firstName} wrote</span>
              <p>{current.details}</p>
            </div>
            {current.reply && (
              <div className={styles.prior}>
                <span className={ui.mono}>Your last reply</span>
                <p>{current.reply}</p>
              </div>
            )}

            <div
              className={styles.statusPick}
              role='radiogroup'
              aria-label='Status'
            >
              {columns.map((col) => (
                <button
                  key={col.status}
                  type='button'
                  role='radio'
                  aria-checked={status === col.status}
                  className={ui.chip}
                  onClick={() => setStatus(col.status)}
                >
                  {status === col.status && <Icon name='check' />}
                  {col.title}
                </button>
              ))}
            </div>

            <label className={ui.field}>
              <span className={ui.label}>Reply to {current.firstName}</span>
              <textarea
                className={ui.textarea}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={
                  status === "COMPLETED"
                    ? "e.g. Done. It's live on the fleet page now."
                    : status === "DECLINED"
                      ? "Say why, and what you'd do instead."
                      : "e.g. On it. It'll be live by Thursday."
                }
              />
            </label>

            <div className={ui.modalActions}>
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_light}`}
                onClick={() => setOpen(null)}
              >
                Cancel
              </button>
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_black}`}
                disabled={status === current.status && !reply.trim()}
                onClick={save}
              >
                Save and email {current.firstName}
                <Icon name='send' className={ui.btnIcon} />
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
