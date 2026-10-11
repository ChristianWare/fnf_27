// Chris's author page: who writes the Journal and builds the platform.
// The photo on the left, the bio, the facts and the ways to reach him on
// the right. Posts link here from their byline.

import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./AuthorBio.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import Me from "../../../../public/images/me.png";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";

const facts = [
  { label: "Role", value: "Founder and developer, Fonts & Footers" },
  { label: "Based in", value: "Phoenix, Arizona" },
  { label: "Builds for", value: "Black car and limo operators" },
  {
    label: "Writes about",
    value: "Booking software, SEO and winning accounts",
  },
];

export default function AuthorBio() {
  return (
    <section className={styles.container}>
      <Reveal onLoad step={150} />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.imgContainer} data-reveal>
            <Image
              src={Me}
              alt='Chris Ware, founder of Fonts & Footers'
              fill
              priority
              sizes='(max-width: 968px) 100vw, 50vw'
              className={styles.img}
            />
          </div>

          <div className={styles.right}>
            <EyeBrow text='Author' />
            <h1
              className={`${styles.heading} heading2`}
              data-reveal
              data-reveal-style='fade'
            >
              Chris Ware
            </h1>
            <p className={styles.copy} data-reveal>
              I&apos;m the developer behind Fonts &amp; Footers, based in
              Phoenix. I build websites, booking and dispatch software and a
              leads tool for one industry: black car and limo operators.
            </p>
            <p className={styles.copy} data-reveal>
              It started with one operator. Barry LaNier has run Nier
              Transportation in Phoenix since 2004, and his bookings ran through
              platforms that charged a fee on every ride and kept his customer
              list. I built him a direct-booking platform on his own domain and
              refined it on real bookings, drivers and corporate clients until
              it ran his whole business. That platform is what Fonts &amp;
              Footers runs on today.
            </p>
            <p className={styles.copy} data-reveal>
              In the Journal I write about what I see working with operators:
              what booking software really costs, where Google traffic actually
              comes from, and how to win corporate accounts.
            </p>

            <dl className={styles.facts} data-reveal>
              {facts.map((fact) => (
                <div className={styles.fact} key={fact.label}>
                  <dt className={styles.label}>{fact.label}</dt>
                  <dd className={styles.value}>{fact.value}</dd>
                </div>
              ))}
            </dl>

            <div className={styles.btnContainer} data-reveal>
              <Button
                href={CALENDAR}
                target='_blank'
                btnType='black'
                text='Book a 20-minute call'
                arrow
              />
              <Button
                href='/about'
                btnType='gray'
                text='About Fonts & Footers'
              />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
