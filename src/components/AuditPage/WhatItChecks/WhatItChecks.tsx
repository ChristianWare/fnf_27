import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./WhatItChecks.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import BgImg from "../../../../public/images/irr.webp";

// Only the checks that are live.
const checks = [
  {
    id: 1,
    title: "Google visibility",
    tag: "Search",
    desc: "How you show up for the searches riders make in your city.",
  },
  {
    id: 2,
    title: "Your Google Business Profile",
    tag: "Maps",
    desc: "Rating, reviews, photos and hours, compared with operators nearby.",
  },
  {
    id: 3,
    title: "Speed on a phone",
    tag: "Phone",
    desc: "How long your site takes to load where riders actually look.",
  },
  {
    id: 4,
    title: "Online booking",
    tag: "Bookings",
    desc: "Whether a rider can book you without calling.",
  },
  {
    id: 5,
    title: "The pages riders search for",
    tag: "Pages",
    desc: "Airport, corporate, wedding, fleet and city pages.",
  },
  {
    id: 6,
    title: "AI readability",
    tag: "AI search",
    desc: "Whether ChatGPT and other AI search can read your service areas, policies and FAQs.",
  },
];

export default function WhatItChecks() {
  return (
    <section className={styles.container} aria-labelledby='what-it-checks'>
      <Reveal />

      {/* The same background as Principles on the About page. It stays put
          while the page scrolls over it. */}
      <div className={styles.bg} aria-hidden='true'>
        <Image src={BgImg} alt='' fill sizes='100vw' className={styles.bgImg} />
      </div>

      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <EyeBrow text='What it checks' color='white' />
            <h2
              id='what-it-checks'
              className={styles.heading}
              data-reveal
              data-reveal-style='fade'
            >
              Six Checks, the Way a Rider Sees You
            </h2>
            <p className={styles.copy} data-reveal>
              Every check runs on your live site and your Google listing, from a
              phone, the way a rider would find you.
            </p>
          </div>

          <ol className={styles.cards}>
            {checks.map((check) => (
              <li className={styles.card} key={check.id} data-reveal>
                <div className={styles.cardTop}>
                  <span className={styles.number} aria-hidden='true'>
                    0{check.id}
                  </span>
                  <h3 className={`${styles.title} h5`}>{check.title}</h3>
                  <span className={styles.tag}>{check.tag}</span>
                </div>
                <div className={styles.band}>
                  <p className={styles.desc}>{check.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </LayoutWrapper>
    </section>
  );
}
