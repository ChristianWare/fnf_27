"use client";

// "Which one do I need?": the three problems we fix, one at a time, over a
// background video. The arrows (and the left and right arrow keys, once the
// panel has focus) move between them. Every problem is in the page, so
// search engines read all three.

import { useState, type KeyboardEvent } from "react";
import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./WhichOne.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Design from "@/components/shared/icons/Design/Design";
import Platform from "@/components/shared/icons/Platform/Platform";
import LeadsIcon from "@/components/shared/icons/LeadsIcon/LeadsIcon";
import WhichOneVideo from "./WhichOneVideo";

const problems = [
  {
    id: 1,
    problem: "You're not showing up on Google",
    fix: "Websites",
    price: "From $199/mo + $500 setup",
    href: "/services/websites",
    link: "See websites",
    Icon: Design,
  },
  {
    id: 2,
    problem: "Clients can't book online, or you pay a fee on every booking",
    fix: "Booking software (the Full Platform)",
    price: "$499/mo + $500 setup, leads tool included",
    href: "/services/booking-software",
    link: "See booking software",
    Icon: Platform,
  },
  {
    id: 3,
    problem: "Slow months, and no corporate accounts",
    fix: "Leads",
    price: "Free for 30 days, then included with $499 or $125/mo",
    href: "/services/leads",
    link: "See the leads tool",
    Icon: LeadsIcon,
  },
];

export default function WhichOne() {
  const [active, setActive] = useState(0);
  const count = problems.length;

  const go = (delta: number) =>
    setActive((current) => (current + delta + count) % count);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
    else return;
    e.preventDefault();
  }

  return (
    <section className={styles.container} aria-labelledby='which-one-heading'>
      <Reveal />
      <WhichOneVideo />

      <LayoutWrapper paddingNSNone='paddingNSNone'>
        <div className={styles.content}>
          <div className={styles.left}>
            <div className={styles.leftTop}>
              <EyeBrow text='Which one do I need?' color='white' />
              <h2
                id='which-one-heading'
                className={`${styles.heading} h3`}
                data-reveal
                data-reveal-style='fade'
              >
                Start with the problem you have.
              </h2>
            </div>
            <div className={styles.leftBottom} data-reveal>
              <p className={styles.note}>
                Not sure which problem is costing you most? Run a free website
                audit. It takes 60 seconds and shows where you stand.
              </p>
              <Button
                href='/audit'
                btnType='white'
                text='Run a free website audit'
                arrow
              />
            </div>
          </div>

          <div
            className={styles.right}
            role='group'
            aria-roledescription='carousel'
            aria-label='The three problems we fix'
            tabIndex={0}
            onKeyDown={onKeyDown}
            data-reveal
          >
            <div className={styles.rightTop}>
              <span className={styles.mono}>Your problem</span>
              <span className={styles.counter} aria-live='polite'>
                0{active + 1}/0{count}
              </span>
            </div>

            {problems.map(({ Icon, ...item }, i) => {
              const current = i === active;
              return (
                <div
                  key={item.id}
                  className={`${styles.slide} ${current ? styles.slideActive : ""}`}
                  role='group'
                  aria-roledescription='slide'
                  aria-label={`${i + 1} of ${count}`}
                  aria-hidden={!current}
                  hidden={!current}
                >
                  <h3 className={`${styles.problem} h4`}>{item.problem}</h3>

                  <dl className={styles.answer}>
                    <div className={styles.answerRow}>
                      <dt className={styles.mono}>What fixes it</dt>
                      <dd className={styles.fix}>
                        <span className={styles.fixIcon}>
                          <Icon aria-hidden='true' />
                        </span>
                        {item.fix}
                      </dd>
                    </div>
                    <div className={styles.answerRow}>
                      <dt className={styles.mono}>Price</dt>
                      <dd className={styles.price}>{item.price}</dd>
                    </div>
                  </dl>

                  <Link
                    href={item.href}
                    className={styles.link}
                    tabIndex={current ? 0 : -1}
                  >
                    {item.link}
                    <Arrow className={styles.linkArrow} aria-hidden='true' />
                  </Link>
                </div>
              );
            })}

            <div className={styles.controls}>
              <button
                type='button'
                className={styles.control}
                onClick={() => go(-1)}
                aria-label='Previous problem'
              >
                <svg
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  aria-hidden='true'
                >
                  <path d='m15 18-6-6 6-6' />
                </svg>
              </button>
              <button
                type='button'
                className={styles.control}
                onClick={() => go(1)}
                aria-label='Next problem'
              >
                <svg
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  aria-hidden='true'
                >
                  <path d='m9 18 6-6-6-6' />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
