"use client";

import { useState } from "react";
import { useLenis } from "lenis/react";
import Icon from "../icons";
import { Progress, ui } from "../ui/ui";
import { useAction } from "../useAction";
import styles from "./Questionnaire.module.css";
import { saveAnswers, submitQuestionnaire } from "@/app/dashboard/actions";
import {
  isAnswered,
  type Question,
  type QuestionSection,
} from "@/lib/dashboard/questionnaire";
import { fmtDate } from "@/lib/dashboard/format";
import type { Answers } from "@/lib/dashboard/types";

export default function Questionnaire({
  sections,
  initialAnswers,
  submittedAt,
  initialSection,
}: {
  sections: QuestionSection[];
  initialAnswers: Answers;
  submittedAt?: string;
  initialSection?: string;
}) {
  const lenis = useLenis();
  const { run, pending } = useAction();
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [active, setActive] = useState(() =>
    Math.max(
      0,
      sections.findIndex((section) => section.id === initialSection),
    ),
  );
  const [sent, setSent] = useState(submittedAt);
  const [status, setStatus] = useState<"idle" | "dirty" | "saved">("idle");

  const section = sections[active];
  const all = sections.flatMap((s) => s.questions);
  const answered = all.filter((q) => isAnswered(answers[q.id])).length;
  const missing = all.filter((q) => q.required && !isAnswered(answers[q.id]));

  const sectionDone = (s: QuestionSection) =>
    s.questions.every((q) => !q.required || isAnswered(answers[q.id]));

  const set = (id: string, value: string | string[]) => {
    setAnswers((current) => ({ ...current, [id]: value }));
    setStatus("dirty");
  };

  const save = (message = "Answers saved") => {
    const snapshot = answers;
    setStatus("saved");
    run(
      () => saveAnswers(snapshot),
      () => ({ message }),
      () => setStatus("dirty"),
    );
  };

  const go = (index: number) => {
    setActive(index);
    if (status === "dirty") save();
    const top = document.getElementById("questionnaire-top");
    if (top) {
      if (lenis) lenis.scrollTo(top, { offset: -12 });
      else top.scrollIntoView({ behavior: "smooth" });
    }
  };

  const field = (q: Question) => {
    const value = answers[q.id];
    const label = (
      <span className={ui.label}>
        {q.label}
        {q.required && <span className={ui.required}> · Required</span>}
      </span>
    );

    if (q.type === "choice" || q.type === "multi") {
      const selected = Array.isArray(value) ? value : value ? [value] : [];
      return (
        <fieldset key={q.id} className={styles.fieldset}>
          <legend className={styles.legend}>{label}</legend>
          {q.help && <p className={ui.help}>{q.help}</p>}
          <div className={ui.chips}>
            {q.options?.map((option) => {
              const on = selected.includes(option);
              return (
                <button
                  key={option}
                  type='button'
                  className={ui.chip}
                  aria-pressed={on}
                  onClick={() => {
                    if (q.type === "choice") set(q.id, on ? "" : option);
                    else
                      set(
                        q.id,
                        on
                          ? selected.filter((item) => item !== option)
                          : [...selected, option],
                      );
                  }}
                >
                  {on && <Icon name='check' />}
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>
      );
    }

    return (
      <label key={q.id} className={ui.field}>
        {label}
        {q.help && <p className={ui.help}>{q.help}</p>}
        {q.type === "textarea" ? (
          <textarea
            className={ui.textarea}
            value={typeof value === "string" ? value : ""}
            placeholder={q.placeholder}
            onChange={(e) => set(q.id, e.target.value)}
          />
        ) : (
          <input
            className={ui.input}
            type={q.type}
            value={typeof value === "string" ? value : ""}
            placeholder={q.placeholder}
            onChange={(e) => set(q.id, e.target.value)}
          />
        )}
      </label>
    );
  };

  const last = active === sections.length - 1;

  return (
    <div className={styles.layout} id='questionnaire-top'>
      <aside className={styles.side}>
        <div className={styles.sideInner}>
          <div className={styles.overall}>
            <div className={styles.overallRow}>
              <span className={ui.mono}>Your answers</span>
              <span className={ui.monoMuted}>
                {answered} of {all.length}
              </span>
            </div>
            <Progress
              value={answered}
              max={all.length}
              label='Questions answered'
              tone='lime'
            />
          </div>
          <ol className={styles.sections}>
            {sections.map((s, index) => {
              const done = sectionDone(s);
              return (
                <li key={s.id}>
                  <button
                    type='button'
                    className={`${styles.sectionBtn} ${index === active ? styles.sectionActive : ""}`}
                    aria-current={index === active ? "step" : undefined}
                    onClick={() => go(index)}
                  >
                    <span
                      className={`${styles.num} ${done ? styles.numDone : ""}`}
                    >
                      {done ? <Icon name='check' /> : index + 1}
                    </span>
                    <span className={styles.sectionText}>
                      <span className={styles.sectionTitle}>{s.title}</span>
                      <span className={styles.sectionCount}>
                        {
                          s.questions.filter((q) => isAnswered(answers[q.id]))
                            .length
                        }
                        /{s.questions.length} answered
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </aside>

      <section className={styles.panel}>
        {sent && (
          <div className={ui.notice}>
            <Icon name='check' className={ui.noticeIcon} />
            <p>
              Sent {fmtDate(sent)}. You can still change answers until we start
              the build, and we&apos;ll see every change.
            </p>
          </div>
        )}

        <div className={styles.sectionHead}>
          <span className={ui.monoMuted}>
            Section {active + 1} of {sections.length}
          </span>
          <h2 className={styles.sectionHeading}>{section.title}</h2>
          <p>{section.intro}</p>
        </div>

        <div className={styles.fields}>{section.questions.map(field)}</div>

        <div className={styles.foot}>
          <div className={styles.footLeft}>
            {active > 0 && (
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_light}`}
                onClick={() => go(active - 1)}
              >
                Back
              </button>
            )}
            {status === "dirty" && (
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_outline}`}
                onClick={() => save()}
              >
                Save
              </button>
            )}
          </div>

          {last ? (
            sent ? (
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_black}`}
                onClick={() =>
                  save("Changes saved. Chris will see them before the build.")
                }
                disabled={status !== "dirty"}
              >
                Save changes
              </button>
            ) : (
              <div className={styles.send}>
                {missing.length > 0 && (
                  <p className={styles.missing}>
                    {missing.length} required question
                    {missing.length === 1 ? "" : "s"} to go
                  </p>
                )}
                <button
                  type='button'
                  className={`${ui.btn} ${ui.btn_black}`}
                  disabled={missing.length > 0 || pending}
                  onClick={() =>
                    run(
                      () => submitQuestionnaire(answers),
                      (data) => {
                        setSent(data?.submittedAt ?? new Date().toISOString());
                        setStatus("saved");
                        return {
                          message: "Questionnaire sent",
                          detail:
                            "Thank you. Chris reads it before writing your blueprint.",
                        };
                      },
                    )
                  }
                >
                  Send questionnaire
                  <Icon name='send' className={ui.btnIcon} />
                </button>
              </div>
            )
          ) : (
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black}`}
              onClick={() => go(active + 1)}
            >
              Next: {sections[active + 1].title}
              <Icon name='arrow' className={ui.btnIcon} />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
