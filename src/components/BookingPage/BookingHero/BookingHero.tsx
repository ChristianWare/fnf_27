import Image from "next/image";
import styles from "./BookingHero.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import HeroImg from "../../../../public/images/fullPlatformii.jpg";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";
// A live booking flow, on an operator's own site.
const DEMO = "https://www.niertransportation.com/book";

// The quick facts along the bottom of the text card.
const facts = [
  { label: "Price", value: "$499/mo" },
  { label: "Setup", value: "$500 one time" },
  { label: "Per-booking fees", value: "None" },
  { label: "Leads tool", value: "Included" },
  { label: "Website", value: "Built in" },
  { label: "Payments", value: "Through your own Stripe account" },
];

// Two cards side by side: the text on the left, a photo on the right.
export default function BookingHero() {
  return (
    <section className={styles.container}>
      <div className={styles.textCard}>
        <Reveal onLoad step={150} />
        <div className={styles.top}>
          <EyeBrow text='Booking software' />
          <h1
            className={`${styles.heading} heading2`}
            data-reveal
            data-reveal-style='fade'
          >
            Limo Booking &amp; Dispatch Software, Website Included
          </h1>
          <p className={styles.copy} data-reveal>
            Take bookings on your own site, assign drivers and get paid, all in
            one system with your website built in. $499/mo, no per-booking fees,
            leads tool included.
          </p>
          <div className={styles.btnContainer} data-reveal>
            <Button
              href={CALENDAR}
              target='_blank'
              btnType='black'
              text='Book a demo call'
              arrow
            />
            <Button
              href={DEMO}
              target='_blank'
              btnType='gray'
              text='Try the booking flow'
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
          alt='An operator in a suit holding a coffee, smiling'
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
