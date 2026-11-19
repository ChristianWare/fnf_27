"use client";

// Admin → Previews: every demo site made for a prospect. Who opened theirs,
// who hasn't yet, and which are about to run out, so the morning's
// follow-up calls are obvious. Each row opens the prospect's page.

import Link from "next/link";
import { useMemo, useState } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "@/components/Dashboard/icons";
import { Pill, btn, ui } from "@/components/Dashboard/ui/ui";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { daysBetween, fmtAgo, fmtShort } from "@/lib/dashboard/format";
import { previewText, type PreviewStatus, type PreviewView } from "@/lib/demos/preview";
import { STATUS_LABEL, statusTone } from "./status";
import styles from "./Previews.module.css";

type Filter = "ALL" | PreviewStatus;

/** "Yesterday" → "yesterday" mid-sentence; "Nov 9" stays as it is. */
const inSentence = (s: string) =>
  /^(Yesterday|Just now)/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "NOT_OPENED", label: "Not opened yet" },
  { key: "OPENED", label: "Opened" },
  { key: "EXPIRING", label: "Expiring soon" },
  { key: "EXPIRED", label: "Expired" },
];

export type PickProspect = {
  id: string;
  business: string;
  place: string;
};

export default function Previews({ rows, now }: { rows: PreviewView[]; now: string }) {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const out: Record<string, number> = { ALL: rows.length };
    for (const r of rows) out[r.status] = (out[r.status] ?? 0) + 1;
    return out;
  }, [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => filter === "ALL" || r.status === filter)
      .filter((r) => !q || `${r.business} ${r.contactName} ${r.market} ${r.url}`.toLowerCase().includes(q));
  }, [rows, filter, query]);

  const copyText = async (r: PreviewView) => {
    try {
      await navigator.clipboard.writeText(previewText(r));
      toast("Text copied", { detail: `For ${r.contactName || r.business}` });
    } catch {
      toast("Couldn't copy. Open their page and copy it there.", { tone: "error" });
    }
  };

  return (
    <section className={styles.listPanel}>
      <div className={styles.tools}>
        <label className={styles.search}>
          <span className={ui.srOnly}>Search previews</span>
          <input
            className={ui.input}
            type='search'
            placeholder='Search by business, contact or market'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className={styles.filters} role='group' aria-label='Show'>
        {FILTERS.map((f) => (
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
        <ul className={styles.rows}>
          {shown.map((r) => {
            const left = daysBetween(now, r.expiresAt);
            return (
              <li key={r.id} className={styles.rowWrap}>
                <Link href={`/admin/prospects/${r.prospectId}`} className={styles.listRow}>
                  <span className={styles.who}>
                    <span className={styles.name}>{r.business}</span>
                    <span className={styles.sub}>
                      {r.market} · {r.url.replace(/^https:\/\//, "")}
                    </span>
                  </span>
                  <span className={styles.cell}>
                    <Pill tone={statusTone[r.status]} dot>
                      {STATUS_LABEL[r.status]}
                    </Pill>
                  </span>
                  <span className={styles.cell}>
                    {r.views
                      ? `Opened ${r.views}×, last ${inSentence(fmtAgo(r.lastSeenAt!, now))}`
                      : `Made ${inSentence(fmtAgo(r.createdAt, now))}`}
                  </span>
                  <span className={`${styles.cell} ${r.live && left <= 5 && left >= 0 ? styles.soon : ""}`}>
                    {!r.live || left < 0
                      ? `Ended ${fmtShort(r.expiresAt < now ? r.expiresAt : now)}`
                      : `${left} day${left === 1 ? "" : "s"} left`}
                  </span>
                  <Icon name='arrow' className={styles.arrow} />
                </Link>
                <button
                  type='button'
                  className={styles.rowBtn}
                  aria-label={`Copy the text for ${r.business}`}
                  onClick={() => copyText(r)}
                >
                  <Icon name='copy' />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.none}>{rows.length ? "Nothing matches." : "No previews yet."}</p>
      )}
    </section>
  );
}

/** "New preview": pick who it's for, then the form. */
export function NewPreview({ prospects }: { prospects: PickProspect[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return prospects
      .filter((p) => !q || `${p.business} ${p.place}`.toLowerCase().includes(q))
      .slice(0, 40);
  }, [prospects, query]);

  return (
    <>
      <button type='button' className={btn("black")} onClick={() => setOpen(true)}>
        New preview
        <Icon name='plus' className={styles.btnIcon} />
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} label='New preview'>
        <div className={ui.modalBody}>
          <h2 className={ui.modalTitle}>Who is it for?</h2>
          <p className={styles.muted}>
            Every preview belongs to a prospect, so their visits show on their page.
          </p>
          <label className={ui.field}>
            <span className={ui.srOnly}>Search prospects</span>
            <input
              className={ui.input}
              type='search'
              autoFocus
              placeholder='Search your prospects'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {shown.length ? (
            <ul className={styles.pickList}>
              {shown.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/prospects/${p.id}/preview`} className={styles.pick}>
                    <span className={styles.who}>
                      <span className={styles.name}>{p.business}</span>
                      {p.place && <span className={styles.sub}>{p.place}</span>}
                    </span>
                    <Icon name='arrow' className={styles.arrow} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.muted}>Nobody matches.</p>
          )}
          <p className={styles.muted}>
            Not on your list?{" "}
            <Link href='/admin/prospects' className={styles.inlineLink}>
              Add them on Prospects
            </Link>{" "}
            first.
          </p>
        </div>
      </Modal>
    </>
  );
}
