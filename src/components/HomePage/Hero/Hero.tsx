import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Hero.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import ServicesHeroPreview from "../ServicesHeroPreview/ServicesHeroPreview";

export default function Hero() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <EyeBrow text='Black car & limo operators' />
            <h1 className={`${styles.heading} display1`}>
              Expand your 👨‍✈️ <br /> Black Car Business.
            </h1>
            <p className={styles.copy}>
              Get found on Google, take bookings directly with no per-booking
              fees, and fill the slow months with corporate accounts, hotels and
              events in your market.
            </p>
            <div className={styles.btnContainer}>
              <Button
                btnType='black'
                text='Get free leads in your city'
                arrow
              />
              <Button
                btnType='gray'
                text='run a free website audit'
                arrow
              />
            </div>
          </div>
          <div className={styles.right}>
            <ServicesHeroPreview />
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
