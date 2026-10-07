import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./AboutHero.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Location from "@/components/shared/icons/Location/Location";
import AboutHeroVideo from "./AboutHeroVideo";
import Chris from "../../../../public/images/chris.png";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";

export default function AboutHero() {
  return (
    <section className={styles.container}>
      <Reveal onLoad step={180} />
      <AboutHeroVideo />

      <LayoutWrapper paddingNSNone='paddingNSNone'>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.topLeft}>
              <EyeBrow text='About us' color='white' />
              <h1
                className={`${styles.heading} display1`}
                data-reveal
                data-reveal-style='fade'
              >
                Built for one <br /> industry — yours
              </h1>
            </div>
            <span className={styles.based}>Based in Phoenix, AZ</span>
          </div>

          <div className={styles.bottom}>
            <div className={styles.bottomLeft}>
              <p className={styles.copy} data-reveal>
                Fonts &amp; Footers builds websites, booking software and leads
                tools for one industry: black car and limo operators. I&apos;m
                Chris Ware, and I&apos;m based in Phoenix.
              </p>
              <Location className={styles.pin} aria-hidden='true' />
            </div>

            <div className={styles.bottomRight}>
              <a
                href={CALENDAR}
                target='_blank'
                rel='noopener noreferrer'
                className={styles.talk}
                aria-label='Book a 20-minute call with Chris Ware'
                data-reveal
              >
                <span className={styles.photo}>
                  <Image
                    src={Chris}
                    alt=''
                    fill
                    sizes='64px'
                    priority
                    className={styles.photoImg}
                  />
                </span>
                <span className={styles.talkText}>
                  <span className={styles.talkLabel}>Let&apos;s talk</span>
                  <span className={styles.talkName}>Chris Ware</span>
                  <span className={styles.talkRole}>Founder · Phoenix, AZ</span>
                </span>
                <span className={styles.talkArrow}>
                  <Arrow className={styles.arrow} aria-hidden='true' />
                </span>
              </a>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
