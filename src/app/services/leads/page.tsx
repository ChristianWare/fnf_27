import type { Metadata } from "next";
import styles from "../../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import LeadsHero from "@/components/LeadsPage/LeadsHero/LeadsHero";
import FeatureMarquee from "@/components/HomePage/FeatureMarquee/FeatureMarquee";
import WhatItFinds from "@/components/LeadsPage/WhatItFinds/WhatItFinds";
import EachLead from "@/components/LeadsPage/EachLead/EachLead";
import HowYouWorkIt from "@/components/LeadsPage/HowYouWorkIt/HowYouWorkIt";
import LeadsInYourCity from "@/components/LeadsPage/LeadsInYourCity/LeadsInYourCity";
import LeadsPricing from "@/components/LeadsPage/LeadsPricing/LeadsPricing";
import Faq, { type FaqItem } from "@/components/HomePage/Faq/Faq";
import FinalCta from "@/components/HomePage/FinalCta/FinalCta";
import Footer from "@/components/shared/Footer/Footer";

export const metadata: Metadata = {
  title: { absolute: "Lead Generation for Limo Companies | Fonts & Footers" },
  description:
    "Find the hotels, venues, corporate accounts and events in your market, with the decision-maker's contact and an outreach script for each one. Free for 30 days, no card.",
};

const leadsFaqs: FaqItem[] = [
  {
    id: 1,
    question: "Is the leads tool really free?",
    answer:
      "For the first 30 days, yes, with no card. After that it's $125/mo on its own, or included with the Full Platform at $499/mo.",
  },
  {
    id: 2,
    question: "Where do the leads come from?",
    answer:
      "Public sources in your market: the hotels, wedding and event venues, corporate travel managers and funeral homes that book rides, and the events coming up on Eventbrite, Ticketmaster and the calendars of convention centers, tourism boards, chambers of commerce and universities.",
  },
  {
    id: 3,
    question: "Do I need the Full Platform to use it?",
    answer:
      "No. The leads tool works on its own, with whatever booking software you use now. The Full Platform just includes it.",
  },
  {
    id: 4,
    question: "How many leads will I get?",
    answer:
      "It depends on your market. Type your city in the check above to see how many hotels, venues, corporate accounts and upcoming events the tool has there right now.",
  },
  {
    id: 5,
    question: "Does it send the outreach for me?",
    answer:
      "No. It gives you the decision-maker's contact and a script written for that business, and you send it from your own email or phone, so the replies come straight to you.",
  },
  {
    id: 6,
    question: "Is there a contract?",
    answer:
      "No long-term contract. The leads tool is month to month, and you can cancel anytime.",
  },
];

export default function LeadsPage() {
  return (
    <main className={styles.container}>
      <Nav />
      <LeadsHero />
      <FeatureMarquee />
      <WhatItFinds />
      <EachLead />
      <HowYouWorkIt />
      <LeadsInYourCity />
      <LeadsPricing />
      <Faq faqs={leadsFaqs} heading='Leads Questions' />
      <FinalCta />
      <Footer />
    </main>
  );
}
