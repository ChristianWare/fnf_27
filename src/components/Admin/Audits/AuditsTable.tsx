"use client";

// Every audit, newest first: who ran it, how they scored, how to reach
// them, and where you are with them. Search, filter by where they came
// from or what's next, and tick several to delete them at once.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { Pill, btn, ui, type Tone } from "@/components/Dashboard/ui/ui";
import { useAction } from "@/components/Dashboard/useAction";
import ConfirmDialog from "@/components/Dashboard/ConfirmDialog/ConfirmDialog";
import { removeAudits } from "@/app/admin/audits/actions";
import { FOLLOW_UP_LABELS, type FollowUp } from "@/lib/audit/kinds";
import { fmtAgo } from "@/lib/dashboard/format";
import styles from "./Audits.module.css";

export type AuditRowView = {
  id: string;
  business: string;
  sub: string;
  score: number | null;
  status: "QUEUED" | "RUNNING" | "DONE" | "FAILED";
  source: "PAGE" | "ADMIN";
  followUp: FollowUp;
  contact: string;
  createdAt: string;
  sample: boolean;
};

const followTone: Record<FollowUp, Tone> = {
  NEW: "yellow",
  CONTACTED: "purple",
  CALL: "mint",
  CLIENT: "lime",
  NO: "gray",
};

type Filter = "ALL" | "PAGE" | "ADMIN" | "REPORT" | FollowUp;

const filters: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PAGE", label: "From the page" },
  { key: "ADMIN", label: "Run by you" },
  { key: "NEW", label: "New" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "CALL", label: "Call booked" },
  { key: "CLIENT", label: "Clients" },
  { key: "NO", label: "Not a fit" },
];

