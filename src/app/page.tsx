import type { Metadata } from "next";
import Nav from "@/components/shared/Nav/Nav";
import styles from "./page.module.css";
import Hero from "@/components/HomePage/Hero/Hero";
import ProofStrip from "@/components/HomePage/ProofStrip/ProofStrip";
import AboutUsIntro from "@/components/HomePage/AboutUsIntro/AboutUsIntro";
import Problems from "@/components/HomePage/Problems/Problems";
import HowItWorks from "@/components/HomePage/HowItWorks/HowItWorks";
import FeatureMarquee from "@/components/HomePage/FeatureMarquee/FeatureMarquee";
import NierCaseStudy from "@/components/HomePage/NierCaseStudy/NierCaseStudy";
import LeadsTool from "@/components/HomePage/LeadsTool/LeadsTool";
import BookingFeatures from "@/components/HomePage/BookingFeatures/BookingFeatures";
import Pricing from "@/components/HomePage/Pricing/Pricing";
import JournalPreview from "@/components/HomePage/JournalPreview/JournalPreview";
import Faq from "@/components/HomePage/Faq/Faq";
import FinalCta from "@/components/HomePage/FinalCta/FinalCta";
import Footer from "@/components/shared/Footer/Footer";

export const metadata: Metadata = {
  title: {
    absolute:
      "Limo Software, Websites & Leads for Black Car Operators | Fonts & Footers",
  },
  description:
    "Limo booking and dispatch software, websites and leads built only for black car and limo operators. Get found on Google, take bookings with no per-booking fees, and win accounts.",
  alternates: { canonical: "/" },
};

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
      <LeadsTool />
      <BookingFeatures />
      <Pricing />
      <JournalPreview />
      <Faq />
      <FinalCta />
      <Footer />
    </main>
  );
}
