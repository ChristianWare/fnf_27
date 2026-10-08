import type { Metadata } from "next";
import styles from "../../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import LeadsHero from "@/components/LeadsPage/LeadsHero/LeadsHero";
import FeatureMarquee from "@/components/HomePage/FeatureMarquee/FeatureMarquee";
import WhatItFinds from "@/components/LeadsPage/WhatItFinds/WhatItFinds";
import FinalCta from "@/components/HomePage/FinalCta/FinalCta";
import Footer from "@/components/shared/Footer/Footer";

export const metadata: Metadata = {
  title: { absolute: "Lead Generation for Limo Companies | Fonts & Footers" },
  description:
    "Find the hotels, venues, corporate accounts and events in your market, with the decision-maker's contact and an outreach script for each one. Free for 30 days, no card.",
};

export default function LeadsPage() {
  return (
    <main className={styles.container}>
      <Nav />
      <LeadsHero />
      <FeatureMarquee />
      <WhatItFinds />
      <FinalCta />
      <Footer />
    </main>
  );
}
