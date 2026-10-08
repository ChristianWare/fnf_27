import Image from "next/image";
import styles from "./WebsitesHero.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import HeroImg from "../../../../public/images/subLap.png";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";

// The quick facts along the bottom of the text card.
const facts = [
  { label: "Price", value: "From $199/mo" },
  { label: "Setup", value: "$500 one time" },
  { label: "Launch", value: "Within 3 weeks" },
  { label: "Built for", value: "Black car & limo operators" },
  { label: "Booking", value: "Keep your software, or upgrade" },
  {
    label: "Live example",
    value: "niertransportation.com",
    href: "https://niertransportation.com",
  },
];

// Two cards side by side: the text on the left, a photo on the right.
export default function WebsitesHero() {
  return (
    <section className={styles.container}>
      <div className={styles.textCard}>
        <Reveal onLoad step={150} />
        <div className={styles.top}>
          <EyeBrow text='Websites' />
          <h1 className={styles.heading} data-reveal data-reveal-style='fade'>
            Limo Website Design for Black Car &amp; Chauffeur Companies
          </h1>
          <p className={styles.copy} data-reveal>
            A custom website built for the searches your riders make, with a
            page for every airport, route and city you serve. From $199/mo plus
            a one-time $500 setup.
          </p>
          <div className={styles.btnContainer} data-reveal>
            <Button
              href={CALENDAR}
              target='_blank'
              btnType='black'
              text='Book a 20-minute call'
              arrow
            />
            <Button
              href='/audit'
              btnType='gray'
              text='Run a free website audit'
            />
          </div>
        </div>

        <dl className={styles.facts} data-reveal>
          {facts.map((fact) => (
            <div className={styles.fact} key={fact.label}>
              <dt className={styles.factLabel}>{fact.label}:</dt>
              <dd className={styles.factValue}>
                {fact.href ? (
                  <a
                    href={fact.href}
                    target='_blank'
                    rel='noopener noreferrer'
                    className={styles.factLink}
                  >
                    {fact.value}
                  </a>
                ) : (
                  fact.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className={styles.photo}>
        <Image
          src={HeroImg}
          alt='A black SUV driving out of a laptop screen'
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
