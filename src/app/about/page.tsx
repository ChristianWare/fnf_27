import type { Metadata } from "next";
import { ViewTransition } from "react";
import styles from "../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import AboutHero from "@/components/AboutPage/AboutHero/AboutHero";
import WhyOneIndustry from "@/components/AboutPage/WhyOneIndustry/WhyOneIndustry";
import FeatureMarquee from "@/components/HomePage/FeatureMarquee/FeatureMarquee";
import HowIWork from "@/components/AboutPage/HowIWork/HowIWork";
import AboutStory from "@/components/AboutPage/AboutStory/AboutStory";
import Process from "@/components/AboutPage/Process/Process";
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
      {/* The page transition (see the home page). */}
      <ViewTransition enter='page-enter' exit='page-exit' default='none'>
        <div className={styles.pageBody}>
          <AboutHero />
          <WhyOneIndustry />
          <FeatureMarquee />
          <HowIWork />
          <AboutStory />
          <Process />
          <Footer />
        </div>
      </ViewTransition>
    </main>
  );
}
