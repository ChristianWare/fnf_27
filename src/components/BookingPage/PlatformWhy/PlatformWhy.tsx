// Why the Full Platform: the flat price, the website that comes with it,
// and how switching works, as frosted cards over a background video. The
// same layout as "Which one do I need?" on the Services page.

import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./PlatformWhy.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import PlatformWhyVideo from "./PlatformWhyVideo";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";

// The three steps of a switch, in the third card.
const switching = [
  {
    label: "What moves over",
    text: "Send us an export from your current system, and we set up your vehicles, rates, service areas and corporate accounts, and bring over your customer list.",
  },
  {
    label: "What the switch looks like",
    text: "We build and test while your current system keeps running. On launch day, new bookings start on your own site. Reservations already on the books stay where they are until they're done.",
  },
  {
    label: "Downtime",
    text: "None. You never have a day without a way to book.",
  },
];

export default function PlatformWhy() {
  return (
    <section className={styles.container} aria-labelledby='platform-why'>
      <Reveal />
      <PlatformWhyVideo />

      <LayoutWrapper paddingNSNone='paddingNSNone'>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.topLeft}>
              <EyeBrow text='Why the Full Platform' color='white' />
              <h2
                id='platform-why'
                className={`${styles.heading} h3`}
                data-reveal
                data-reveal-style='fade'
              >
                One flat price, your own site, and your own customers.
              </h2>
            </div>
            <div className={styles.topRight} data-reveal>
              <p className={styles.note}>
                Want to see it before you switch? Book a demo call and we walk
                through the booking flow, dispatch and the dashboard on a real
                account.
              </p>
              <Button
                href={CALENDAR}
                target='_blank'
                btnType='white'
                text='Book a demo call'
                arrow
              />
            </div>
          </div>

          <ol className={styles.cards}>
            <li className={styles.card} data-reveal='each'>
              <div className={styles.cardTop}>
                <span className={styles.mono}>Pricing</span>
                <span className={styles.number}>01</span>
              </div>

              <h3 className={`${styles.problem} h5`}>
                No per-booking fees, and you own the customer
              </h3>

              <div className={styles.body}>
                <p className={styles.text}>
                  Platforms that charge per booking cost more the busier you
                  get. The Full Platform is one flat $499 a month, whether you
                  run 50 rides or 500. Payments run through your own Stripe
                  account at Stripe&apos;s standard rates, the money goes
                  straight to you, and your customer list belongs to you.
                </p>
              </div>

              <div className={styles.btnContainer}>
                <Button
                  btnType='green'
                  text='See the price'
                  href='#pricing'
                  arrow
                />
              </div>
            </li>

            <li className={styles.card} data-reveal='each'>
              <div className={styles.cardTop}>
                <span className={styles.mono}>Website</span>
                <span className={styles.number}>02</span>
              </div>

              <h3 className={`${styles.problem} h5`}>
                The software comes with your website
              </h3>

              <div className={styles.body}>
                <p className={styles.text}>
                  You don&apos;t buy a website from one company and booking
                  software from another. The booking system is built into your
                  site, so riders book on your page, under your name, and every
                  booking lands in your dashboard.
                </p>
              </div>

              <div className={styles.btnContainer}>
                <Button
                  btnType='green'
                  text='See what the site includes'
                  href='/services/websites'
                  arrow
                />
              </div>
            </li>

            <li className={styles.card} data-reveal='each'>
              <div className={styles.cardTop}>
                <span className={styles.mono}>Switching</span>
                <span className={styles.number}>03</span>
              </div>

              <h3 className={`${styles.problem} h5`}>
                Switching from your current system
              </h3>

              <dl className={styles.answer}>
                {switching.map((step) => (
                  <div className={styles.answerRow} key={step.label}>
                    <dt className={styles.mono}>{step.label}</dt>
                    <dd>
                      <p className={styles.text}>{step.text}</p>
                    </dd>
                  </div>
                ))}
              </dl>

              <div className={styles.btnContainer}>
                <Button
                  btnType='green'
                  text='Plan the switch'
                  href={CALENDAR}
                  target='_blank'
                  arrow
                />
              </div>
            </li>
          </ol>
        </div>
      </LayoutWrapper>
    </section>
  );
}
