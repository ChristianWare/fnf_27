import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./ComparePlans.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";

const plans = [
  { id: "free", name: "Free leads tool", featured: false },
  { id: "website", name: "Website Only", featured: false },
  { id: "platform", name: "Full Platform", featured: true },
  { id: "leads", name: "Leads on its own", featured: false },
];

// true = Included, false = Not included, text = shown as written.
// { yes, note } = Included, with a note.
type Value = boolean | string | { yes: true; note: string };

const rows: { label: string; values: Value[] }[] = [
  {
    label: "Price",
    values: ["$0 for 30 days", "$199/mo", "$499/mo", "$125/mo"],
  },
  {
    label: "Setup",
    values: ["None", "$500 one time", "$500 one time", "None"],
  },
  {
    label: "Leads tool",
    values: [{ yes: true, note: "For 30 days" }, false, true, true],
  },
  { label: "Custom website", values: [false, true, true, false] },
  {
    label: "SEO foundation and rider-search pages",
    values: [false, true, true, false],
  },
  { label: "Hosting and edits", values: [false, true, true, false] },
  { label: "Direct booking and dispatch", values: [false, false, true, false] },
  { label: "Driver and admin portals", values: [false, false, true, false] },
  {
    label: "Flight tracking and payments",
    values: [false, false, true, false],
  },
  { label: "Per-booking fees", values: ["None", "None", "None", "None"] },
];

function Check() {
  return (
    <span className={styles.check}>
      <svg viewBox='0 0 24 24' fill='none' aria-hidden='true'>
        <path
          d='m5 12.5 4.5 4.5L19 7.5'
          stroke='currentColor'
          strokeWidth='2.4'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </span>
  );
}

function Cell({ value }: { value: Value }) {
  if (value === true) {
    return (
      <>
        <Check />
        <span className={styles.srOnly}>Included</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <span className={styles.dash} aria-hidden='true' />
        <span className={styles.srOnly}>Not included</span>
      </>
    );
  }
  if (typeof value === "object") {
    return (
      <span className={styles.withNote}>
        <Check />
        <span>
          <span className={styles.srOnly}>Included, </span>
          {value.note}
        </span>
      </span>
    );
  }
  return <span className={styles.text}>{value}</span>;
}

export default function ComparePlans() {
  return (
    <section className={styles.container} id='compare'>
      <Reveal mode='together' />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <EyeBrow text='Compare plans' />
            <h2 className={styles.heading} data-reveal data-reveal-style='fade'>
              Every plan, side by side.
            </h2>
          </div>

          <div className={styles.tableWrap} data-reveal>
            <table className={styles.table}>
              <caption className={styles.srOnly}>
                What each Fonts &amp; Footers plan includes
              </caption>
              <thead>
                <tr>
                  <td className={styles.corner} />
                  {plans.map((plan) => (
                    <th
                      key={plan.id}
                      scope='col'
                      className={`${styles.planHead} ${plan.featured ? styles.featuredHead : ""}`}
                    >
                      {plan.name}
                      {plan.featured && (
                        <span className={styles.badge}>Leads included</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <th scope='row' className={styles.rowLabel}>
                      {row.label}
                    </th>
                    {row.values.map((value, i) => (
                      <td
                        key={plans[i].id}
                        className={plans[i].featured ? styles.featuredCell : ""}
                      >
                        <Cell value={value} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.scrollHint} aria-hidden='true'>
            Swipe to see every plan
          </p>
        </div>
      </LayoutWrapper>
    </section>
  );
}
