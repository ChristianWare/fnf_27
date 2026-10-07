import type { Metadata } from "next";
import styles from "../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import ProjectsHero from "@/components/ProjectsPage/ProjectsHero/ProjectsHero";
import FeatureMarquee from "@/components/HomePage/FeatureMarquee/FeatureMarquee";
import ProjectGrid from "@/components/ProjectsPage/ProjectGrid/ProjectGrid";
import Faq, { type FaqItem } from "@/components/HomePage/Faq/Faq";
import FinalCta from "@/components/HomePage/FinalCta/FinalCta";
import Footer from "@/components/shared/Footer/Footer";

export const metadata: Metadata = {
  title: { absolute: "Projects: Limo & Black Car Websites | Fonts & Footers" },
  description:
    "Real work and concept builds for black car and limo operators, starting with Nier Transportation in Phoenix.",
};

const projectFaqs: FaqItem[] = [
  {
    id: 1,
    question: "Is Nier Transportation a real client?",
    answer:
      "Yes. Barry LaNier has run Nier Transportation in Phoenix since 2004, and his business runs on the Full Platform: his own website, booking, dispatch and payments, with $0 per-booking fees. The site is live at niertransportation.com.",
  },
  {
    id: 2,
    question: "Are the concept sites real companies?",
    answer:
      "No. Concept sites are designs we built to show our range, and each one is labeled Concept. Their booking flows run in test mode, so nothing is ever charged.",
  },
  {
    id: 3,
    question: "Will my site look like these?",
    answer:
      "No. Each site is designed around your company: your name, your fleet photos, your service areas and your rates. You review it on a private link before anything goes live.",
  },
  {
    id: 4,
    question: "How long does a site take?",
    answer:
      "Most sites launch within 3 weeks. On launch day we point your domain at the new site, and your phone number stays the same.",
  },
  {
    id: 5,
    question: "What does a build like Nier's cost?",
    answer:
      "Nier runs on the Full Platform: $499/mo plus a one-time $500 setup, with the leads tool included and no per-booking fees. If you only need a website, Website Only is $199/mo plus the same setup.",
  },
];

export default function ProjectsPage() {
  return (
    <main className={styles.container}>
      <Nav />
      <ProjectsHero />
      <FeatureMarquee />
      <ProjectGrid />
      <Faq faqs={projectFaqs} heading='Project questions.' />
      <FinalCta />
      <Footer />
    </main>
  );
}
