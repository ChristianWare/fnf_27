"use client";

// The sites and apps that sent the most visitors for the dates picked, and
// the pages those visitors landed on first. Fetched as the dates change;
// the last answer stays up, dimmed, until the new one is in.

import { useEffect, useState } from "react";
import styles from "./Growth.module.css";
import type { TopVisit } from "@/lib/growth/load";

const n = (value: number) => value.toLocaleString("en-US");

type Answer = {
  key: string;
  sources?: TopVisit[];
  pages?: TopVisit[];
  error?: string;
};

/** Plausible's "Direct / None" is people who came straight to the site. */
const sourceName = (name: string) =>
  /^direct\s*\/\s*none$/i.test(name) ? "Direct" : name;

const pageName = (page: string) => (page === "/" ? "Home page" : page);

export default function VisitDetails({
  from,
  to,
  span,
  site,
}: {
  from: string;
  to: string;
  /** "Mar 23 – Oct 8, 2026", for the subtitles. */
  span: string;
  /** Their site's address, to open a page from the list. */
  site?: string;
}) {
  const key = `${from}|${to}`;
  const [answer, setAnswer] = useState<Answer>();

  useEffect(() => {
    const controller = new AbortController();
    // A short pause, so flicking through the tabs asks once.
    const timer = setTimeout(() => {
      fetch(`/api/growth/visits?from=${from}&to=${to}`, {
        signal: controller.signal,
        cache: "no-store",
      })
        .then(async (res) => {
          const body = (await res.json().catch(() => ({}))) as {
            sources?: TopVisit[];
            pages?: TopVisit[];
            error?: string;
          };
          setAnswer(
            res.ok
              ? { key, sources: body.sources ?? [], pages: body.pages ?? [] }
              : { key, error: body.error ?? "These didn't load. Try again." },
          );
        })
        .catch((error: unknown) => {
          if ((error as { name?: string })?.name === "AbortError") return;
          setAnswer({
            key,
            error: "These didn't load. Check your connection.",
          });
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [from, to, key]);

  const loading = answer?.key !== key;

  const list = (rows: TopVisit[] | undefined, kind: "sources" | "pages") => {
    if (answer?.error && !loading)
      return <p className={styles.searchNote}>{answer.error}</p>;
    if (!rows) return <p className={styles.searchNote}>Loading…</p>;
    if (!rows.length)
      return (
        <p className={styles.searchNote}>Nobody came in these dates yet.</p>
      );
    const most = Math.max(...rows.map((r) => r.visitors), 1);
    return (
      <ol className={`${styles.ranks} ${loading ? styles.stale : ""}`}>
        {rows.map((r) => {
          const name =
            kind === "sources" ? sourceName(r.name) : pageName(r.name);
          const href =
            kind === "pages" && site && r.name.startsWith("/")
              ? `${site}${r.name}`
              : undefined;
          return (
            <li key={r.name} className={styles.rank}>
              <span className={styles.rankRow}>
                {href ? (
                  <a
                    href={href}
                    target='_blank'
                    rel='noopener noreferrer'
                    className={`${styles.rankName} ${styles.rankLink}`}
                    title={r.name}
                  >
                    {name}
                  </a>
                ) : (
                  <span className={styles.rankName} title={r.name}>
                    {name}
                  </span>
                )}
                <span className={styles.rankValue}>{n(r.visitors)}</span>
              </span>
              <span className={styles.rankTrack} aria-hidden='true'>
                <span
                  className={styles.rankFill}
                  style={{ width: `${(r.visitors / most) * 100}%` }}
                />
              </span>
            </li>
          );
        })}
      </ol>
    );
  };

  return (
    <div className={styles.split}>
      <section className={styles.panel} aria-busy={loading}>
        <div className={styles.titles}>
          <h2 className={styles.heading}>Sites and apps that sent them</h2>
          <p>Visitors from each, {span}.</p>
        </div>
        {list(answer?.sources, "sources")}
      </section>
      <section className={styles.panel} aria-busy={loading}>
        <div className={styles.titles}>
          <h2 className={styles.heading}>Pages people land on</h2>
          <p>The first page they saw, {span}.</p>
        </div>
        {list(answer?.pages, "pages")}
      </section>
    </div>
  );
}
