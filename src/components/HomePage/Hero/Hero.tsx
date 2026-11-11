import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Hero.module.css";
import Button from "@/components/shared/Button/Button";
// import ServicesHeroPreview from "../ServicesHeroPreview/ServicesHeroPreview";
import Reveal from "@/components/shared/Reveal/Reveal";
import HeroCalendar from "../HeroCalendar/HeroCalendar";
import PulseEyeBrow from "@/components/shared/PulseEyeBrow/PulseEyeBrow";

export default function Hero() {
  // Today on the server; the calendar switches to the visitor's own date.
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  return (
    <section className={styles.container}>
      <Reveal onLoad step={180} />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <PulseEyeBrow text='Black car & limo operators' />
            <h1
              className={`${styles.heading} `}
              data-reveal
              data-reveal-style='fade'
            >
              Your Calendar, <br /> Fully Booked
            </h1>
            <p className={styles.copy} data-reveal>
              Your website, booking and dispatch software, and a leads tool, in
              one system for $499 a month. No per-booking fees. Start with free
              leads in your city.
            </p>
            <div className={styles.btnContainer} data-reveal>
              <Button
                href='/register?plan=leads'
                btnType='black'
                text='Get free leads in your city'
                arrow
              />
              <Button
                href='/audit'
                btnType='gray'
                text='Get a free website audit'
                arrow
              />
            </div>
          </div>
          <div className={styles.right} data-reveal>
            {/* <ServicesHeroPreview /> */}
            <div className={styles.imgContainer}>
              <HeroCalendar initialKey={todayKey} />
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
