import type { Metadata } from "next";
import styles from "../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import PricingHero from "@/components/PricingPage/PricingHero/PricingHero";
import ComparePlans from "@/components/PricingPage/ComparePlans/ComparePlans";
import PlanDetails from "@/components/PricingPage/PlanDetails/PlanDetails";
import Faq, { type FaqItem } from "@/components/HomePage/Faq/Faq";
import FinalCta from "@/components/HomePage/FinalCta/FinalCta";
import Footer from "@/components/shared/Footer/Footer";

export const metadata: Metadata = {
  title: { absolute: "Pricing | Fonts & Footers" },
  description:
    "Every plan side by side: the free website audit, the leads tool at $125/mo (free for 30 days), Website Only at $199/mo and the Full Platform at $499/mo with leads included.",
};

const pricingFaqs: FaqItem[] = [
  {
    id: 1,
    question: "Is there a contract?",
    answer:
      "No long-term contract. Plans are month to month, and you can cancel anytime.",
  },
  {
    id: 2,
    question: "What does the $500 setup cover?",
    answer:
      "Building your site: the design, the page map for your airports, routes and cities, your fleet and services pages, and, on the Full Platform, setting up booking with your vehicles and rates.",
  },
  {
    id: 3,
    question: "Can I switch plans?",
    answer:
      "Yes. Start at $199 and upgrade to the Full Platform anytime, with no rebuild.",
  },
  {
    id: 4,
    question: "Who owns the domain?",
    answer: "You do. Your domain stays registered to you.",
  },
  {
    id: 5,
    question: "What happens to my site if I cancel?",
    answer:
      "Your site runs on the Fonts & Footers platform, so it comes down when you cancel. Your domain, your phone number and your customer data stay yours, and you get a full export of your data.",
  },
  {
    id: 6,
    question: "If I cancel the $499 plan, do I lose the leads tool?",
    answer: "No. You can keep it on its own for $125/mo.",
  },
  {
    id: 7,
    question: "Are there per-booking fees?",
    answer:
      "No, on any plan. Card payments run through your own Stripe account at Stripe's standard rates.",
  },
];

export default function PricingPage() {
  return (
    <main className={styles.container}>
      <Nav />
      <PricingHero />
      <ComparePlans />
      <PlanDetails />
      <Faq faqs={pricingFaqs} heading='Pricing questions.' />
      <FinalCta />
      <Footer />
    </main>
  );
}
