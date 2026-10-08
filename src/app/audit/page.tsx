import type { Metadata } from "next";
import styles from "../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import AuditTool from "@/components/AuditPage/AuditTool/AuditTool";
import WhatItChecks from "@/components/AuditPage/WhatItChecks/WhatItChecks";
import Faq, { type FaqItem } from "@/components/HomePage/Faq/Faq";
import FinalCta from "@/components/HomePage/FinalCta/FinalCta";
import Footer from "@/components/shared/Footer/Footer";

export const metadata: Metadata = {
  title: {
    absolute:
      "Free Website Audit for Limo & Black Car Companies | Fonts & Footers",
  },
  description:
    "See what's costing you bookings in 60 seconds: how you show up on Google, how your site works on a phone, whether riders can book you online, and whether AI search can read you.",
};

const auditFaqs: FaqItem[] = [
  {
    id: 1,
    question: "Is it really free?",
    answer: "Yes. No payment and no card.",
  },
  {
    id: 2,
    question: "Do I need to give you my email?",
    answer:
      "Not for your score. You only need it if you want the full report as a PDF.",
  },
  {
    id: 3,
    question: "What if my score is low?",
    answer:
      "Most operators score lower than they expect. The report ranks the fixes, so you know exactly what to do first, and you can hand it to any developer.",
  },
  {
    id: 4,
    question: "How long does it take?",
    answer:
      "About 60 seconds. The checks run on your live site and your Google listing while you wait, and the results show on this page.",
  },
  {
    id: 5,
    question: "Can I share the results?",
    answer:
      "Yes. Every report gets its own link you can copy and send to whoever handles your website, and you can have the full report emailed as a PDF.",
  },
];

export default function AuditPage() {
  return (
    <main className={styles.container}>
      <Nav />
      <AuditTool />
      <WhatItChecks />
      <Faq faqs={auditFaqs} heading='Audit Questions' />
      <FinalCta />
      <Footer />
    </main>
  );
}
