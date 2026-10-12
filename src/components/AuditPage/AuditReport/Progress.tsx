"use client";

// The six checks while an audit runs: asks the server every few seconds
// which are done, ticks them off, and redraws the page with the results
// once they're all in.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CheckId, Steps } from "@/lib/audit/types";
import styles from "./AuditReport.module.css";

/** After this long, stop asking and say so. */
const GIVE_UP_MS = 6 * 60 * 1000;

export default function Progress({
  id,
  steps,
  checks,
}: {
  id: string;
  steps: Steps;
  checks: { id: CheckId; name: string }[];
}) {
  const router = useRouter();
  const [state, setState] = useState<Steps>(steps);
  const [seconds, setSeconds] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let stopped = false;
    const started = Date.now();
    const tick = setInterval(
      () => setSeconds(Math.round((Date.now() - started) / 1000)),
      1000,
    );
    async function poll() {
      while (!stopped) {
        await new Promise((r) => setTimeout(r, 2500));
        if (stopped) return;
        if (Date.now() - started > GIVE_UP_MS) {
          setSlow(true);
          return;
        }
        try {
          const res = await fetch(`/audit/report/${id}/status`, {
            cache: "no-store",
          });
          if (!res.ok) continue;
          const data = (await res.json()) as { status: string; steps?: Steps };
          setState(data.steps ?? {});
          if (data.status === "DONE" || data.status === "FAILED") {
            router.refresh();
            return;
          }
        } catch {
          // A dropped connection: try again on the next round.
        }
      }
    }
    void poll();
    return () => {
      stopped = true;
      clearInterval(tick);
    };
  }, [id, router]);

  const done = checks.filter((c) => state[c.id] === "done").length;
  return (
    <div className={styles.progress}>
      <div className={styles.progressTop} aria-live='polite'>
        <span className={styles.label}>
          {done} of {checks.length} checks done
        </span>
        <span className={styles.label}>{seconds}s</span>
      </div>
      <div className={styles.bar} aria-hidden='true'>
        <div
          className={styles.barFill}
          style={{ width: `${Math.max(4, (done / checks.length) * 100)}%` }}
        />
      </div>
      <ul className={styles.steps}>
        {checks.map((c) => {
          const s = state[c.id] ?? "waiting";
          return (
            <li
              key={c.id}
              className={`${styles.step} ${s === "done" ? styles.stepDone : ""}`}
            >
              <span
                className={`${styles.stepMark} ${s === "running" ? styles.spin : ""}`}
                aria-hidden='true'
              >
                {s === "done" ? "✓" : ""}
              </span>
              <span className={styles.stepName}>{c.name}</span>
              <span className={styles.stepState}>
                {s === "done"
                  ? "Done"
                  : s === "running"
                    ? "Checking"
                    : "Waiting"}
              </span>
            </li>
          );
        })}
      </ul>
      {slow && (
        <p className={styles.copy} role='status'>
          This one is taking longer than usual. Reload the page in a minute; the
          report will be here.
        </p>
      )}
    </div>
  );
}
