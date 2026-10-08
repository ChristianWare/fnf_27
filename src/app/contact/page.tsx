import type { Metadata } from "next";
import styles from "../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import ContactHero from "@/components/ContactPage/ContactHero/ContactHero";
import FeatureMarquee from "@/components/HomePage/FeatureMarquee/FeatureMarquee";
import ContactDetails from "@/components/ContactPage/ContactDetails/ContactDetails";
import Faq, { type FaqItem } from "@/components/HomePage/Faq/Faq";
import Footer from "@/components/shared/Footer/Footer";

export const metadata: Metadata = {
  title: { absolute: "Contact | Fonts & Footers" },
  description:
    "Tell us a little about your operation and we'll get back within 24 hours to set up a 20-minute call. Websites, booking software and leads for black car and limo operators.",
};

const contactFaqs: FaqItem[] = [
  {
    id: 1,
    question: "What happens after I send the form?",
    answer:
      "Chris reads it, usually the same day, and replies within 24 hours on business days with a few times for a 20-minute call. If you'd rather skip the form, book the call directly from the link above.",
  },
  {
    id: 2,
    question: "What's the call for?",
    answer:
      "To hear how you take bookings today, where your riders come from, and what's costing you the most. By the end you'll know which plan fits and what it would take to launch. No pitch if it's not a fit.",
  },
  {
    id: 3,
    question: "Should I run the free audit first?",
    answer:
      "It helps. The audit takes 60 seconds and shows where your site stands on the searches riders make, so the call starts from real numbers. It's at fontsandfooters.com/audit.",
  },
  {
    id: 4,
    question: "Do you work with operators outside Phoenix?",
    answer:
      "Yes. Fonts & Footers is based in Phoenix and works with black car and limo operators across the US. Everything is done over email and video calls.",
  },
  {
    id: 5,
    question: "I'm already a client. Where do I get support?",
    answer:
      "Email hello@fontsandfooters.com with your company name and what you need. Edits and questions are answered within one business day.",
  },
];

export default function ContactPage() {
  return (
    <main className={styles.container}>
      <Nav />
      <ContactHero />
      <FeatureMarquee />
      <ContactDetails />
      <Faq faqs={contactFaqs} heading='Before You Reach Out' />
      <Footer />
    </main>
  );
}
