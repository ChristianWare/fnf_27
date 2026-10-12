"use client";

// Running audits from the admin. One operator: their website (or business
// name and city), "is this their listing?" if Google has more than one,
// then their audit's page. A list: one per line, run one after another
// while this page stays open, for a calling session or to check the
// scoring against operators you know.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { btn, ui } from "@/components/Dashboard/ui/ui";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import {
  adminPickListing,
  adminRunOne,
  adminStartAudit,
} from "@/app/admin/audits/actions";
import type { Candidate } from "@/lib/audit/start";
import styles from "./Audits.module.css";

type Line = {
  text: string;
  state: "waiting" | "running" | "done" | "failed";
  id?: string;
  score?: number | null;
  note?: string;
};

/** "azlimo.com", "azlimo.com, Phoenix, AZ" or "Better Line Limo, Phoenix, AZ". */
function parseLine(line: string) {
  const parts = line.split(/\s*[,|\t]\s*/).filter(Boolean);
  if (parts.length >= 3)
    return {
      site: parts.slice(0, -2).join(", "),
      city: parts.slice(-2).join(", "),
    };
  return { site: line.trim(), city: "" };
}

export default function RunAudit({
  services,
}: {
  services: { name: string; on: boolean; note: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<"one" | "list">("one");
  const [site, setSite] = useState("");
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<{
    id: string;
    candidates: Candidate[];
    askCity: boolean;
  } | null>(null);
  const [text, setText] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const running = lines.some(
    (l) => l.state === "running" || l.state === "waiting",
  );

  async function startOne() {
    setBusy(true);
    try {
      const result = await adminStartAudit(site, city);
      if (!result.ok) {
        toast(result.error, { tone: "error" });
        return;
      }
      const data = result.data!;
      if (data.next === "pick")
        setPick({
          id: data.id,
          candidates: data.candidates,
          askCity: data.askCity,
        });
      else router.push(`/admin/audits/${data.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function choose(choice: {
    placeId?: string;
    city?: string;
    notOnGoogle?: boolean;
  }) {
    if (!pick) return;
    setBusy(true);
    try {
      const result = await adminPickListing(pick.id, choice);
      if (!result.ok) {
        toast(result.error, { tone: "error" });
        return;
      }
      router.push(`/admin/audits/${pick.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function runList() {
    const todo = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 50);
    if (!todo.length) return;
    const start: Line[] = todo.map((t) => ({ text: t, state: "waiting" }));
    setLines(start);
    for (let i = 0; i < todo.length; i++) {
      setLines((all) =>
        all.map((l, j) => (j === i ? { ...l, state: "running" } : l)),
      );
      const { site: s, city: c } = parseLine(todo[i]);
      try {
        const result = await adminRunOne(s, c);
        setLines((all) =>
          all.map((l, j) =>
            j === i
              ? result.ok
                ? {
                    ...l,
                    state: "done",
                    id: result.data?.id,
                    score: result.data?.score,
                    note: result.data?.note,
                  }
                : { ...l, state: "failed", note: result.error }
              : l,
          ),
        );
      } catch {
        setLines((all) =>
          all.map((l, j) =>
            j === i
              ? {
                  ...l,
                  state: "failed",
                  note: "It stopped. Try that one on its own.",
                }
              : l,
          ),
        );
      }
    }
    router.refresh();
  }

  return (
    <section className={styles.panel} aria-label='Run an audit'>
      <div className={styles.panelHead}>
        <div>
          <h2 className={styles.panelTitle}>Run an audit</h2>
          <p className={styles.panelText}>
            Nothing is emailed to the operator, and the report opens unlocked,
            so you can text them the link. About a minute each.
          </p>
        </div>
        <div className={styles.tabs} role='group' aria-label='How many'>
          <button
            type='button'
            className={ui.chip}
            aria-pressed={mode === "one"}
            onClick={() => setMode("one")}
          >
            One operator
          </button>
          <button
            type='button'
            className={ui.chip}
            aria-pressed={mode === "list"}
            onClick={() => setMode("list")}
          >
            A list
          </button>
        </div>
      </div>

      {mode === "one" ? (
        pick ? (
          <div className={styles.list}>
            <span className={ui.label}>
              {pick.candidates.length
                ? "Which Google listing is theirs?"
                : "No Google listing found. Their city?"}
            </span>
            {pick.candidates.length > 0 && (
              <ul className={styles.candidates}>
                {pick.candidates.map((c) => (
                  <li key={c.placeId}>
                    <button
                      type='button'
                      className={styles.candidate}
                      disabled={busy}
                      onClick={() => choose({ placeId: c.placeId })}
                    >
                      <span className={styles.candidateName}>{c.name}</span>
                      <span className={styles.candidateSub}>
                        {[c.address, `${c.reviews} reviews`, c.website]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className={styles.runRow}>
              <label className={ui.field}>
                <span className={ui.label}>City, if none of these</span>
                <input
                  className={ui.input}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder='Phoenix, AZ'
                />
              </label>
              <span />
              <button
                type='button'
                className={btn("light")}
                disabled={busy}
                onClick={() => choose({ city })}
              >
                Run without a listing
              </button>
            </div>
            <button
              type='button'
              className={btn("outline", true)}
              onClick={() => setPick(null)}
              disabled={busy}
            >
              Start over
            </button>
          </div>
        ) : (
          <form
            className={styles.runRow}
            onSubmit={(e) => {
              e.preventDefault();
              void startOne();
            }}
          >
            <label className={ui.field}>
              <span className={ui.label}>Website, or business name</span>
              <input
                className={ui.input}
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder='azlimo.com'
              />
            </label>
            <label className={ui.field}>
              <span className={ui.label}>City (for a name)</span>
              <input
                className={ui.input}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder='Phoenix, AZ'
              />
            </label>
            <button
              type='submit'
              className={btn("black")}
              disabled={busy || site.trim().length < 3}
            >
              {busy ? "Starting…" : "Run the audit"}
            </button>
          </form>
        )
      ) : (
        <div className={styles.list}>
          <label className={ui.field}>
            <span className={ui.label}>
              One per line: a website, or a business name with its city
            </span>
            <textarea
              className={`${ui.textarea} ${styles.listInput}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                "azlimo.com\nstate48limo.com\nBetter Line Limo, Livermore, CA"
              }
              disabled={running}
            />
          </label>
          <div className={styles.actions}>
            <button
              type='button'
              className={btn("black")}
              onClick={() => void runList()}
              disabled={running || !text.trim()}
            >
              {running ? "Running… keep this page open" : "Run them all"}
            </button>
            <span className={ui.monoMuted}>
              Up to 50. Where Google has more than one listing, the first is
              used and flagged.
            </span>
          </div>
          {lines.length > 0 && (
            <ul className={styles.listRows}>
              {lines.map((l, i) => (
                <li key={i} className={styles.listRow}>
                  <span>{l.text}</span>
                  <span>
                    {l.state === "done" && l.id ? (
                      <Link
                        href={`/admin/audits/${l.id}`}
                        className={btn("light", true)}
                      >
                        {l.score ?? "–"}/100
                      </Link>
                    ) : (
                      <span className={ui.monoMuted}>
                        {l.state === "running"
                          ? "Running…"
                          : l.state === "waiting"
                            ? "Waiting"
                            : "Didn't run"}
                      </span>
                    )}
                  </span>
                  {l.note && <span className={styles.listNote}>{l.note}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className={styles.services}>
        <span className={ui.monoMuted}>Connected:</span>
        {services.map((s) => (
          <span key={s.name} className={ui.monoMuted} title={s.note}>
            {s.on ? "●" : "○"} {s.name}
          </span>
        ))}
      </div>
    </section>
  );
}
