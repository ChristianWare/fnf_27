import type { Metadata } from "next";
import styles from "../../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import WebsitesHero from "@/components/WebsitesPage/WebsitesHero/WebsitesHero";
import FeatureMarquee from "@/components/HomePage/FeatureMarquee/FeatureMarquee";
import PlanIncludes from "@/components/WebsitesPage/PlanIncludes/PlanIncludes";
import PageMap from "@/components/WebsitesPage/PageMap/PageMap";
import TemplateVsCustom from "@/components/WebsitesPage/TemplateVsCustom/TemplateVsCustom";
import LimoSeo from "@/components/WebsitesPage/LimoSeo/LimoSeo";
import BuildProcess from "@/components/WebsitesPage/BuildProcess/BuildProcess";
import WebsitesCaseStudy from "@/components/WebsitesPage/WebsitesCaseStudy/WebsitesCaseStudy";
import WebsitesPricing from "@/components/WebsitesPage/WebsitesPricing/WebsitesPricing";
import Faq, { type FaqItem } from "@/components/HomePage/Faq/Faq";
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

const websiteFaqs: FaqItem[] = [
  {
    id: 1,
    question: "How long does a site take?",
    answer:
      "Most sites launch within 3 weeks. It starts with a 20-minute call, then the page map, then the build. You review the site on a private link before anything goes live.",
  },
  {
    id: 2,
    question: "Do I need the Full Platform to get a website?",
    answer:
      "No. Website Only is $199/mo plus a one-time $500 setup, and it's the same custom site: the page map, the SEO foundation, hosting and edits. It links to the booking software you already use.",
  },
  {
    id: 3,
    question: "Can I keep Limo Anywhere or Moovs?",
    answer:
      "Yes. On Website Only your site links to your current booking software, so nothing changes about how you take bookings. If you move to the Full Platform later, your own booking system replaces it, with no rebuild.",
  },
  {
    id: 4,
    question: "Who writes the pages?",
    answer:
      "We do. The page map comes from the searches riders make in your market: your airports, routes, cities, services and fleet. Each page is written about that place or service, and you review every one before launch.",
  },
  {
    id: 5,
    question: "What does the $500 setup cover?",
    answer:
      "Building your site: the design, the page map for your airports, routes and cities, your fleet and services pages, and, on the Full Platform, setting up booking with your vehicles and rates.",
  },
  {
    id: 6,
    question: "What's included after launch?",
    answer:
      "Hosting, security and edits, and new pages as you add cities, routes or vehicles. Send the change and it gets made. There's no ticket queue.",
  },
  {
    id: 7,
    question: "Who owns the domain and the content?",
    answer:
      "You do. Your domain stays registered to you, and the pages are written for your company. If you ever leave, your domain, your phone number and your customer data stay yours.",
  },
  {
    id: 8,
    question: "How soon will the new site rank?",
    answer:
      "New pages usually start showing up within a few months, and rankings keep building from there. Your Google Business Profile and reviews move the needle too, and the free audit shows where you stand today.",
  },
];

export default function WebsitesPage() {
  return (
    <main className={styles.container}>
      <Nav />
      <WebsitesHero />
      <FeatureMarquee />
      <PlanIncludes />
      <PageMap />
      <TemplateVsCustom />
      <LimoSeo />
      <BuildProcess />
      <WebsitesCaseStudy />
      <WebsitesPricing />
      <Faq faqs={websiteFaqs} heading='Website Questions' />
      <FinalCta />
      <Footer />
    </main>
  );
}
