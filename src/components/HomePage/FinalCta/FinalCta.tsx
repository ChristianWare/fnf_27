import styles from "./FinalCta.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import CtaVideo from "./CtaVideo";

export default function FinalCta() {
  return (
    <section className={styles.container}>
      <CtaVideo />

      <div className={styles.card}>
        <div className={styles.cardTop}>
          <EyeBrow text='Let&#39;s work together' />
          <h2 className={styles.heading}>
            Start with free leads in your city.
          </h2>
          <p className={styles.copy}>
            See the hotels, venues and events you could be calling this week.
            Free for 30 days, no card. Rather talk first? Book a 20-minute call.
          </p>
        </div>

        <div className={styles.cardBottom}>
          <p className={styles.proof}>
            &ldquo;It paid for itself in the first month.&rdquo; Barry LaNier,
            Nier Transportation
          </p>
          <div className={styles.btnContainer}>
            <Button
              href='/leads'
              btnType='black'
              text='Get free leads in your city'
              arrow
            />
            <Button
              href='https://calendly.com/chris-ware-dev/discovery-call'
              target='_blank'
              btnType='gray'
              text='Book a 20-minute call'
            />
          </div>
        </div>
      </div>
    </section>
  );
}
