import type { Metadata } from "next";
import styles from "../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import ServicesHero from "@/components/ServicesPage/ServicesHero/ServicesHero";
import FeatureMarquee from "@/components/HomePage/FeatureMarquee/FeatureMarquee";
import WhichOne from "@/components/ServicesPage/WhichOne/WhichOne";
import WhatWeDo from "@/components/ServicesPage/WhatWeDo/WhatWeDo";
import Faq, { type FaqItem } from "@/components/HomePage/Faq/Faq";
import FinalCta from "@/components/HomePage/FinalCta/FinalCta";
import Footer from "@/components/shared/Footer/Footer";

export const metadata: Metadata = {
  title: {
    absolute: "Services for Black Car & Limo Operators | Fonts & Footers",
  },
  description:
    "Websites, booking software and leads for limo and black car companies. Find the one that fixes your problem, with the price on every plan.",
};

const servicesFaqs: FaqItem[] = [
  {
    id: 1,
    question: "Which service should I start with?",
    answer:
      "Start with the problem you have. If you're nowhere on Google, that's the website. If clients can't book online, that's the booking software on the Full Platform. If business is slow, that's the leads tool. Not sure? Run the free website audit. It takes 60 seconds and shows where you stand.",
  },
  {
    id: 2,
    question: "Do I have to buy everything?",
    answer:
      "No. Each service works on its own. The leads tool is $125/mo by itself, and Website Only is $199/mo with the booking software you already use. The Full Platform at $499/mo is the only plan that bundles them: your website, booking and dispatch, and the leads tool.",
  },
  {
    id: 3,
    question:
      "What's the difference between Website Only and the Full Platform?",
    answer:
      "Both get you the same custom website with an SEO foundation, hosting and edits. Website Only links to your current booking software. The Full Platform replaces it with your own booking system, with driver and admin portals, flight tracking and payments, and it includes the leads tool.",
  },
  {
    id: 4,
    question: "Can I keep Limo Anywhere or Moovs?",
    answer:
      "Yes. With Website Only, your site links to the software you already use, so nothing changes about how you take bookings. If you ever want to move to your own booking system, you can upgrade to the Full Platform with no rebuild.",
  },
  {
    id: 5,
    question: "How does the free leads tool work?",
    answer:
      "You get 30 days free, no card. It finds hotels, wedding and event venues, corporate travel managers and funeral homes in your market, plus upcoming events and people asking for rides online. Every lead comes with the decision-maker's contact and an outreach script written for that business.",
  },
  {
    id: 6,
    question: "What does the free website audit check?",
    answer:
      "How you show up on Google, how your site works on a phone, whether riders can book you online, and whether AI search can read you. You get a score out of 100 and your top three fixes, with no card and no email needed for your score.",
  },
  {
    id: 7,
    question: "How long does it take to launch?",
    answer:
      "Most sites launch within 3 weeks. The leads tool and the free audit work right away.",
  },
  {
    id: 8,
    question: "Are there per-booking fees?",
    answer:
      "No, on any plan. Card payments run through your own Stripe account at Stripe's standard rates.",
  },
];

export default function ServicesPage() {
  return (
    <main className={styles.container}>
      <Nav />
      <ServicesHero />
      <FeatureMarquee />
      <WhichOne />
      <WhatWeDo />
      <Faq faqs={servicesFaqs} heading='Service Questions' />
      <FinalCta />
      <Footer />
    </main>
  );
}
