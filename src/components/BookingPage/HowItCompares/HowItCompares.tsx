"use client";

// How the Full Platform compares with a booking marketplace and standalone
// dispatch software, in the same table as the pricing page's comparison.

import { useState, type KeyboardEvent } from "react";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./HowItCompares.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";

// Each column has its own color: the accent on its head and a lighter
// version on the cells under it. The Full Platform stays black, the same
// as in the pricing page's comparison.
const options = [
  {
    id: "marketplace",
    name: "Booking marketplaces",
    featured: false,
    tone: styles.toneOne,
  },
  {
    id: "dispatch",
    name: "Standalone dispatch software",
    featured: false,
    tone: styles.toneTwo,
  },
  {
    id: "platform",
    name: "Fonts & Footers Full Platform",
    featured: true,
    tone: styles.toneFeatured,
  },
];

// The tabs open on the Full Platform, the column the table highlights.
const DEFAULT_OPTION = options.findIndex((option) => option.featured);

// One value per column, in the same order as the options above.
const rows: { label: string; values: string[] }[] = [
  {
    label: "Fee model",
    values: [
      "A fee or commission on every booking",
      "A monthly subscription, often tiered by trips or users",
      "Flat $499/mo",
    ],
  },
  {
    label: "Who owns the customer",
    values: ["Usually the platform", "You", "You"],
  },
  {
    label: "Website included",
    values: [
      "No; you're listed on their site",
      "Usually sold separately",
      "Yes, built in",
    ],
  },
  {
    label: "Your name at checkout",
    values: ["Theirs", "Yours, often in a widget", "Yours"],
  },
];

export default function HowItCompares() {
  const [selected, setSelected] = useState(DEFAULT_OPTION);
  const option = options[selected];

  // Left and right arrow keys move between the tabs.
  function onTabKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    let next = selected;
    if (e.key === "ArrowRight") next = (selected + 1) % options.length;
    else if (e.key === "ArrowLeft")
      next = (selected - 1 + options.length) % options.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    else return;
    e.preventDefault();
    setSelected(next);
    document.getElementById(`compares-tab-${options[next].id}`)?.focus();
  }

  return (
    <section className={styles.container} aria-labelledby='how-it-compares'>
      <Reveal mode='together' />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <EyeBrow text='How it compares' />
            <h2
              id='how-it-compares'
              className={styles.heading}
              data-reveal
              data-reveal-style='fade'
            >
              The Full Platform, <br /> Next to the Alternatives
            </h2>
          </div>

          {/* Wide screens: the full table. */}
          <div className={styles.tableWrap} data-reveal>
            <table className={styles.table}>
              <caption className={styles.srOnly}>
                How the Full Platform compares with booking marketplaces and
                standalone dispatch software
              </caption>
              <thead>
                <tr>
                  <td className={styles.corner} />
                  {options.map((o) => (
                    <th
                      key={o.id}
                      scope='col'
                      className={`${styles.planHead} ${o.tone} ${o.featured ? styles.featuredHead : ""}`}
                    >
                      {o.name}
                      {o.featured && (
                        <span className={styles.badge}>
                          No per-booking fees
                        </span>
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
                        key={options[i].id}
                        className={`${styles.cell} ${options[i].tone}`}
                      >
                        <span className={styles.text}>{value}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 968px and below: one column at a time. */}
          <div className={styles.mobile} data-reveal>
            <div
              className={styles.tabs}
              role='tablist'
              aria-label='Choose an option to see how it compares'
            >
              {options.map((o, i) => (
                <button
                  key={o.id}
                  type='button'
                  role='tab'
                  id={`compares-tab-${o.id}`}
                  aria-selected={i === selected}
                  aria-controls='compares-panel'
                  tabIndex={i === selected ? 0 : -1}
                  className={`${styles.tab} ${i === selected ? styles.tabActive : ""}`}
                  onClick={() => setSelected(i)}
                  onKeyDown={onTabKeyDown}
                >
                  {o.name}
                </button>
              ))}
            </div>

            <div
              className={`${styles.panel} ${option.tone} ${option.featured ? styles.panelFeatured : ""}`}
              role='tabpanel'
              id='compares-panel'
              aria-labelledby={`compares-tab-${option.id}`}
            >
              <div className={styles.panelHead}>
                <span className={styles.panelName}>{option.name}</span>
                {option.featured && (
                  <span className={styles.panelBadge}>No per-booking fees</span>
                )}
              </div>
              {/* Re-mounts on every tab change, which replays the fade. */}
              <dl className={styles.list} key={option.id}>
                {rows.map((row) => (
                  <div className={styles.listRow} key={row.label}>
                    <dt className={`${styles.listLabel} h6`}>{row.label}</dt>
                    <dd className={styles.listValue}>
                      <span className={styles.text}>
                        {row.values[selected]}
                      </span>
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
