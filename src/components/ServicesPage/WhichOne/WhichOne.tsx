// "Which one do I need?": the three problems we fix, as frosted cards over
// a background video. The heading, the note and the audit button sit above
// them.

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
    problem: "You're nowhere on Google",
    fix: "Websites",
    price: "From $199/mo + $500 setup",
    href: "/services/websites",
    link: "See websites",
    Icon: Design,
  },
  {
    id: 2,
    problem: "Clients can't book online",
    fix: "Booking software (the Full Platform)",
    price: "$499/mo + $500 setup, leads tool included",
    href: "/services/booking-software",
    link: "See booking software",
    Icon: Platform,
  },
  {
    id: 3,
    problem: "Business is slow",
    fix: "Leads",
    price: "Free for 30 days, then included with $499 or $125/mo",
    href: "/services/leads",
    link: "See the leads tool",
    Icon: LeadsIcon,
  },
];

export default function WhichOne() {
  return (
    <section className={styles.container} aria-labelledby='which-one-heading'>
      <Reveal />
      <WhichOneVideo />

      <LayoutWrapper paddingNSNone='paddingNSNone'>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.topLeft}>
              <EyeBrow text='Which one do I need?' color='white' />
              <h2
                id='which-one-heading'
                className={`${styles.heading} h3`}
                data-reveal
                data-reveal-style='fade'
              >
                Not sure where to begin? Start with the problem you have.
              </h2>
            </div>
            <div className={styles.topRight} data-reveal>
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

          <ol className={styles.cards}>
            {problems.map(({ Icon, ...item }) => (
              <li className={styles.card} key={item.id} data-reveal='each'>
                <div className={styles.cardTop}>
                  <span className={styles.mono}>Your problem</span>
                  <span className={styles.number}>0{item.id}</span>
                </div>

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

                {/* <Link href={item.href} className={`${styles.link} subHeading`}>
                  {item.link}
                  <Arrow className={styles.linkArrow} aria-hidden='true' />
                </Link> */}
                <div className={styles.btnContainer}>
                  <Button
                    btnType='gray'
                    text={item.link}
                    href={item.href}
                    arrow
                  />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </LayoutWrapper>
    </section>
  );
}
