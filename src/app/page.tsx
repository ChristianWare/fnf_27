import Nav from "@/components/shared/Nav/Nav";
import styles from "./page.module.css";
import Hero from "@/components/HomePage/Hero/Hero";
import ProofStrip from "@/components/HomePage/ProofStrip/ProofStrip";
import AboutUsIntro from "@/components/HomePage/AboutUsIntro/AboutUsIntro";
import Problems from "@/components/HomePage/Problems/Problems";
import HowItWorks from "@/components/HomePage/HowItWorks/HowItWorks";
import FeatureMarquee from "@/components/HomePage/FeatureMarquee/FeatureMarquee";
import NierCaseStudy from "@/components/HomePage/NierCaseStudy/NierCaseStudy";

export default function Home() {
  return (
    <main className={styles.container}>
      <Nav />
      <Hero />
      <ProofStrip />
      <AboutUsIntro />
      <Problems />
      <HowItWorks />
      <FeatureMarquee />
      <NierCaseStudy />
    </main>
  );
}
