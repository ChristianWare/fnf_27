// The leads tool on its own, and the Full Platform that includes it, in
// the same cards as the pricing section on the home page.

import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./LeadsPricing.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import { PricingPlans } from "@/components/HomePage/Pricing/Pricing";

// The Leads Tool (1) first, then the Full Platform (2).
const LEADS_PLANS = [1, 2];

const help = {
  title: "Free for 30 days, no card.",
  sub: "Then $125/mo on its own, or included with the Full Platform at $499/mo.",
  href: "/pricing",
  text: "See full pricing",
};

export default function LeadsPricing() {
  return (
    <section className={styles.container} aria-labelledby='leads-pricing'>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <EyeBrow text='Pricing' />
            <h2
              id='leads-pricing'
              className={styles.heading}
              data-reveal
              data-reveal-style='fade'
            >
              Prices
            </h2>
          </div>

          <PricingPlans only={LEADS_PLANS} help={help} />
        </div>
      </LayoutWrapper>
    </section>
  );
}
