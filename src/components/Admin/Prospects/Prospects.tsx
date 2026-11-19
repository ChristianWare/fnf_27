"use client";

// Admin → Prospects: today's calls (follow-ups first, then new ones up to
// your daily goal), everyone on your lists, and importing more. Opening
// one goes to their page, where the call is logged.
//
// Tick prospects to delete them, one or many at a time. Coming back from a
// prospect's page puts you where you were: the same tab, search, filters
// and scroll.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { Pill, Progress, btn, ui } from "@/components/Dashboard/ui/ui";
import { useAction } from "@/components/Dashboard/useAction";
import { fmtAgo, fmtShort, fmtTime } from "@/lib/dashboard/format";
import {
  OUTCOME_LABELS,
  PROSPECT_STAGES,
  STAGE_LABELS,
  type ProspectStage,
} from "@/lib/prospects/kinds";
import { deleteProspects, saveGoal } from "@/app/admin/prospects/actions";
import type { ProspectView } from "@/lib/prospects/view";
import ConfirmDialog from "@/components/Dashboard/ConfirmDialog/ConfirmDialog";
import ImportProspects from "./ImportProspects";
import { stageTone } from "./tones";
import styles from "./Prospects.module.css";

export type { ProspectView };

type Tab = "TODAY" | "ALL" | "IMPORT";

const CLOSED: ProspectStage[] = ["WON", "LOST", "PARKED", "DO_NOT_CALL"];

const FILTERS: { key: "OPEN" | "ALL" | ProspectStage; label: string }[] = [
  { key: "OPEN", label: "Still working" },
  { key: "ALL", label: "All" },
  ...PROSPECT_STAGES.map((s) => ({ key: s, label: STAGE_LABELS[s] })),
];

type FilterKey = (typeof FILTERS)[number]["key"];

/* ── Where you were, kept for when you come back from a prospect ── */

const VIEW_KEY = "fnf:prospects:view";

type SavedView = {
  tab: Tab;
  query: string;
  filter: FilterKey;
  market: string;
  scroll: number;
};

function readView(): Partial<SavedView> | null {
  try {
    const raw = sessionStorage.getItem(VIEW_KEY);
    return raw ? (JSON.parse(raw) as Partial<SavedView>) : null;
  } catch {
    return null;
  }
}

function writeView(v: SavedView) {
  try {
    sessionStorage.setItem(VIEW_KEY, JSON.stringify(v));
  } catch {
    // Private mode or storage blocked: the list just opens fresh.
  }
}

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
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(rows.length ? "TODAY" : "IMPORT");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("OPEN");
  const [market, setMarket] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  const restored = useRef(false);

  // Back from a prospect's page: the same tab, search, filters and scroll.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = readView();
    if (!saved) return;
    /* eslint-disable react-hooks/set-state-in-effect -- read once, after
       hydration, from storage the server can't see */
    if (saved.tab && (saved.tab !== "IMPORT" || !rows.length)) setTab(saved.tab);
    if (typeof saved.query === "string") setQuery(saved.query);
    if (saved.filter) setFilter(saved.filter);
    if (typeof saved.market === "string") setMarket(saved.market);
    /* eslint-enable react-hooks/set-state-in-effect */
    const y = Number(saved.scroll) || 0;
    if (y > 0) requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, y)));
  }, [rows.length]);

  /** Remember where we are, then go to their page. */
  const remember = () => writeView({ tab, query, filter, market, scroll: window.scrollY });
  const openPage = (id: string) => {
    remember();
    router.push(`/admin/prospects/${id}`);
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setSelected(new Set());
  };

  const toggle = (id: string) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setMany = (ids: string[], on: boolean) =>
    setSelected((cur) => {
      const next = new Set(cur);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const pick: Picking = {
    selected,
    toggle,
    setMany,
    clear: () => setSelected(new Set()),
    remember,
    openPage,
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
            onClick={() => switchTab(key)}
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
          pick={pick}
          onImport={() => switchTab("IMPORT")}
        />
      )}
      {tab === "ALL" && (
        <Everyone
          rows={rows}
          now={now}
          query={query}
          setQuery={setQuery}
          filter={filter}
          setFilter={setFilter}
          market={market}
          setMarket={setMarket}
          pick={pick}
        />
      )}
      {tab === "IMPORT" && <ImportProspects lists={lists} onDone={() => switchTab("TODAY")} />}
    </section>
  );
}

