// The two website plans, in the same cards as the pricing section on the
// home page.

import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./WebsitesPricing.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import { PricingPlans } from "@/components/HomePage/Pricing/Pricing";

// Website Only (3) first, then the Full Platform (2).
const WEBSITE_PLANS = [3, 2];

const help = {
  title: "Start at $199 and upgrade anytime.",
  sub: "Both plans include the same custom site, and neither charges per-booking fees.",
  href: "/pricing",
  text: "See full pricing",
};

export default function WebsitesPricing() {
  return (
    <section className={styles.container} aria-labelledby='websites-pricing'>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <EyeBrow text='Pricing' />
            <h2
              id='websites-pricing'
              className={styles.heading}
              data-reveal
              data-reveal-style='fade'
            >
              Prices
            </h2>
          </div>

          <PricingPlans only={WEBSITE_PLANS} help={help} />
        </div>
      </LayoutWrapper>
    </section>
  );
}
