import type { Metadata } from "next";
import styles from "../../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import WebsitesHero from "@/components/WebsitesPage/WebsitesHero/WebsitesHero";
import FeatureMarquee from "@/components/HomePage/FeatureMarquee/FeatureMarquee";
import PlanIncludes from "@/components/WebsitesPage/PlanIncludes/PlanIncludes";
import PageMap from "@/components/WebsitesPage/PageMap/PageMap";
import TemplateVsCustom from "@/components/WebsitesPage/TemplateVsCustom/TemplateVsCustom";
import FinalCta from "@/components/HomePage/FinalCta/FinalCta";
import Footer from "@/components/shared/Footer/Footer";

export const metadata: Metadata = {
  title: {
    absolute:
      "Limo Website Design for Black Car & Chauffeur Companies | Fonts & Footers",
  },
  description:
    "A custom website built for the searches your riders make, with a page for every airport, route and city you serve. From $199/mo plus a one-time $500 setup.",
};

export default function WebsitesPage() {
  return (
    <main className={styles.container}>
      <Nav />
      <WebsitesHero />
      <FeatureMarquee />
      <PlanIncludes />
      <PageMap />
      <TemplateVsCustom />
      <FinalCta />
      <Footer />
    </main>
  );
}
