"use client";

// What each plan gets you. The four plans are an accordion: opening one also
// swaps the photo and the two cards beside it (a colored stat card and a
// black note card). At 868px and below, the photo and cards move inside the
// open plan.

import { useState } from "react";
import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./PlanDetails.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import Speedometer from "@/components/shared/icons/Speedometer/Speedometer";
import Bell from "@/components/shared/icons/Bell/Bell";
import Lock from "@/components/shared/icons/Lock/Lock";
import Payment from "@/components/shared/icons/Payment/Payment";
import AuditImg from "../../../../public/images/audit.jpg";
import LeadsImg from "../../../../public/images/leads.jpg";
import WebsiteImg from "../../../../public/images/websiteOnly.jpg";
import PlatformImg from "../../../../public/images/fullPlatform.jpg";

const options = [
  {
    id: 1,
    title: "Free Website Audit",
    desc: "See what's costing you bookings: how you show up on Google, how your site works on a phone, whether riders can book you online, and whether AI search can read you.",
    bullets: [
      "Score out of 100, in 60 seconds",
      "Your top three fixes, ranked",
      "Full report as a PDF, if you want it",
    ],
    stat: "60 sec",
    statLabel: "To see your score",
    tag: "Free website audit",
    note: "No card, and no email needed to see your score.",
    NoteIcon: Speedometer,
    src: AuditImg,
    alt: "An operator in a suit checking his phone",
  },
  {
    id: 2,
    title: "Leads Tool",
    desc: "Hotels, wedding and event venues, corporate travel managers and funeral homes in your market, each with the decision-maker's contact and an outreach script written for that business.",
    bullets: [
      "Free for the first 30 days, no card",
      "Then $125/mo, or included with the Full Platform",
      "No per-lead fees",
    ],
    stat: "30 days",
    statLabel: "Free, no card",
    tag: "Leads tool",
    note: "Five days before your free period ends, your dashboard shows your options, so it's never a surprise.",
    NoteIcon: Bell,
    src: LeadsImg,
    alt: "An operator at his desk with a tablet",
  },
  {
    id: 3,
    title: "Website Only",
    desc: "A custom site built for the searches your riders make: airport, route, corporate and wedding pages, and a page for every city you serve. It works with the booking software you already use.",
    bullets: [
      "$199/mo plus $500 one-time setup",
      "SEO foundation, hosting and edits included",
      "Upgrade to the Full Platform anytime, no rebuild",
    ],
    stat: "3 weeks",
    statLabel: "Typical time to launch",
    tag: "Website Only",
    note: "Your domain and your phone number stay yours, on every plan.",
    NoteIcon: Lock,
    src: WebsiteImg,
    alt: "Someone typing on a laptop",
  },
  {
    id: 4,
    title: "Full Platform",
    desc: "Your website and your booking and dispatch software in one system: direct booking, driver and admin portals, flight tracking and payments, with the leads tool included.",
    bullets: [
      "$499/mo plus $500 one-time setup",
      "Leads tool included",
      "No per-booking fees",
    ],
    stat: "$0",
    statLabel: "Per-booking fees",
    tag: "Full Platform",
    note: "Card payments go through your own Stripe account, at Stripe's standard rates.",
    NoteIcon: Payment,
    src: PlatformImg,
    alt: "A laptop on a desk with a globe beside it",
  },
];

export default function PlanDetails() {
  const [active, setActive] = useState(options[0].id);
  const current = options.find((o) => o.id === active) ?? options[0];

  return (
    <section className={styles.container}>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.topLeft}>
              <EyeBrow text='What you get' />
              <h2
                className={styles.heading}
                data-reveal
                data-reveal-style='fade'
              >
                What Each Plan <br /> Gets You
              </h2>
              <p className={styles.copy} data-reveal>
                Four ways to start. Pick one to see what it includes:
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
            {/* All four photos are stacked; the open plan's fades in. */}
            <div className={styles.photo}>
              {options.map((o) => (
                <Image
                  key={o.id}
                  src={o.src}
                  alt={o.id === active ? o.alt : ""}
                  aria-hidden={o.id !== active}
                  fill
                  sizes='(max-width: 868px) 1px, (max-width: 1068px) 36vw, 28vw'
                  className={`${styles.img} ${o.id === active ? styles.imgActive : ""}`}
                />
              ))}
            </div>

            <div className={styles.middle} aria-live='polite'>
              <div className={`${styles.stat} ${styles[`tone${current.id}`]}`}>
                <div className={styles.statTop} key={current.id}>
                  <span className={`${styles.statValue} h2`}>
                    {current.stat}
                  </span>
                  <span className={styles.statLabel}>{current.statLabel}</span>
                </div>
                <span className={styles.statTag}>{current.tag}</span>
              </div>
              <div className={styles.note}>
                <div className={styles.noteInner} key={current.id}>
                  <current.NoteIcon
                    className={styles.noteIcon}
                    aria-hidden='true'
                  />
                  <p className={styles.noteText}>{current.note}</p>
                </div>
              </div>
            </div>

            <div className={styles.options}>
              {options.map(({ NoteIcon, ...o }) => {
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
                        aria-controls={`plan-${o.id}`}
                        onClick={() => setActive(o.id)}
                      >
                        <span className={styles.pill}>0{o.id}</span>
                        <span className={`${styles.optionTitle} h5`}>
                          {o.title}
                        </span>
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
                      id={`plan-${o.id}`}
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

                        {/* Shown at 868px and below, inside the open plan. */}
                        <div className={styles.inlineMedia}>
                          <div className={styles.inlineCards}>
                            <div
                              className={`${styles.stat} ${styles[`tone${o.id}`]}`}
                            >
                              <div className={styles.statTop}>
                                <span className={styles.statValue}>
                                  {o.stat}
                                </span>
                                <span className={styles.statLabel}>
                                  {o.statLabel}
                                </span>
                              </div>
                              <span className={styles.statTag}>{o.tag}</span>
                            </div>
                            <div className={styles.note}>
                              <NoteIcon
                                className={styles.noteIcon}
                                aria-hidden='true'
                              />
                              <p className={styles.noteText}>{o.note}</p>
                            </div>
                          </div>
                          <div className={styles.inlinePhoto}>
                            <Image
                              src={o.src}
                              alt={o.alt}
                              fill
                              sizes='(max-width: 868px) 92vw, 1px'
                              className={styles.img}
                            />
                          </div>
                        </div>
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
