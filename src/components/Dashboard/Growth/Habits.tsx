"use client";

import { useState } from "react";
import Icon from "../icons";
import { Progress } from "../ui/ui";
import { useAction } from "../useAction";
import styles from "./Growth.module.css";
import { toggleHabit } from "@/app/dashboard/actions";
import type { Growth } from "@/lib/dashboard/types";

/** The client's side of the plan: a few small things, every week. */
export default function Habits({
  habits,
  week,
  initialDone,
}: {
  habits: Growth["habits"];
  /** The Monday this week started, e.g. "2026-10-05". */
  week: string;
  initialDone: string[];
}) {
  const { run } = useAction();
  const [done, setDone] = useState<string[]>(initialDone);

  const toggle = (id: string) => {
    const before = done;
    setDone((list) =>
      list.includes(id) ? list.filter((item) => item !== id) : [...list, id],
    );
    run(
      () => toggleHabit(id, week),
      (ids) => {
        if (ids) setDone(ids);
      },
      () => setDone(before),
    );
  };

  return (
    <section className={styles.panel}>
      <div className={styles.titles}>
        <h2 className={styles.heading}>Your part this week</h2>
        <p>
          Small habits that move your numbers more than anything we do alone.
        </p>
      </div>
      <div className={styles.habitProgress}>
        <Progress
          value={done.length}
          max={habits.length}
          label='Habits done this week'
          tone='lime'
        />
        <span className={styles.habitCount}>
          {done.length}/{habits.length}
        </span>
      </div>
      <ul className={styles.habits}>
        {habits.map((habit) => {
          const checked = done.includes(habit.id);
          return (
            <li key={habit.id}>
              <button
                type='button'
                role='checkbox'
                aria-checked={checked}
                className={`${styles.habit} ${checked ? styles.habitDone : ""}`}
                onClick={() => toggle(habit.id)}
              >
                <span className={styles.box}>
                  {checked && <Icon name='check' />}
                </span>
                <span className={styles.habitText}>
                  <span className={styles.habitTitle}>{habit.text}</span>
                  <p>{habit.detail}</p>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
