"use client";

// Everything behind a client's Growth page: where the numbers come from,
// their 12-month plan, this month's notes and their weekly habits.
// SAMPLE: saves show a toast and last until you reload.

import { useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { Pill, ui } from "@/components/Dashboard/ui/ui";
import { fmtMonth, fmtMonthLong } from "@/lib/dashboard/format";
import type { Growth } from "@/lib/dashboard/types";
import styles from "./Client.module.css";

const STANDARD = [
  100, 150, 250, 400, 600, 900, 1300, 1800, 2400, 3100, 4000, 5000,
];

export default function GrowthSetup({
  growth,
  domain,
  live,
  firstName,
  now,
}: {
  growth?: Growth;
  domain: string;
  live: boolean;
  firstName: string;
  now: string;
}) {
  const toast = useToast();
  const [sources, setSources] = useState({
    plausible: live ? domain : "",
    searchConsole: live ? `sc-domain:${domain}` : "",
    business: live ? "locations/1129 4880 3321" : "",
    place: live ? "ChIJ…" : "",
  });
  const [targets, setTargets] = useState<number[]>(
    growth?.months.map((m) => m.target) ?? STANDARD,
  );
  const [notes, setNotes] = useState<string[]>(
    growth?.notes.length ? growth.notes : [""],
  );
  const [habits, setHabits] = useState(
    growth?.habits.map((h) => h.text) ?? [
      "Ask three riders for a Google review",
      "Post one photo to your Google profile",
    ],
  );

  const sourceFields: {
    key: keyof typeof sources;
    label: string;
    help: string;
  }[] = [
    { key: "plausible", label: "Plausible site", help: "Visitors from search" },
    {
      key: "searchConsole",
      label: "Search Console property",
      help: "Searches and positions",
    },
    {
      key: "business",
      label: "Google Business Profile",
      help: "Calls from Google",
    },
    { key: "place", label: "Google Place ID", help: "Reviews and rating" },
  ];
  const connected = sourceFields.filter((f) => sources[f.key].trim()).length;

  return (
    <div className={styles.split}>
      <div className={styles.column}>
        {!live && (
          <div className={ui.notice}>
            <Icon name='info' className={ui.noticeIcon} />
            <p>
              {firstName}&apos;s Growth page opens on launch day. Set it up now
              so the numbers start flowing the moment the site goes live.
            </p>
          </div>
        )}

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div className={styles.titles}>
              <h2 className={styles.heading}>Where the numbers come from</h2>
              <p>
                Pulled every night. Nothing to do once they&apos;re connected.
              </p>
            </div>
            <Pill
              tone={connected === sourceFields.length ? "lime" : "yellow"}
              dot
            >
              {connected} of {sourceFields.length} connected
            </Pill>
          </div>
          <div className={styles.sources}>
            {sourceFields.map((field) => (
              <label key={field.key} className={styles.source}>
                <span className={styles.sourceTop}>
                  <span className={ui.label}>{field.label}</span>
                  <span
                    className={`${styles.status} ${sources[field.key].trim() ? styles.statusOn : ""}`}
                  >
                    {sources[field.key].trim() ? "Connected" : "Not set"}
                  </span>
                </span>
                <input
                  className={ui.input}
                  value={sources[field.key]}
                  onChange={(e) =>
                    setSources((s) => ({ ...s, [field.key]: e.target.value }))
                  }
                  placeholder={field.help}
                />
                <span className={styles.sourceHelp}>{field.help}</span>
              </label>
            ))}
          </div>
          <div className={styles.actions}>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              onClick={() =>
                toast("Connections saved", {
                  detail: "The next nightly pull uses them.",
                })
              }
            >
              Save connections
            </button>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div className={styles.titles}>
              <h2 className={styles.heading}>
                {firstName}&apos;s 12-month plan
              </h2>
              <p>
                Visitors from search each month. The dotted line on their chart.
              </p>
            </div>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
              onClick={() => {
                setTargets(STANDARD);
                toast("Back to the standard plan", { tone: "info" });
              }}
            >
              Use the standard plan
            </button>
          </div>
          <div className={styles.targets}>
            {targets.map((target, i) => (
              <label key={i} className={styles.target}>
                <span className={ui.monoMuted}>
                  {growth?.months[i]
                    ? fmtMonth(growth.months[i].month)
                    : `Month ${i + 1}`}
                </span>
                <input
                  className={ui.input}
                  inputMode='numeric'
                  value={String(target)}
                  onChange={(e) => {
                    const value =
                      Number(e.target.value.replace(/\D/g, "")) || 0;
                    setTargets((t) => t.map((x, j) => (j === i ? value : x)));
                  }}
                  aria-label={`Target for month ${i + 1}`}
                />
              </label>
            ))}
          </div>
          <div className={styles.actions}>
            <span className={styles.help}>
              By month 12: {targets[11]?.toLocaleString("en-US")} visitors a
              month.
            </span>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              onClick={() =>
                toast("Plan saved", {
                  detail: `${firstName}'s chart updates tonight.`,
                })
              }
            >
              Save plan
            </button>
          </div>
        </section>
      </div>

      <div className={styles.column}>
        <section className={styles.card}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>
              What moved in {fmtMonthLong(now).split(" ")[0]}
            </h2>
            <p>
              Three or four lines in plain words. They show on {firstName}
              &apos;s Growth page.
            </p>
          </div>
          <ol className={styles.editList}>
            {notes.map((note, i) => (
              <li key={i} className={styles.editRow}>
                <textarea
                  className={`${ui.textarea} ${styles.shortArea}`}
                  value={note}
                  onChange={(e) =>
                    setNotes((n) =>
                      n.map((x, j) => (j === i ? e.target.value : x)),
                    )
                  }
                  placeholder='e.g. Your Sky Harbor page moved from #7 to #3.'
                  aria-label={`Note ${i + 1}`}
                />
                <button
                  type='button'
                  className={styles.remove}
                  onClick={() => setNotes((n) => n.filter((_, j) => j !== i))}
                  aria-label={`Remove note ${i + 1}`}
                >
                  <Icon name='trash' />
                </button>
              </li>
            ))}
          </ol>
          <div className={styles.actions}>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
              onClick={() => setNotes((n) => [...n, ""])}
            >
              Add a line
              <Icon name='plus' className={ui.btnIcon} />
            </button>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              disabled={!notes.some((n) => n.trim())}
              onClick={() =>
                toast("Notes published", {
                  detail: `They're on ${firstName}'s Growth page now.`,
                })
              }
            >
              Publish
              <Icon name='send' className={ui.btnIcon} />
            </button>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>Weekly habits</h2>
            <p>
              {firstName}&apos;s part. A checklist on their Growth page each
              week.
            </p>
          </div>
          <ol className={styles.editList}>
            {habits.map((habit, i) => (
              <li key={i} className={styles.editRow}>
                <input
                  className={ui.input}
                  value={habit}
                  onChange={(e) =>
                    setHabits((h) =>
                      h.map((x, j) => (j === i ? e.target.value : x)),
                    )
                  }
                  aria-label={`Habit ${i + 1}`}
                />
                <button
                  type='button'
                  className={styles.remove}
                  onClick={() => setHabits((h) => h.filter((_, j) => j !== i))}
                  aria-label={`Remove habit ${i + 1}`}
                >
                  <Icon name='trash' />
                </button>
              </li>
            ))}
          </ol>
          <div className={styles.actions}>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
              onClick={() => setHabits((h) => [...h, ""])}
            >
              Add a habit
              <Icon name='plus' className={ui.btnIcon} />
            </button>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              onClick={() => toast("Habits saved")}
            >
              Save habits
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
