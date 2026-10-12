"use client";

// Every audit, newest first: who ran it, how they scored, how to reach
// them, and where you are with them. Search, and filter by where they
// came from or what's next.

import Link from "next/link";
import { useMemo, useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { Pill, ui, type Tone } from "@/components/Dashboard/ui/ui";
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
        <div className={styles.head} aria-hidden='true'>
          <span>Operator</span>
          <span>Score</span>
          <span>Where you are</span>
          <span>Contact</span>
          <span>Ran</span>
        </div>
        {shown.length ? (
          <ul className={styles.rows}>
            {shown.map((r) => (
              <li key={r.id}>
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
