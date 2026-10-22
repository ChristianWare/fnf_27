// The fee calculator on its own page, so it can rank and be shared by
// itself. The same calculator sits on the booking software page.

import type { Metadata } from "next";
import styles from "../../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import FeeCalculator from "@/components/BookingPage/FeeCalculator/FeeCalculator";
import Faq, { type FaqItem } from "@/components/HomePage/Faq/Faq";
import FinalCta from "@/components/HomePage/FinalCta/FinalCta";
import Footer from "@/components/shared/Footer/Footer";
import JsonLd from "@/components/shared/JsonLd/JsonLd";
import { breadcrumbs } from "@/lib/seo";
import { APP_URL } from "@/lib/server/config";

export const metadata: Metadata = {
  title: {
    absolute: "Booking Fee Calculator for Limo Operators | Fonts & Footers",
  },
  description:
    "Free calculator: enter your rides a month, average fare and platform fee to see what per-booking fees cost your limo company in a month and a year.",
  alternates: { canonical: "/tools/booking-fee-calculator" },
};

const calculatorFaqs: FaqItem[] = [
  {
    id: 1,
    question: "How is the yearly cost worked out?",
    answer:
      "Rides a month times the average fare gives your monthly bookings. The platform's percentage of that is what it keeps each month, and twelve months of it is the yearly cost. The flat side is $499 a month for twelve months.",
  },
  {
    id: 2,
    question: "Why isn't card processing included?",
    answer:
      "Because every option pays it. Whether riders pay through a booking platform or through your own Stripe account, a card processor takes its cut. Leaving it out of both sides keeps the comparison to the part that actually differs: the platform's own fee.",
  },
  {
    id: 3,
    question: "What platform fee should I enter?",
    answer:
      "The percentage your booking platform or network keeps from each fare, from your agreement or a recent payout statement. If you pay a flat amount per booking instead, divide it by your average fare and enter that as a percentage.",
  },
  {
    id: 4,
    question: "What if the fees come out under $499 a month?",
    answer:
      "Then fees alone aren't a reason to switch, and the calculator says so. The case for your own booking system at that size is owning your website, your rider list and your name at checkout, not the fee.",
  },
  {
    id: 5,
    question: "What does the flat $499 include?",
    answer:
      "The Full Platform: a custom website, booking, dispatch, a driver portal, flight tracking and payments through your own Stripe account, plus the leads tool. Unlimited drivers and vehicles, no per-booking fees, month to month.",
  },
];

export default function FeeCalculatorPage() {
  return (
    <main className={styles.container}>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Booking Fee Calculator for Limo Operators",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: `${APP_URL}/tools/booking-fee-calculator`,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          },
          breadcrumbs([
            {
              name: "Booking fee calculator",
              path: "/tools/booking-fee-calculator",
            },
          ]),
        ]}
      />
      <Nav />
      <FeeCalculator standalone />
      <Faq
        faqs={calculatorFaqs}
        eyebrow='How it works'
        heading='Calculator Questions'
      />
      <FinalCta />
      <Footer />
    </main>
  );
}
