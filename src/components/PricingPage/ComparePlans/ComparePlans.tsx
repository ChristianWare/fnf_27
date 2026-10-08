"use client";

import { useState, type KeyboardEvent } from "react";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./ComparePlans.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";

// Each column has its own color: the accent on its head and a lighter
// version on the cells under it. The Full Platform stays black, like its
// card.
const plans = [
  {
    id: "audit",
    name: "Free Website Audit",
    featured: false,
    tone: styles.toneOne,
  },
  { id: "leads", name: "Leads Tool", featured: false, tone: styles.toneTwo },
  {
    id: "website",
    name: "Website Only",
    featured: false,
    tone: styles.toneThree,
  },
  {
    id: "platform",
    name: "Full Platform",
    featured: true,
    tone: styles.toneFeatured,
  },
];

// The tabs open on the Full Platform, the plan the table highlights.
const DEFAULT_PLAN = plans.findIndex((plan) => plan.featured);

// true = Included, false = Not included, text = shown as written.
// { yes, note } = Included, with a note.
// { text, note } = Text, with a small note under it.
type Value =
  | boolean
  | string
  | { yes: true; note: string }
  | { text: string; note: string };

// One value per plan, in the same order as the plans above.
const rows: { label: string; values: Value[] }[] = [
  {
    label: "Price",
    values: [
      "Free",
      { text: "$125/mo", note: "Free for the first 30 days" },
      "$199/mo",
      "$499/mo",
    ],
  },
  {
    label: "Setup",
    values: ["None", "None", "$500 one time", "$500 one time"],
  },
  {
    label: "Website audit",
    values: [{ yes: true, note: "Results in 60 seconds" }, true, true, true],
  },
  { label: "Leads tool", values: [false, true, false, true] },
  { label: "Custom website", values: [false, false, true, true] },
  {
    label: "SEO foundation and rider-search pages",
    values: [false, false, true, true],
  },
  { label: "Hosting and edits", values: [false, false, true, true] },
  { label: "Direct booking and dispatch", values: [false, false, false, true] },
  { label: "Driver and admin portals", values: [false, false, false, true] },
  {
    label: "Flight tracking and payments",
    values: [false, false, false, true],
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
  if (typeof value === "object" && "text" in value) {
    return (
      <span className={styles.textWithNote}>
        <span className={styles.text}>{value.text}</span>
        <span className={styles.cellNote}>{value.note}</span>
      </span>
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
  const [selected, setSelected] = useState(DEFAULT_PLAN);
  const plan = plans[selected];

  // Left and right arrow keys move between the tabs.
  function onTabKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    let next = selected;
    if (e.key === "ArrowRight") next = (selected + 1) % plans.length;
    else if (e.key === "ArrowLeft")
      next = (selected - 1 + plans.length) % plans.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = plans.length - 1;
    else return;
    e.preventDefault();
    setSelected(next);
    document.getElementById(`compare-tab-${plans[next].id}`)?.focus();
  }

  return (
    <section className={styles.container} id='compare'>
      <Reveal mode='together' />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <EyeBrow text='Compare plans' />
            <h2 className={styles.heading} data-reveal data-reveal-style='fade'>
              Every Plan <br /> Side by Side
            </h2>
          </div>

          {/* Wide screens: the full table. */}
          <div className={styles.tableWrap} data-reveal>
            <table className={styles.table}>
              <caption className={styles.srOnly}>
                What each Fonts &amp; Footers plan includes
              </caption>
              <thead>
                <tr>
                  <td className={styles.corner} />
                  {plans.map((p) => (
                    <th
                      key={p.id}
                      scope='col'
                      className={`${styles.planHead} ${p.tone} ${p.featured ? styles.featuredHead : ""}`}
                    >
                      {p.name}
                      {p.featured && (
                        <span className={styles.badge}>Leads included</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <th scope='row' className={`${styles.rowLabel} subHeading`}>
                      {row.label}
                    </th>
                    {row.values.map((value, i) => (
                      <td
                        key={plans[i].id}
                        className={`${styles.cell} ${plans[i].tone}`}
                      >
                        <Cell value={value} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 968px and below: one plan at a time. */}
          <div className={styles.mobile} data-reveal>
            <div
              className={styles.tabs}
              role='tablist'
              aria-label='Choose a plan to see what it includes'
            >
              {plans.map((p, i) => (
                <button
                  key={p.id}
                  type='button'
                  role='tab'
                  id={`compare-tab-${p.id}`}
                  aria-selected={i === selected}
                  aria-controls='compare-panel'
                  tabIndex={i === selected ? 0 : -1}
                  className={`${styles.tab} ${i === selected ? styles.tabActive : ""}`}
                  onClick={() => setSelected(i)}
                  onKeyDown={onTabKeyDown}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <div
              className={`${styles.panel} ${plan.tone} ${plan.featured ? styles.panelFeatured : ""}`}
              role='tabpanel'
              id='compare-panel'
              aria-labelledby={`compare-tab-${plan.id}`}
            >
              <div className={styles.panelHead}>
                <span className={styles.panelName}>{plan.name}</span>
                {plan.featured && (
                  <span className={styles.panelBadge}>Leads included</span>
                )}
              </div>
              {/* Re-mounts on every tab change, which replays the fade. */}
              <dl className={styles.list} key={plan.id}>
                {rows.map((row) => (
                  <div className={styles.listRow} key={row.label}>
                    <dt className={`${styles.listLabel} h6`}>{row.label}</dt>
                    <dd className={styles.listValue}>
                      <Cell value={row.values[selected]} />
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
