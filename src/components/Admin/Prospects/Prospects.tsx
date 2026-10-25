"use client";

// Admin → Prospects: today's calls (follow-ups first, then new ones up to
// your daily goal), everyone on your lists, and importing more. Opening
// one shows its card, where the call is logged.

import { useMemo, useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { Pill, Progress, btn, ui } from "@/components/Dashboard/ui/ui";
import { useAction } from "@/components/Dashboard/useAction";
import { fmtAgo, fmtShort, fmtTime } from "@/lib/dashboard/format";
import {
  OUTCOME_LABELS,
  PROSPECT_STAGES,
  STAGE_LABELS,
  type CallOutcome,
  type ProspectStage,
} from "@/lib/prospects/kinds";
import type { Tone } from "@/components/Dashboard/ui/ui";
import { saveGoal } from "@/app/admin/prospects/actions";
import ProspectCard from "./ProspectCard";
import ImportProspects from "./ImportProspects";
import { stageTone } from "./tones";
import styles from "./Prospects.module.css";

export type ProspectView = {
  id: string;
  business: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  mapsUrl: string;
  city: string;
  state: string;
  list: string;
  tags: string[];
  notes: string;
  rating: number | null;
  reviews: number | null;
  stage: ProspectStage;
  tries: number;
  calls: number;
  nextAt: string | null;
  lastCalledAt: string | null;
  lastOutcome: CallOutcome | null;
  clientId: string | null;
  audit: { id: string; score: number | null } | null;
  inviteSentAt: string | null;
  coverage: { tone: Tone; label: string };
  createdAt: string;
};

type Tab = "TODAY" | "ALL" | "IMPORT";

export default function Prospects({
  rows,
  queue,
  goal,
  calledToday,
  now,
  lists,
}: {
  rows: ProspectView[];
  queue: { due: string[]; fresh: string[] };
  goal: number;
  calledToday: number;
  now: string;
  lists: string[];
}) {
  const [tab, setTab] = useState<Tab>(rows.length ? "TODAY" : "IMPORT");
  const [openId, setOpenId] = useState<string | null>(null);
  // The queue as it was when you opened the first card, so a logged call
  // doesn't make the list jump under you.
  const [order, setOrder] = useState<string[]>([]);
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const open = openId ? (byId.get(openId) ?? null) : null;
  const inQueue = openId ? order.includes(openId) : false;

  const next = () => {
    const i = order.indexOf(openId ?? "");
    const after = order.slice(i + 1).find((id) => byId.has(id));
    setOpenId(after ?? null);
  };

  return (
    <section className={styles.panel}>
      <div className={styles.tabs} role='group' aria-label='Show'>
        {(
          [
            ["TODAY", "Today", queue.due.length + queue.fresh.length],
            ["ALL", "Everyone", rows.length],
            ["IMPORT", "Import", null],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            type='button'
            aria-pressed={tab === key}
            className={ui.chip}
            onClick={() => setTab(key)}
          >
            {label}
            {count !== null && <span className={styles.count}>{count}</span>}
          </button>
        ))}
      </div>

      {tab === "TODAY" && (
        <Today
          due={queue.due.map((id) => byId.get(id)).filter((r): r is ProspectView => Boolean(r))}
          fresh={queue.fresh.map((id) => byId.get(id)).filter((r): r is ProspectView => Boolean(r))}
          goal={goal}
          calledToday={calledToday}
          now={now}
          onOpen={(id) => {
            if (!order.includes(id)) setOrder([...queue.due, ...queue.fresh]);
            setOpenId(id);
          }}
          onImport={() => setTab("IMPORT")}
        />
      )}
      {tab === "ALL" && (
        <Everyone
          rows={rows}
          lists={lists}
          now={now}
          onOpen={(id) => {
            setOrder([]);
            setOpenId(id);
          }}
        />
      )}
      {tab === "IMPORT" && <ImportProspects lists={lists} onDone={() => setTab("TODAY")} />}

      <ProspectCard
        prospect={open}
        now={now}
        onClose={() => setOpenId(null)}
        onNext={inQueue ? next : undefined}
      />
    </section>
  );
}

function Today({
  due,
  fresh,
  goal,
  calledToday,
  now,
  onOpen,
  onImport,
}: {
  due: ProspectView[];
  fresh: ProspectView[];
  goal: number;
  calledToday: number;
  now: string;
  onOpen: (id: string) => void;
  onImport: () => void;
}) {
  const { run, pending } = useAction();
  const [editGoal, setEditGoal] = useState(false);
  const [value, setValue] = useState(String(goal));

  return (
    <div className={styles.today}>
      <div className={styles.goal}>
        <div className={styles.goalText}>
          <span className={styles.goalNumber}>
            {calledToday}
            <span className={styles.goalOf}> of {goal} calls today</span>
          </span>
          {editGoal ? (
            <form
              className={styles.goalForm}
              onSubmit={(e) => {
                e.preventDefault();
                run(
                  () => saveGoal(Number(value)),
                  () => {
                    setEditGoal(false);
                    return { message: `Daily goal: ${value} calls` };
                  },
                );
              }}
            >
              <input
                className={ui.input}
                type='number'
                min={1}
                max={200}
                value={value}
                aria-label='Calls a day'
                onChange={(e) => setValue(e.target.value)}
              />
              <button type='submit' className={btn("black", true)} disabled={pending}>
                Save
              </button>
            </form>
          ) : (
            <button type='button' className={btn("light", true)} onClick={() => setEditGoal(true)}>
              Change goal
            </button>
          )}
        </div>
        <Progress value={calledToday} max={goal} label='Calls today' tone={calledToday >= goal ? "lime" : "black"} />
      </div>

      {due.length > 0 && (
        <div className={styles.group}>
          <h2 className={styles.groupTitle}>Call backs and follow-ups</h2>
          <List rows={due} now={now} onOpen={onOpen} showNext />
        </div>
      )}
      {fresh.length > 0 && (
        <div className={styles.group}>
          <h2 className={styles.groupTitle}>New to call</h2>
          <List rows={fresh} now={now} onOpen={onOpen} />
        </div>
      )}
      {!due.length && !fresh.length && (
        <div className={styles.none}>
          <p>Nobody left to call today.</p>
          <button type='button' className={btn("black")} onClick={onImport}>
            Import a list
          </button>
        </div>
      )}
    </div>
  );
}

const CLOSED: ProspectStage[] = ["WON", "LOST", "PARKED", "DO_NOT_CALL"];

const FILTERS: { key: "OPEN" | "ALL" | ProspectStage; label: string }[] = [
  { key: "OPEN", label: "Still working" },
  { key: "ALL", label: "All" },
  ...PROSPECT_STAGES.map((s) => ({ key: s, label: STAGE_LABELS[s] })),
];

function Everyone({
  rows,
  lists,
  now,
  onOpen,
}: {
  rows: ProspectView[];
  lists: string[];
  now: string;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("OPEN");
  const [list, setList] = useState("");

  const counts = useMemo(() => {
    const out: Record<string, number> = { ALL: rows.length, OPEN: 0 };
    for (const r of rows) {
      out[r.stage] = (out[r.stage] ?? 0) + 1;
      if (!CLOSED.includes(r.stage)) out.OPEN++;
    }
    return out;
  }, [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) =>
        filter === "ALL" ? true : filter === "OPEN" ? !CLOSED.includes(r.stage) : r.stage === filter,
      )
      .filter((r) => !list || r.list === list)
      .filter(
        (r) =>
          !q ||
          `${r.business} ${r.contactName} ${r.city} ${r.phone} ${r.website} ${r.email} ${r.tags.join(" ")}`
            .toLowerCase()
            .includes(q),
      );
  }, [rows, query, filter, list]);

  return (
    <div className={styles.everyone}>
      <div className={styles.tools}>
        <label className={styles.search}>
          <span className={ui.srOnly}>Search prospects</span>
          <input
            className={ui.input}
            type='search'
            placeholder='Search by name, city, phone, site or tag'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {lists.length > 1 && (
          <label>
            <span className={ui.srOnly}>List</span>
            <select className={ui.select} value={list} onChange={(e) => setList(e.target.value)}>
              <option value=''>Every list</option>
              {lists.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className={styles.filters} role='group' aria-label='Show'>
        {FILTERS.filter((f) => f.key === "OPEN" || f.key === "ALL" || counts[f.key]).map((f) => (
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
      {shown.length ? (
        <List rows={shown} now={now} onOpen={onOpen} showNext />
      ) : (
        <p className={styles.none}>{rows.length ? "Nobody matches." : "No prospects yet. Import a list to start."}</p>
      )}
    </div>
  );
}

function List({
  rows,
  now,
  onOpen,
  showNext,
}: {
  rows: ProspectView[];
  now: string;
  onOpen: (id: string) => void;
  showNext?: boolean;
}) {
  return (
    <ul className={styles.rows}>
      {rows.map((r) => {
        const late = r.nextAt && r.nextAt < now;
        return (
          <li key={r.id} className={styles.rowWrap}>
            <button type='button' className={styles.row} onClick={() => onOpen(r.id)}>
              <span className={styles.who}>
                <span className={styles.name}>{r.business}</span>
                <span className={styles.sub}>
                  {[
                    [r.city, r.state].filter(Boolean).join(", "),
                    r.rating ? `★ ${r.rating.toFixed(1)}${r.reviews ? ` (${r.reviews})` : ""}` : "",
                    r.website ? r.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : "No website",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className={styles.cell}>
                <Pill tone={stageTone[r.stage]}>{STAGE_LABELS[r.stage]}</Pill>
              </span>
              <span className={styles.cell}>
                {r.lastOutcome
                  ? `${OUTCOME_LABELS[r.lastOutcome]}, ${fmtAgo(r.lastCalledAt!, now)}`
                  : "Not called yet"}
              </span>
              <span className={`${styles.cell} ${late ? styles.late : ""}`}>
                {showNext && r.nextAt ? `${fmtShort(r.nextAt)}, ${fmtTime(r.nextAt)}` : ""}
              </span>
              <Icon name='arrow' className={styles.arrow} />
            </button>
            {r.phone && r.stage !== "DO_NOT_CALL" && (
              <a
                className={styles.call}
                href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}
                aria-label={`Call ${r.business}`}
                onClick={() => onOpen(r.id)}
              >
                <Icon name='phone' />
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
