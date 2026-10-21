import Image from "next/image";
import styles from "./BookingHero.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import HeroImg from "../../../../public/images/fullPlatformii.jpg";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";
// The live demo: a concept site whose booking flow runs in test mode, so
// nothing is charged and no real operator gets the request.
const DEMO = "https://www.mesamidnighttransport.com/book";

// The quick facts along the bottom of the text card.
const facts = [
  { label: "Price", value: "$499/mo" },
  { label: "Setup", value: "$500 one time, done for you" },
  { label: "Per-booking fees", value: "None" },
  { label: "Drivers & vehicles", value: "Unlimited" },
  { label: "Website & leads tool", value: "Included" },
  { label: "Contract", value: "Month to month, cancel anytime" },
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
            Limo Booking Software That Runs Every Ride From Your Own Site
          </h1>
          <p className={styles.copy} data-reveal>
            Booking, dispatch, a driver portal and payments, built into your own
            website, with the leads tool included. Unlimited drivers and
            vehicles, no per-booking fees, one flat $499 a month.
          </p>
          <div className={styles.btnContainer} data-reveal>
            <Button
              href={DEMO}
              target='_blank'
              btnType='black'
              text='Try a live demo'
              arrow
            />
            <Button
              href={CALENDAR}
              target='_blank'
              btnType='gray'
              text='Book a call'
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
