// The Full Platform, and Website Only for operators keeping their booking
// software, in the same cards as the pricing section on the home page.

import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./PlatformPricing.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import { PricingPlans } from "@/components/HomePage/Pricing/Pricing";

// The Full Platform (2) first, then Website Only (3).
const PLATFORM_PLANS = [2, 3];

const help = {
  title: "Flat $499/mo, no per-booking fees.",
  sub: "The website and the leads tool are included. Keeping your current booking software? Website Only is $199/mo.",
  href: "/pricing",
  text: "See full pricing",
};

export default function PlatformPricing() {
  return (
    <section
      className={styles.container}
      id='pricing'
      aria-labelledby='platform-pricing'
    >
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <EyeBrow text='Pricing' />
            <h2
              id='platform-pricing'
              className={styles.heading}
              data-reveal
              data-reveal-style='fade'
            >
              Prices
            </h2>
          </div>

          <PricingPlans only={PLATFORM_PLANS} help={help} />
        </div>
      </LayoutWrapper>
    </section>
  );
}
