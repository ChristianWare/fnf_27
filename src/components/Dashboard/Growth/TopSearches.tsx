"use client";

// The searches that brought the most visitors for the dates picked, and
// how each one moved against the same number of days before. Fetched as
// the dates change; the last answer stays up, dimmed, until the new one
// is in.

import { useEffect, useState } from "react";
import Icon from "../icons";
import styles from "./Growth.module.css";
import type { TopSearch } from "@/lib/growth/load";

const n = (value: number) => value.toLocaleString("en-US");

type Answer = { key: string; searches?: TopSearch[]; error?: string };

export default function TopSearches({
  from,
  to,
  span,
}: {
  from: string;
  to: string;
  /** "Mar 23 – Oct 6, 2026", for the subtitle. */
  span: string;
}) {
  const key = `${from}|${to}`;
  const [answer, setAnswer] = useState<Answer>();

  useEffect(() => {
    const controller = new AbortController();
    // A short pause, so flicking through the tabs asks once.
    const timer = setTimeout(() => {
      fetch(`/api/growth/searches?from=${from}&to=${to}`, {
        signal: controller.signal,
        cache: "no-store",
      })
        .then(async (res) => {
          const body = (await res.json().catch(() => ({}))) as {
            searches?: TopSearch[];
            error?: string;
          };
          setAnswer(
            res.ok
              ? { key, searches: body.searches ?? [] }
              : {
                  key,
                  error: body.error ?? "The searches didn't load. Try again.",
                },
          );
        })
        .catch((error: unknown) => {
          if ((error as { name?: string })?.name === "AbortError") return;
          setAnswer({
            key,
            error: "The searches didn't load. Check your connection.",
          });
        });
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [from, to, key]);

  const loading = answer?.key !== key;
  const rows = answer?.searches;

  return (
    <section className={styles.panel} aria-busy={loading}>
      <div className={styles.titles}>
        <h2 className={styles.heading}>Searches that bring riders</h2>
        <p>What people typed into Google before they visited, {span}.</p>
      </div>

      {answer?.error && !loading ? (
        <p className={styles.searchNote}>{answer.error}</p>
      ) : !rows ? (
        <p className={styles.searchNote}>Loading the searches…</p>
      ) : rows.length === 0 ? (
        <p className={styles.searchNote}>
          No searches to show for these dates yet. Google leaves out searches
          only a few people make, so a new site often shows only a handful.
        </p>
      ) : (
        <>
          <div className={`${styles.tableWrap} ${loading ? styles.stale : ""}`}>
            <table className={styles.table}>
              <colgroup>
                <col />
                <col className={styles.colPos} />
                <col className={styles.colChange} />
                <col className={styles.colVisits} />
              </colgroup>
              <thead>
                <tr>
                  <th scope='col'>Search</th>
                  <th scope='col' className={styles.cellPos}>
                    Position
                  </th>
                  <th scope='col'>Change</th>
                  <th scope='col'>Visitors</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((q) => (
                  <tr key={q.query}>
                    <td className={styles.query}>
                      <span className={styles.queryText} title={q.query}>
                        {q.query}
                      </span>
                      {/* On a phone the position sits under the search. */}
                      <span className={styles.queryPos}>
                        #{q.position.toFixed(1)}
                      </span>
                    </td>
                    <td className={styles.cellPos}>
                      <span className={styles.position}>
                        #{q.position.toFixed(1)}
                      </span>
                    </td>
                    <td>
                      {q.isNew ? (
                        <span className={styles.fresh}>New</span>
                      ) : q.change !== undefined && q.change >= 0.5 ? (
                        <span
                          className={styles.up}
                          aria-label={`Up ${q.change.toFixed(1)} places`}
                        >
                          <Icon name='arrowUpRight' />
                          {q.change.toFixed(1)}
                        </span>
                      ) : q.change !== undefined && q.change <= -0.5 ? (
                        <span
                          className={styles.down}
                          aria-label={`Down ${Math.abs(q.change).toFixed(1)} places`}
                        >
                          <Icon name='arrowUpRight' />
                          {Math.abs(q.change).toFixed(1)}
                        </span>
                      ) : q.change !== undefined ? (
                        <span className={styles.flat}>Same</span>
                      ) : (
                        <span
                          className={styles.flat}
                          aria-label='Nothing to compare with yet'
                        >
                          –
                        </span>
                      )}
                    </td>
                    <td>{n(q.clicks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.searchNote}>
            From Google Search Console. Google leaves out searches only a few
            people make, so these add up to less than your total.
          </p>
        </>
      )}
    </section>
  );
}
