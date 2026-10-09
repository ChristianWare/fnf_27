// A row of headline numbers under a page's title. A tone colors the tile
// when the number needs a look: yellow waiting, red failed, lime good.

import styles from "./Stats.module.css";

export type Stat = {
  label: string;
  value: string;
  note?: string;
  tone?: "black" | "lime" | "yellow" | "red" | "mint" | "purple";
};

export default function Stats({ items }: { items: Stat[] }) {
  return (
    <dl className={styles.stats}>
      {items.map((stat) => (
        <div
          key={stat.label}
          className={`${styles.stat} ${stat.tone ? styles[stat.tone] : ""}`}
        >
          <dt className={styles.label}>{stat.label}</dt>
          <dd className={styles.value}>{stat.value}</dd>
          {stat.note && <dd className={styles.note}>{stat.note}</dd>}
        </div>
      ))}
    </dl>
  );
}
