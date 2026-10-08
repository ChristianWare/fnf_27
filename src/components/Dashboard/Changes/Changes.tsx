"use client";

import { useState } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "../icons";
import { Pill, ui } from "../ui/ui";
import styles from "./Changes.module.css";
import { fmtShort } from "@/lib/dashboard/format";
import type { ChangeRequest, ChangeStatus } from "@/lib/dashboard/types";

const AREAS = [
  "Home page",
  "Airport pages",
  "City and route pages",
  "Fleet",
  "Booking",
  "Whole site",
  "New page",
  "Something else",
];

const status: Record<
  ChangeStatus,
  { text: string; tone: "yellow" | "mint" | "lime" | "gray" }
> = {
  PENDING: { text: "Received", tone: "yellow" },
  IN_PROGRESS: { text: "In progress", tone: "mint" },
  COMPLETED: { text: "Done", tone: "lime" },
  DECLINED: { text: "Not done", tone: "gray" },
};

type Filter = "all" | "open" | "done";

export default function Changes({
  initial,
  you,
}: {
  initial: ChangeRequest[];
  you: string;
}) {
  const [requests, setRequests] = useState(initial);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [area, setArea] = useState(AREAS[0]);
  const [details, setDetails] = useState("");
  const [sentId, setSentId] = useState<string | null>(null);

  const isOpen = (r: ChangeRequest) =>
    r.status === "PENDING" || r.status === "IN_PROGRESS";
  const shown = requests.filter((r) =>
    filter === "all" ? true : filter === "open" ? isOpen(r) : !isOpen(r),
  );
  const openCount = requests.filter(isOpen).length;
  const doneCount = requests.filter((r) => r.status === "COMPLETED").length;

  const submit = () => {
    if (!title.trim() || !details.trim()) return;
    const number = Math.max(0, ...requests.map((r) => r.number)) + 1;
    const id = `c-${number}`;
    setRequests((list) => [
      {
        id,
        number,
        title: title.trim(),
        area,
        details: details.trim(),
        status: "PENDING",
        submittedAt: new Date().toISOString(),
      },
      ...list,
    ]);
    setSentId(id);
    setFilter("all");
    setTitle("");
    setDetails("");
    setArea(AREAS[0]);
    setOpen(false);
  };

  return (
    <>
      <section className={styles.top}>
        <dl className={styles.tiles}>
          <div className={styles.tile}>
            <dt className={ui.monoMuted}>Your plan</dt>
            <dd className={styles.tileValue}>Unlimited</dd>
          </div>
          <div className={`${styles.tile} ${openCount ? styles.tileOpen : ""}`}>
            <dt className={ui.monoMuted}>Open</dt>
            <dd className={styles.tileValue}>{openCount}</dd>
          </div>
          <div className={styles.tile}>
            <dt className={ui.monoMuted}>Done</dt>
            <dd className={styles.tileValue}>{doneCount}</dd>
          </div>
          <div className={styles.tile}>
            <dt className={ui.monoMuted}>Usual turnaround</dt>
            <dd className={styles.tileValue}>2 days</dd>
          </div>
        </dl>
        <button
          type='button'
          className={`${ui.btn} ${ui.btn_black} ${styles.newBtn}`}
          onClick={() => setOpen(true)}
        >
          New request
          <Icon name='plus' className={ui.btnIcon} />
        </button>
      </section>

      <section className={styles.panel}>
        <div className={styles.listHead}>
          <h2 className={styles.heading}>Your requests</h2>
          <div className={styles.filters} role='group' aria-label='Show'>
            {(
              [
                ["all", "All"],
                ["open", "Open"],
                ["done", "Closed"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type='button'
                className={ui.chip}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {shown.length ? (
          <ol className={styles.list}>
            {shown.map((r) => (
              <li
                key={r.id}
                className={`${styles.item} ${r.id === sentId ? styles.itemNew : ""}`}
              >
                <div className={styles.itemTop}>
                  <span className={styles.number}>#{r.number}</span>
                  <h3 className={styles.itemTitle}>{r.title}</h3>
                  <Pill tone={status[r.status].tone} dot>
                    {status[r.status].text}
                  </Pill>
                </div>
                <span className={ui.monoMuted}>
                  {r.area} · Sent {fmtShort(r.submittedAt)}
                  {r.updatedAt && r.status === "COMPLETED"
                    ? ` · Done ${fmtShort(r.updatedAt)}`
                    : ""}
                </span>
                <p className={styles.details}>{r.details}</p>
                {r.reply ? (
                  <div className={styles.reply}>
                    <span className={ui.mono}>Chris</span>
                    <p>{r.reply}</p>
                  </div>
                ) : (
                  r.id === sentId && (
                    <span className={ui.saved}>
                      <Icon name='check' />
                      Sent. You&apos;ll hear back within one business day,{" "}
                      {you.split(" ")[0]}.
                    </span>
                  )
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.none}>Nothing here.</p>
        )}
      </section>

      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <form
          className={ui.modalBody}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <span className={ui.monoMuted}>Unlimited on your plan</span>
          <h2 className={ui.modalTitle}>New change request</h2>
          <label className={ui.field}>
            <span className={ui.label}>What should change?</span>
            <input
              className={ui.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g. Add our new Sprinter to the fleet page'
            />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Where</span>
            <select
              className={ui.select}
              value={area}
              onChange={(e) => setArea(e.target.value)}
            >
              {AREAS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          <label className={ui.field}>
            <span className={ui.label}>The details</span>
            <textarea
              className={ui.textarea}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder='Links, wording, prices: anything that helps. Photos can go in Brand assets.'
            />
          </label>
          <div className={ui.modalActions}>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light}`}
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type='submit'
              className={`${ui.btn} ${ui.btn_black}`}
              disabled={!title.trim() || !details.trim()}
            >
              Send request
              <Icon name='send' className={ui.btnIcon} />
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
