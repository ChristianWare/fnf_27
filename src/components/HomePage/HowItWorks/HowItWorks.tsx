import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./HowItWorks.module.css";

export default function HowItWorks() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}></div>
          <div className={styles.bottom}></div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
