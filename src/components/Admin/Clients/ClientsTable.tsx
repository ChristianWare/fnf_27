"use client";

// Every client in one list: search, filter by where they are, sort.

import Link from "next/link";
import { useMemo, useState } from "react";
import Mark from "../Mark";
import Icon from "@/components/Dashboard/icons";
import { Pill, ui, type Tone } from "@/components/Dashboard/ui/ui";
import type { ClientKind, StageKey } from "@/lib/admin/derive";
import { fmtAgo, money } from "@/lib/dashboard/format";
import styles from "./ClientsTable.module.css";

export type ClientRow = {
  id: string;
  business: string;
  city: string;
  contact: string;
  email: string;
  kind: ClientKind;
  kindLabel: string;
  stage: { key: StageKey; label: string; done?: number; total?: number };
  mrr: number;
  pastDue: boolean;
  next?: { title: string; href: string };
  waitingOnThem: number;
  lastActive: string;
};

const filters: { key: "ALL" | StageKey | "PAST_DUE"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "NEW", label: "New sign-ups" },
  { key: "BUILD", label: "In build" },
  { key: "LIVE", label: "Live" },
  { key: "TRIAL", label: "Trials" },
  { key: "LEADS", label: "Leads Tool" },
  { key: "PAST_DUE", label: "Past due" },
];

const kindTone: Record<ClientKind, Tone> = {
  NEW: "yellow",
  FULL_PLATFORM: "black",
  WEBSITE_ONLY: "lime",
  LEADS: "purple",
};

type Sort = "active" | "name" | "mrr";

export default function ClientsTable({
  rows,
  now,
}: {
  rows: ClientRow[];
  now: string;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("ALL");
  const [sort, setSort] = useState<Sort>("active");

  const counts = useMemo(() => {
    const out: Record<string, number> = { ALL: rows.length };
    for (const row of rows) {
      out[row.stage.key] = (out[row.stage.key] ?? 0) + 1;
      if (row.pastDue) out.PAST_DUE = (out.PAST_DUE ?? 0) + 1;
    }
    return out;
  }, [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) =>
        filter === "ALL"
          ? true
          : filter === "PAST_DUE"
            ? row.pastDue
            : row.stage.key === filter,
      )
      .filter(
        (row) =>
          !q ||
          [row.business, row.city, row.contact, row.email]
            .join(" ")
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) =>
        sort === "name"
          ? a.business.localeCompare(b.business)
          : sort === "mrr"
            ? b.mrr - a.mrr
            : b.lastActive.localeCompare(a.lastActive),
      );
  }, [rows, query, filter, sort]);

  return (
    <section className={styles.panel}>
      <div className={styles.tools}>
        <label className={styles.search}>
          <Icon name='search' className={styles.searchIcon} />
          <span className={ui.srOnly}>Search clients</span>
          <input
            className={styles.searchInput}
            type='search'
            placeholder='Search by business, name, email or city'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className={styles.sort}>
          <span className={ui.monoMuted}>Sort</span>
          <select
            className={`${ui.select} ${styles.sortSelect}`}
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
          >
            <option value='active'>Latest activity</option>
            <option value='name'>Name, A to Z</option>
            <option value='mrr'>Monthly revenue</option>
          </select>
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

      <div className={styles.table}>
        <div className={styles.head} aria-hidden='true'>
          <span>Client</span>
          <span>Plan</span>
          <span>Where they are</span>
          <span>Monthly</span>
          <span>Next up</span>
          <span>Last active</span>
        </div>
        {shown.length ? (
          <ul className={styles.rows}>
            {shown.map((row) => (
              <li key={row.id}>
                <Link href={`/admin/clients/${row.id}`} className={styles.row}>
                  <span className={styles.who}>
                    <Mark business={row.business} kind={row.kind} />
                    <span className={styles.whoText}>
                      <span className={styles.name}>{row.business}</span>
                      <span className={styles.sub}>
                        {row.contact} · {row.city}
                      </span>
                    </span>
                  </span>
                  <span className={styles.cell}>
                    <Pill tone={kindTone[row.kind]}>{row.kindLabel}</Pill>
                  </span>
                  <span className={`${styles.cell} ${styles.stage}`}>
                    <span className={styles.stageTop}>
                      <span className={styles.stageLabel}>
                        {row.stage.label}
                      </span>
                      {row.stage.total ? (
                        <span className={styles.stageCount}>
                          {row.stage.done}/{row.stage.total}
                        </span>
                      ) : null}
                      {row.pastDue && (
                        <Pill tone='red' dot>
                          Past due
                        </Pill>
                      )}
                    </span>
                    {row.stage.total ? (
                      <span className={styles.track} aria-hidden='true'>
                        <span
                          className={`${styles.fill} ${row.stage.key === "LIVE" ? styles.fillLive : ""}`}
                          style={{
                            width: `${((row.stage.done ?? 0) / row.stage.total) * 100}%`,
                          }}
                        />
                      </span>
                    ) : null}
                  </span>
                  <span className={`${styles.cell} ${styles.mrr}`}>
                    {row.mrr ? money(row.mrr) : "—"}
                  </span>
                  <span className={`${styles.cell} ${styles.next}`}>
                    {row.next ? (
                      <span className={styles.nextYou}>{row.next.title}</span>
                    ) : row.waitingOnThem ? (
                      <span className={styles.nextThem}>
                        Waiting on them ({row.waitingOnThem})
                      </span>
                    ) : (
                      <span className={styles.nextNone}>Nothing needs you</span>
                    )}
                  </span>
                  <span className={`${styles.cell} ${styles.when}`}>
                    {fmtAgo(row.lastActive, now)}
                  </span>
                  <Icon name='arrow' className={styles.arrow} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.none}>No clients match.</p>
        )}
      </div>
    </section>
  );
}
