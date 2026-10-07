import type { Metadata } from "next";
import styles from "../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import AboutHero from "@/components/AboutPage/AboutHero/AboutHero";
import WhyOneIndustry from "@/components/AboutPage/WhyOneIndustry/WhyOneIndustry";
import FeatureMarquee from "@/components/HomePage/FeatureMarquee/FeatureMarquee";
import Footer from "@/components/shared/Footer/Footer";

export const metadata: Metadata = {
  title: {
    absolute: "About Fonts & Footers | Built Only for Black Car Operators",
  },
  description:
    "A Phoenix company that builds websites, booking software and leads tools only for black car and limo operators.",
};

export default function AboutPage() {
  return (
    <main className={styles.container}>
      <Nav />
      <AboutHero />
      <WhyOneIndustry />
      <FeatureMarquee />
      <Footer />
    </main>
  );
}
