import Image from "next/image";
import styles from "./LeadsHero.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import HeroImg from "../../../../public/images/leads.jpg";

// The quick facts along the bottom of the text card.
const facts = [
  { label: "Price", value: "Free for 30 days, no card" },
  { label: "After that", value: "$125/mo, or included with the Full Platform" },
  { label: "Leads", value: "Cold, warm and hot" },
  { label: "Each lead", value: "The decision-maker's contact and a script" },
  { label: "Delivery", value: "A daily email digest" },
  { label: "Built for", value: "Black car & limo operators" },
];

// Two cards side by side: the text on the left, a photo on the right.
export default function LeadsHero() {
  return (
    <section className={styles.container}>
      <div className={styles.textCard}>
        <Reveal onLoad step={150} />
        <div className={styles.top}>
          <EyeBrow text='Leads' />
          <h1
            className={`${styles.heading} heading2`}
            data-reveal
            data-reveal-style='fade'
          >
            Lead Generation for Limo Companies
          </h1>
          <p className={styles.copy} data-reveal>
            Find the hotels, venues, corporate accounts and events in your
            market, with the decision-maker&apos;s contact and an outreach
            script for each one. Free for 30 days, no card.
          </p>
          <div className={styles.btnContainer} data-reveal>
            <Button
              href='/leads'
              btnType='black'
              text='Get free leads in your city'
              arrow
            />
          </div>
        </div>

        <dl className={styles.facts} data-reveal>
          {facts.map((fact) => (
            <div className={styles.fact} key={fact.label}>
              <dt className={styles.factLabel}>{fact.label}:</dt>
              <dd className={styles.factValue}>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className={styles.photo}>
        <Image
          src={HeroImg}
          alt='An operator at his desk with a tablet'
          fill
          sizes='(max-width: 968px) 100vw, 50vw'
          loading='eager'
          fetchPriority='high'
          className={styles.img}
        />
      </div>
    </section>
  );
}