export default function AuditsTable({
  rows,
  now,
}: {
  rows: AuditRowView[];
  now: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const counts = useMemo(() => {
    const out: Record<string, number> = { ALL: rows.length };
    for (const r of rows) {
      out[r.source] = (out[r.source] ?? 0) + 1;
      out[r.followUp] = (out[r.followUp] ?? 0) + 1;
    }
    return out;
  }, [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) =>
        filter === "ALL"
          ? true
          : filter === "PAGE" || filter === "ADMIN"
            ? r.source === filter
            : r.followUp === filter,
      )
      .filter(
        (r) =>
          !q || `${r.business} ${r.sub} ${r.contact}`.toLowerCase().includes(q),
      );
  }, [rows, query, filter]);

  return (
    <section className={styles.panel}>
      <div className={styles.tools}>
        <label className={styles.search}>
          <span className={ui.srOnly}>Search audits</span>
          <input
            className={ui.input}
            type='search'
            placeholder='Search by business, website, city or email'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      <div className={styles.filters} role='group' aria-label='Show'>
        {filters.map((f) => (
          <button
            key={f.key}
            type='button'
            className={ui.chip}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className={styles.count}>{counts[f.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div>
        <div
          className={`${styles.head} ${styles.headPicked}`}
          aria-hidden='true'
        >
          <span>Operator</span>
          <span>Score</span>
          <span>Where you are</span>
          <span>Contact</span>
          <span>Ran</span>
        </div>
        {shown.length ? (
          <>
            <SelectBar
              shown={shown}
              selected={selected}
              setSelected={setSelected}
            />
            <ul className={styles.rows}>
              {shown.map((r) => (
                <li
                  key={r.id}
                  className={`${styles.rowWrap} ${selected.has(r.id) ? styles.rowPicked : ""}`}
                >
                  <label className={styles.pickBox}>
                    <input
                      type='checkbox'
                      className={styles.checkInput}
                      checked={selected.has(r.id)}
                      onChange={() => toggle(r.id)}
                      aria-label={`Select ${r.business}`}
                    />
                    <span className={styles.checkBox} aria-hidden='true'>
                      <Icon name='check' />
                    </span>
                  </label>
                  <Link href={`/admin/audits/${r.id}`} className={styles.row}>
                    <span className={styles.who}>
                      <span className={styles.name}>{r.business}</span>
                      <span className={styles.sub}>
                        {r.sub}
                        {r.source === "ADMIN" ? " · run by you" : ""}
                        {r.sample ? " · the sample" : ""}
                      </span>
                    </span>
                    <span className={styles.score}>
                      {r.status === "DONE" ? (
                        <>
                          {r.score ?? "–"}
                          <span className={styles.scoreOf}>/100</span>
                        </>
                      ) : (
                        <Pill tone={r.status === "FAILED" ? "red" : "gray"}>
                          {r.status === "FAILED" ? "Failed" : "Running"}
                        </Pill>
                      )}
                    </span>
                    <span className={styles.cell}>
                      <Pill tone={followTone[r.followUp]}>
                        {FOLLOW_UP_LABELS[r.followUp]}
                      </Pill>
                    </span>
                    <span className={styles.cell}>{r.contact || "—"}</span>
                    <span className={styles.when}>
                      {fmtAgo(r.createdAt, now)}
                    </span>
                    <Icon name='arrow' className={styles.arrow} />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className={styles.none}>
            {rows.length
              ? "No audits match."
              : "No audits yet. Run one above, or share fontsandfooters.com/audit."}
          </p>
        )}
      </div>
    </section>
  );
}

/** Select all of what's shown, and delete what's ticked. Only ticked
 *  audits that are still shown are deleted, so a search can't hide one. */
function SelectBar({
  shown,
  selected,
  setSelected,
}: {
  shown: AuditRowView[];
  selected: Set<string>;
  setSelected: (next: Set<string>) => void;
}) {
  const { run, pending } = useAction();
  const ids = shown.map((r) => r.id);
  const picked = ids.filter((id) => selected.has(id));
  const all = picked.length === ids.length && ids.length > 0;
  const some = picked.length > 0 && !all;
  const boxRef = useRef<HTMLInputElement>(null);
  // Which audits are being deleted, kept while the dialog closes so the
  // list in it doesn't change under you.
  const [asking, setAsking] = useState(false);
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    if (boxRef.current) boxRef.current.indeterminate = some;
  }, [some]);

  const setAll = (on: boolean) => {
    const next = new Set(selected);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    setSelected(next);
  };

  const remove = () =>
    run(
      () => removeAudits(picked),
      (n) => {
        setAsking(false);
        setSelected(new Set());
        const count = n ?? picked.length;
        return {
          message:
            count === 1
              ? `Deleted the audit for ${names[0]}`
              : `Deleted ${count} audits`,
        };
      },
    );

  return (
    <>
      <div
        className={`${styles.selectBar} ${picked.length ? styles.selectBarOn : ""}`}
      >
        <label className={styles.selectAll}>
          <input
            ref={boxRef}
            type='checkbox'
            className={styles.checkInput}
            checked={all}
            onChange={() => setAll(!all)}
          />
          <span className={styles.checkBox} aria-hidden='true'>
            <Icon name={some ? "close" : "check"} />
          </span>
          <span className={styles.selectText}>
            {picked.length
              ? `${picked.length} selected`
              : `Select all ${ids.length}`}
          </span>
        </label>
        {picked.length > 0 && (
          <div className={styles.selectActions}>
            <button
              type='button'
              className={btn("light", true)}
              onClick={() => setSelected(new Set())}
              disabled={pending}
            >
              Clear
            </button>
            <button
              type='button'
              className={`${btn("black", true)} ${styles.deleteBtn}`}
              onClick={() => {
                setNames(
                  shown
                    .filter((r) => selected.has(r.id))
                    .map((r) => r.business),
                );
                setAsking(true);
              }}
              disabled={pending}
            >
              <Icon name='trash' className={styles.btnIcon} />
              Delete{" "}
              {picked.length === 1 ? "1 audit" : `${picked.length} audits`}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={asking}
        tone='danger'
        icon='trash'
        title={
          names.length === 1
            ? `Delete the audit for ${names[0]}?`
            : `Delete ${names.length} audits?`
        }
        text={`${names.length === 1 ? "Its report goes" : "Their reports go"} too, and this can't be undone. A report link you've already sent stops working.`}
        items={names.length > 1 ? names : undefined}
        confirmLabel={
          names.length === 1 ? "Delete" : `Delete ${names.length} audits`
        }
        cancelLabel='Keep them'
        pendingLabel='Deleting…'
        pending={pending}
        onConfirm={remove}
        onClose={() => setAsking(false)}
      />
    </>
  );
}