type Picking = {
  selected: Set<string>;
  toggle: (id: string) => void;
  setMany: (ids: string[], on: boolean) => void;
  clear: () => void;
  /** Keep the list's place before leaving it. */
  remember: () => void;
  openPage: (id: string) => void;
};

function Today({
  due,
  fresh,
  goal,
  calledToday,
  now,
  pick,
  onImport,
}: {
  due: ProspectView[];
  fresh: ProspectView[];
  goal: number;
  calledToday: number;
  now: string;
  pick: Picking;
  onImport: () => void;
}) {
  const { run, pending } = useAction();
  const [editGoal, setEditGoal] = useState(false);
  const [value, setValue] = useState(String(goal));
  const all = [...due, ...fresh];

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

      {all.length > 0 && <SelectBar shown={all} pick={pick} />}

      {due.length > 0 && (
        <div className={styles.group}>
          <h2 className={styles.groupTitle}>Call backs and follow-ups</h2>
          <List rows={due} now={now} pick={pick} showNext />
        </div>
      )}
      {fresh.length > 0 && (
        <div className={styles.group}>
          <h2 className={styles.groupTitle}>New to call</h2>
          <List rows={fresh} now={now} pick={pick} />
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

function Everyone({
  rows,
  now,
  query,
  setQuery,
  filter,
  setFilter,
  market,
  setMarket,
  pick,
}: {
  rows: ProspectView[];
  now: string;
  query: string;
  setQuery: (v: string) => void;
  filter: FilterKey;
  setFilter: (v: FilterKey) => void;
  /** A state code ("AZ"), or "" for every market. */
  market: string;
  setMarket: (v: string) => void;
  pick: Picking;
}) {
  // The states your prospects are in, most first.
  const markets = useMemo(() => {
    const n = new Map<string, number>();
    for (const r of rows) {
      const st = r.state.trim().toUpperCase();
      if (st) n.set(st, (n.get(st) ?? 0) + 1);
    }
    return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [rows]);

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
      .filter((r) => !market || r.state.trim().toUpperCase() === market)
      .filter(
        (r) =>
          !q ||
          `${r.business} ${r.contactName} ${r.city} ${r.phone} ${r.website} ${r.email} ${r.tags.join(" ")}`
            .toLowerCase()
            .includes(q),
      );
  }, [rows, query, filter, market]);

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
        {markets.length > 0 && (
          <label>
            <span className={ui.srOnly}>Market</span>
            <select className={ui.select} value={market} onChange={(e) => setMarket(e.target.value)}>
              <option value=''>Every market</option>
              {markets.map(([st, count]) => (
                <option key={st} value={st}>
                  {st} ({count})
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
        <>
          <SelectBar shown={shown} pick={pick} />
          <List rows={shown} now={now} pick={pick} showNext />
        </>
      ) : (
        <p className={styles.none}>{rows.length ? "Nobody matches." : "No prospects yet. Import a list to start."}</p>
      )}
    </div>
  );
}

/** Select all of what's shown, and delete what's ticked. Only ticked
 *  prospects that are still shown are deleted, so a search can't hide one. */
function SelectBar({ shown, pick }: { shown: ProspectView[]; pick: Picking }) {
  const { run, pending } = useAction();
  const ids = shown.map((r) => r.id);
  const picked = ids.filter((id) => pick.selected.has(id));
  const all = picked.length === ids.length && ids.length > 0;
  const some = picked.length > 0 && !all;
  const boxRef = useRef<HTMLInputElement>(null);
  // Who's being deleted, kept while the dialog closes so it doesn't change
  // under you.
  const [asking, setAsking] = useState(false);
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    if (boxRef.current) boxRef.current.indeterminate = some;
  }, [some]);

  const remove = () =>
    run(
      () => deleteProspects(picked),
      (n) => {
        setAsking(false);
        pick.clear();
        const count = n ?? picked.length;
        return {
          message: count === 1 ? `Deleted ${names[0]}` : `Deleted ${count} prospects`,
        };
      },
    );

  // The dialog sits outside the sticky bar, so it isn't caught under it.
  return (
    <>
      <div className={`${styles.selectBar} ${picked.length ? styles.selectBarOn : ""}`}>
        <label className={styles.selectAll}>
          <input
            ref={boxRef}
            type='checkbox'
            className={styles.checkInput}
            checked={all}
            onChange={() => pick.setMany(ids, !all)}
          />
          <span className={styles.checkBox} aria-hidden='true'>
            <Icon name={some ? "close" : "check"} />
          </span>
          <span className={styles.selectText}>
            {picked.length ? `${picked.length} selected` : `Select all ${ids.length}`}
          </span>
        </label>
        {picked.length > 0 && (
          <div className={styles.selectActions}>
            <button type='button' className={btn("light", true)} onClick={pick.clear} disabled={pending}>
              Clear
            </button>
            <button
              type='button'
              className={`${btn("black", true)} ${styles.deleteBtn}`}
              onClick={() => {
                setNames(shown.filter((r) => pick.selected.has(r.id)).map((r) => r.business));
                setAsking(true);
              }}
              disabled={pending}
            >
              <Icon name='trash' className={styles.btnIcon} />
              Delete {picked.length === 1 ? "1 prospect" : `${picked.length} prospects`}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={asking}
        tone='danger'
        icon='trash'
        title={names.length === 1 ? `Delete ${names[0]}?` : `Delete ${names.length} prospects?`}
        text={`${names.length === 1 ? "Their timeline and preview go" : "Their timelines and previews go"} too, and this can't be undone. An account someone signed up for stays.`}
        items={names.length > 1 ? names : undefined}
        confirmLabel={names.length === 1 ? "Delete" : `Delete ${names.length} prospects`}
        cancelLabel='Keep them'
        pendingLabel='Deleting…'
        pending={pending}
        onConfirm={remove}
        onClose={() => setAsking(false)}
      />
    </>
  );
}

function List({
  rows,
  now,
  pick,
  showNext,
}: {
  rows: ProspectView[];
  now: string;
  pick: Picking;
  showNext?: boolean;
}) {
  return (
    <ul className={styles.rows}>
      {rows.map((r) => {
        const late = r.nextAt && r.nextAt < now;
        const on = pick.selected.has(r.id);
        return (
          <li key={r.id} className={`${styles.rowWrap} ${on ? styles.rowPicked : ""}`}>
            <label className={styles.pickBox}>
              <input
                type='checkbox'
                className={styles.checkInput}
                checked={on}
                onChange={() => pick.toggle(r.id)}
                aria-label={`Select ${r.business}`}
              />
              <span className={styles.checkBox} aria-hidden='true'>
                <Icon name='check' />
              </span>
            </label>
            <Link href={`/admin/prospects/${r.id}`} className={styles.row} onClick={pick.remember}>
              <span className={styles.who}>
                <span className={styles.nameRow}>
                  <span className={styles.name}>{r.business}</span>
                  {r.preview && (
                    <span className={`${styles.previewTag} ${styles[`preview_${r.preview.state}`]}`}>
                      <Icon name='sparkle' className={styles.previewIcon} />
                      {r.preview.state === "opened"
                        ? `Preview opened${r.preview.views > 1 ? ` · ${r.preview.views} views` : ""}`
                        : r.preview.state === "sent"
                          ? "Preview sent"
                          : "Preview made, not sent"}
                    </span>
                  )}
                </span>
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
            </Link>
            {r.phone && r.stage !== "DO_NOT_CALL" ? (
              <a
                className={styles.call}
                href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}
                aria-label={`Call ${r.business}`}
                onClick={() => pick.openPage(r.id)}
              >
                <Icon name='phone' />
              </a>
            ) : (
              <span className={styles.callSpace} aria-hidden='true' />
            )}
          </li>
        );
      })}
    </ul>
  );
}
