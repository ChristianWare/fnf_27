"use client";

// What happens when the free leads period ends. The three choices are an
// accordion: opening one also swaps the photo and the colored card beside it.

import { useState } from "react";
import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./AfterThirtyDays.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import Bell from "@/components/shared/icons/Bell/Bell";
import PlatformImg from "../../../../public/images/fullPlatform.jpg";
import LeadsImg from "../../../../public/images/leads.jpg";
import NeitherImg from "../../../../public/images/reliefii.jpg";

const options = [
  {
    id: 1,
    title: "Keep your leads with the Full Platform",
    desc: "The leads tool is included at no extra cost, alongside your website, booking and dispatch, and payments in one system.",
    bullets: [
      "Leads tool included",
      "$499/mo plus $500 one-time setup",
      "No per-booking fees",
    ],
    stat: "$0",
    statLabel: "Extra for the leads tool",
    tag: "Full Platform",
    src: PlatformImg,
    alt: "A laptop on a desk with a globe beside it",
  },
  {
    id: 2,
    title: "Keep the leads tool on its own",
    desc: "Keep the hotels, venues, corporate accounts and events coming for $125/mo, with no website plan needed.",
    bullets: ["$125/mo flat", "No per-lead fees", "Month to month"],
    stat: "$125",
    statLabel: "Per month",
    tag: "Leads tool",
    src: LeadsImg,
    alt: "An operator checking leads on a tablet",
  },
  {
    id: 3,
    title: "Do neither",
    desc: "The free period ends. There's no card on file, so nothing is charged.",
    bullets: ["No card on file", "Nothing charged", "Nothing to cancel"],
    stat: "$0",
    statLabel: "Charged",
    tag: "No plan",
    src: NeitherImg,
    alt: "A smiling operator at his desk",
  },
];

export default function AfterThirtyDays() {
  const [active, setActive] = useState(options[0].id);
  const current = options.find((o) => o.id === active) ?? options[0];

  return (
    <section className={styles.container}>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.topLeft}>
              <EyeBrow text='After 30 days' />
              <h2
                className={styles.heading}
                data-reveal
                data-reveal-style='fade'
              >
                What happens after 30 days
              </h2>
              <p className={styles.copy} data-reveal>
                On day 30 your free period ends, and you choose:
              </p>
            </div>
            <div className={styles.btnContainer} data-reveal>
              <Button
                href='/leads'
                btnType='black'
                text='Get free leads in your city'
                arrow
              />
            </div>
          </div>

          <div className={styles.grid} data-reveal>
            {/* All three photos are stacked; the open choice's fades in. */}
            <div className={styles.photo}>
              {options.map((o) => (
                <Image
                  key={o.id}
                  src={o.src}
                  alt={o.id === active ? o.alt : ""}
                  aria-hidden={o.id !== active}
                  fill
                  sizes='(max-width: 1268px) 1px, 28vw'
                  className={`${styles.img} ${o.id === active ? styles.imgActive : ""}`}
                />
              ))}
            </div>

            <div className={styles.middle}>
              <div
                className={`${styles.stat} ${styles[`tone${current.id}`]}`}
                aria-live='polite'
              >
                <div className={styles.statTop} key={current.id}>
                  <span className={styles.statValue}>{current.stat}</span>
                  <span className={styles.statLabel}>{current.statLabel}</span>
                </div>
                <span className={styles.statTag}>{current.tag}</span>
              </div>
              <div className={styles.note}>
                <Bell className={styles.noteIcon} aria-hidden='true' />
                <p className={styles.noteText}>
                  Five days before the end, your dashboard shows the choice, so
                  it&apos;s never a surprise.
                </p>
              </div>
            </div>

            <div className={styles.options}>
              {options.map((o) => {
                const open = o.id === active;
                return (
                  <div
                    className={`${styles.option} ${open ? styles.optionOpen : ""}`}
                    key={o.id}
                  >
                    <h3 className={styles.optionHeading}>
                      <button
                        type='button'
                        className={styles.optionButton}
                        aria-expanded={open}
                        aria-controls={`after-30-${o.id}`}
                        onClick={() => setActive(o.id)}
                      >
                        <span className={styles.pill}>0{o.id}</span>
                        <span className={styles.optionTitle}>{o.title}</span>
                        <span className={styles.chevron} aria-hidden='true'>
                          <svg viewBox='0 0 24 24' fill='none'>
                            <path
                              d='m6 15 6-6 6 6'
                              stroke='currentColor'
                              strokeWidth='2'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            />
                          </svg>
                        </span>
                      </button>
                    </h3>
                    <div
                      id={`after-30-${o.id}`}
                      role='region'
                      className={styles.panel}
                    >
                      <div className={styles.panelInner}>
                        <p className={styles.desc}>{o.desc}</p>
                        <ul className={styles.bullets}>
                          {o.bullets.map((b) => (
                            <li key={b}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
