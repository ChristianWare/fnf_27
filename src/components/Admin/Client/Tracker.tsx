"use client";

// The build, step by step, from your side: what's yours to do, what's
// waiting on the client, and buttons to move it along. Marking a client's
// step done covers the times they send something by email instead.
// SAMPLE: changes last until you reload.

import { useState } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "@/components/Dashboard/icons";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { Pill, ui } from "@/components/Dashboard/ui/ui";
import { fmtShort } from "@/lib/dashboard/format";
import type { Step } from "@/lib/dashboard/helpers";
import styles from "./Client.module.css";

export default function Tracker({
  steps,
  business,
  firstName,
}: {
  steps: Step[];
  business: string;
  firstName: string;
}) {
  const toast = useToast();
  const [done, setDone] = useState<Record<string, string | null>>({});
  const [launching, setLaunching] = useState(false);

  const isDone = (step: Step) =>
    step.id in done ? done[step.id] !== null : step.state === "done";
  const doneAt = (step: Step) =>
    step.id in done ? done[step.id] : step.doneAt;
  const count = steps.filter(isDone).length;

  const mark = (step: Step, value: boolean) => {
    setDone((d) => ({
      ...d,
      [step.id]: value ? new Date().toISOString() : null,
    }));
    toast(value ? `Done: ${step.title}` : `Reopened: ${step.title}`, {
      tone: value ? "success" : "info",
    });
  };

  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.titles}>
          <h2 className={styles.heading}>The build</h2>
          <p>
            {count} of {steps.length} steps done.
          </p>
        </div>
        <div className={styles.trackerBar} aria-hidden='true'>
          {steps.map((step) => (
            <span
              key={step.id}
              className={`${styles.trackerSeg} ${isDone(step) ? styles.trackerDone : step.state === "us" ? styles.trackerUs : step.state === "you" ? styles.trackerYou : ""}`}
            />
          ))}
        </div>
      </div>

      <ol className={styles.steps}>
        {steps.map((step, index) => {
          const finished = isDone(step);
          const state = finished ? "done" : step.state;
          const ours = step.owner === "us";
          return (
            <li
              key={step.id}
              className={`${styles.step} ${styles[`step_${state}`]}`}
            >
              <span className={styles.stepMarker} aria-hidden='true'>
                {finished ? <Icon name='check' /> : index + 1}
              </span>
              <span className={styles.stepText}>
                <span className={styles.stepTitle}>{step.title}</span>
                <span className={styles.stepMeta}>
                  {ours ? "You" : firstName}
                  {finished && doneAt(step)
                    ? ` · Done ${fmtShort(doneAt(step)!)}`
                    : ""}
                </span>
              </span>
              <span className={styles.stepState}>
                {state === "us" && (
                  <Pill tone='purple' dot>
                    Your turn
                  </Pill>
                )}
                {state === "you" && (
                  <Pill tone='yellow' dot>
                    Waiting on {firstName}
                  </Pill>
                )}
              </span>
              <span className={styles.stepAction}>
                {finished ? (
                  <button
                    type='button'
                    className={styles.undo}
                    onClick={() => mark(step, false)}
                  >
                    Undo
                  </button>
                ) : step.id === "launch" && state === "us" ? (
                  <button
                    type='button'
                    className={`${ui.btn} ${ui.btn_lime} ${ui.btnSmall}`}
                    onClick={() => setLaunching(true)}
                  >
                    Launch
                    <Icon name='globe' className={ui.btnIcon} />
                  </button>
                ) : state === "us" ? (
                  <button
                    type='button'
                    className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
                    onClick={() => mark(step, true)}
                  >
                    Mark done
                  </button>
                ) : state === "you" ? (
                  <button
                    type='button'
                    className={`${ui.btn} ${ui.btn_outline} ${ui.btnSmall}`}
                    onClick={() => mark(step, true)}
                    title={`If ${firstName} sent it another way`}
                  >
                    Mark done for them
                  </button>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>

      <Modal isOpen={launching} onClose={() => setLaunching(false)}>
        <div className={ui.modalBody}>
          <span className={ui.monoMuted}>Launch day</span>
          <h2 className={ui.modalTitle}>Put {business} live?</h2>
          <p className={styles.help}>
            This marks the site live, opens change requests and the Growth page
            for {firstName}, and starts growth tracking. Point the domain first.
          </p>
          <div className={ui.modalActions}>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light}`}
              onClick={() => setLaunching(false)}
            >
              Not yet
            </button>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black}`}
              onClick={() => {
                const launch = steps.find((s) => s.id === "launch");
                setLaunching(false);
                if (launch) {
                  setDone((d) => ({ ...d, launch: new Date().toISOString() }));
                }
                toast(`${business} is live`, {
                  detail: `${firstName} has been emailed the good news.`,
                });
              }}
            >
              Launch
              <Icon name='globe' className={ui.btnIcon} />
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
