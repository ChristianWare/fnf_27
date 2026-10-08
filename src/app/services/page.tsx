import type { Metadata } from "next";
import styles from "../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import ServicesHero from "@/components/ServicesPage/ServicesHero/ServicesHero";
import FeatureMarquee from "@/components/HomePage/FeatureMarquee/FeatureMarquee";
import WhichOne from "@/components/ServicesPage/WhichOne/WhichOne";
import WhatWeDo from "@/components/ServicesPage/WhatWeDo/WhatWeDo";
import FinalCta from "@/components/HomePage/FinalCta/FinalCta";
import Footer from "@/components/shared/Footer/Footer";

export const metadata: Metadata = {
  title: {
    absolute: "Services for Black Car & Limo Operators | Fonts & Footers",
  },
  description:
    "Websites, booking software and leads for limo and black car companies. Find the one that fixes your problem, with the price on every plan.",
};

export default function ServicesPage() {
  return (
    <main className={styles.container}>
      <Nav />
      <ServicesHero />
      <FeatureMarquee />
      <WhichOne />
      <WhatWeDo />
      <FinalCta />
      <Footer />
    </main>
  );
}
