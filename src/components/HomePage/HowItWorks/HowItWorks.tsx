import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./HowItWorks.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";

const steps = [
  {
    id: 1,
    title: "Get free leads in your city",
    desc: "Tell us your city and the first search runs right away. You see hotels, venues and events you can contact today. Free for 30 days, no card.",
  },
  {
    id: 2,
    title: "See what those leads see when they Google you",
    desc: "Before you email a hotel, run the free audit. It shows what that hotel finds when it looks you up: your site, your Google profile and your reviews.",
  },
  {
    id: 3,
    title: "Turn on the inbound system",
    desc: "The Full Platform brings bookings in every month: a site built for the searches riders make, online booking around the clock, and no per-booking fees. The leads tool stays included.",
  },
];

export default function HowItWorks() {
  return (
    <section className={styles.container}>
      <Reveal mode='together' />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top} data-reveal>
            <div className={styles.topLeft}>
              <EyeBrow text='How it works' />
              <p className={styles.note}>Free for 30 days · No card</p>
            </div>
            <div className={styles.topMiddle}>
              <h2 className={`${styles.statement} h3`}>
                Win accounts this month with free leads. Then fix what they find
                on Google, and let your site bring in bookings.
              </h2>
              <div className={styles.btnContainer}>
                <Button
                  href='/leads'
                  btnType='black'
                  text='Get free leads in your city'
                  arrow
                />
              </div>
            </div>

            <div className={`${styles.range} h5`} aria-hidden='true'>
              01–03
            </div>
          </div>

          <ol className={styles.bottom} data-reveal>
            {steps.map((step) => (
              <li className={styles.card} key={step.id}>
                <div className={styles.cardTop}>
                  <h3 className={styles.cardLabel}>{step.title}</h3>
                  <p className={styles.cardDesc}>{step.desc}</p>
                </div>
                <div className={styles.cardNumber} aria-hidden='true'>
                  0{step.id}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </LayoutWrapper>
    </section>
  );
}
