// The four numbers, two by two: the label in the top-left corner, the
// number in the bottom-right.

import styles from "./ProjectDetails.module.css";
import type { Stat } from "@/lib/projects";

export default function ProjectStats({ stats }: { stats: Stat[] }) {
  return (
    <dl className={styles.stats}>
      {stats.map((stat) => (
        <div className={styles.stat} key={stat.label} data-reveal='each'>
          <dt className={styles.statLabel}>
            {stat.label.split("\n").map((line, i) => (
              <span className={styles.statLine} key={i}>
                {line}
              </span>
            ))}
          </dt>
          <dd className={styles.statValue}>{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}
