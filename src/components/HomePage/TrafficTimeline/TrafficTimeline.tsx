// The honest timeline: search traffic is the main goal for an operator's
// website, and it takes months. Three steps, months 1 to 3, month 6 and
// month 12, from the 12-month SEO plan. Same look as the LeadsTool section:
// a dark card over a fixed background image, with the steps as a staircase.

import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./TrafficTimeline.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";

const steps = [
  {
    id: 1,
    title: "Months 1 to 3",
    label: "Rankings move first",
    desc: "Your site, your pages and your Google listing go live, and the first reviews come in. Rankings climb before the calls do, so traffic stays small for now. That's normal.",
  },
  {
    id: 2,
    title: "Month 6",
    label: "About 900 visits a month",
    desc: "You start showing up in the map box for some of your main searches, and your airport and route pages reach page one. This is when steady calls usually begin.",
  },
  {
    id: 3,
    title: "Month 12",
    label: "About 5,000 visits a month",
    desc: "Reviews, pages and links keep working without anyone pushing. Each month brings more than the last, and bookings from search show up every week.",
  },
];

export default function TrafficTimeline() {
  return (
    <section className={styles.container}>
      <Reveal />
      {/* The background stays put while the page scrolls over it. */}
      <div className={styles.bg} aria-hidden='true'>
        <Image
          src='/images/subSnow.png'
          alt=''
          fill
          sizes='100vw'
          className={styles.bgImg}
        />
      </div>

      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.topLeft}>
              <EyeBrow text='The honest timeline' color='green' />
              <h2 className={styles.heading}>
                The main goal for your website is to get traffic, but that takes time
              </h2>
              <p className={styles.copy}>
                Google trusts new pages slowly. For most operators, search and
                Maps start bringing steady calls in three to six months, then
                keep building. Anyone who promises page one in 30 days is
                selling something.
              </p>
            </div>
            <div className={styles.topRight}>
              <Button
                href='/register?plan=leads'
                btnType='white'
                text='Get free leads while you wait'
                arrow
              />
            </div>
          </div>

          <div className={styles.bottom}>
            <ol className={styles.steps}>
              {steps.map((step) => (
                <li className={styles.card} key={step.id} data-reveal='each'>
                  <div className={styles.cardLeft}>
                    <span className={styles.number}>0{step.id}</span>
                    <h3 className={`${styles.title} h5`}>{step.title}</h3>
                  </div>
                  <div className={styles.cardRight}>
                    <span className={styles.cardLabel}>{step.label}</span>
                    <p className={styles.desc}>{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className={styles.note}>
              A typical path, not a promise. Every market is different, so your
              monthly report shows the clicks, calls and bookings as they come
              in.
            </p>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
