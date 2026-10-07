import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./PricingHero.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import { PricingPlans } from "@/components/HomePage/Pricing/Pricing";

export default function PricingHero() {
  return (
    <section className={styles.container}>
      <Reveal onLoad step={150} />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.topLeft}>
              <EyeBrow text='Plans & pricing' />
              <h1
                className={styles.heading}
                data-reveal
                data-reveal-style='fade'
              >
                Pricing
              </h1>
              <p className={styles.copy} data-reveal>
                Flat monthly prices, published. Start with a free website audit
                or 30 days of free leads, and add a website when you&apos;re
                ready. No plan charges per-booking fees.
              </p>
            </div>
            <ul className={styles.terms} data-reveal>
              <li>Month to month</li>
              <li>Cancel anytime</li>
            </ul>
          </div>

          {/* The home page's plan cards, with the free audit added first. */}
          <PricingPlans
            withAudit
            help={{
              title: "Want every detail?",
              sub: "See what each plan includes, side by side.",
              href: "#compare",
              text: "Compare plans",
            }}
          />
        </div>
      </LayoutWrapper>
    </section>
  );
}
