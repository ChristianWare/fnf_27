// "See a sample report" on the audit page: a real audit with the names
// taken out, its score and the three things costing it the most. Only
// there once an admin has picked one.

import Button from "@/components/shared/Button/Button";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import type { AuditView } from "@/lib/audit/types";
import styles from "./SampleReport.module.css";

export default function SampleReport({ view }: { view: AuditView }) {
  return (
    <section className={styles.container} aria-labelledby='sample-heading'>
      <div className={styles.text}>
        <EyeBrow text='Sample report' />
        <h2 id='sample-heading' className={styles.heading}>
          See a Sample Report
        </h2>
        <p className={styles.copy}>
          {view.business} scored {view.score}/100. Here&apos;s what was costing
          them the most, with the name and anything that could identify them
          taken out.
        </p>
        <div className={styles.btnContainer}>
          <Button
            href='/audit/sample'
            btnType='black'
            text='View the sample report'
            arrow
          />
        </div>
      </div>
      <ol className={styles.list}>
        {view.top.map((item, i) => (
          <li className={styles.item} key={item.id}>
            <span className={styles.number}>0{i + 1}</span>
            <span className={styles.name}>{item.name}</span>
            <span className={styles.found}>{item.found}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
