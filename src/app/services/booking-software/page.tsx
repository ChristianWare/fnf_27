import type { Metadata } from "next";
import styles from "../../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import BookingHero from "@/components/BookingPage/BookingHero/BookingHero";
import FeatureMarquee from "@/components/HomePage/FeatureMarquee/FeatureMarquee";
import WhatItDoes from "@/components/BookingPage/WhatItDoes/WhatItDoes";
import PlatformWhy from "@/components/BookingPage/PlatformWhy/PlatformWhy";
import HowItCompares from "@/components/BookingPage/HowItCompares/HowItCompares";
import PlatformPricing from "@/components/BookingPage/PlatformPricing/PlatformPricing";
import Faq, { type FaqItem } from "@/components/HomePage/Faq/Faq";
import FinalCta from "@/components/HomePage/FinalCta/FinalCta";
import Footer from "@/components/shared/Footer/Footer";

export const metadata: Metadata = {
  title: {
    absolute:
      "Limo Booking & Dispatch Software, Website Included | Fonts & Footers",
  },
  description:
    "Take bookings on your own site, assign drivers and get paid, all in one system with your website built in. $499/mo, no per-booking fees, leads tool included.",
};

const platformFaqs: FaqItem[] = [
  {
    id: 1,
    question: "Are there really no per-booking fees?",
    answer:
      "None. The Full Platform is a flat $499 a month whether you run 50 rides or 500. Payments run through your own Stripe account at Stripe's standard card rates, and that's the only per-transaction cost, paid to Stripe, not to us.",
  },
  {
    id: 2,
    question: "Do I need my own Stripe account?",
    answer:
      "Yes, and we set it up with you during onboarding if you don't have one. Riders pay on your site, the money lands in your Stripe account, and it pays out to your bank on Stripe's normal schedule.",
  },
  {
    id: 3,
    question: "What happens to my current bookings when I switch?",
    answer:
      "They stay where they are until they're done. We build and test while your current system keeps running, and on launch day new bookings start on your own site. There's never a day without a way to book.",
  },
  {
    id: 4,
    question: "How do my drivers use it?",
    answer:
      "From the driver portal on their phone, with nothing to install. Each driver sees their assigned rides, the pickup details and the flight status, and updates each trip's status as it unfolds.",
  },
  {
    id: 5,
    question: "Is the website really included?",
    answer:
      "Yes. The booking system is built into a custom site we build for you, with a page for every airport, route and city you serve. Riders book on your page, under your name, and every booking lands in your dashboard.",
  },
  {
    id: 6,
    question: "How long does setup take?",
    answer:
      "About three weeks from the call to launch day. We set up your vehicles, rates, service areas and corporate accounts from an export of your current system, build and test the site, then switch new bookings over.",
  },
  {
    id: 7,
    question: "Is there a contract?",
    answer:
      "No long-term contract. The Full Platform is month to month after the one-time $500 setup, you can cancel anytime, and your customer list is yours to export whenever you want it.",
  },
];

export default function BookingSoftwarePage() {
  return (
    <main className={styles.container}>
      <Nav />
      <BookingHero />
      <FeatureMarquee />
      <WhatItDoes />
      <PlatformWhy />
      <HowItCompares />
      <PlatformPricing />
      <Faq faqs={platformFaqs} heading='Booking Software Questions' />
      <FinalCta />
      <Footer />
    </main>
  );
}
