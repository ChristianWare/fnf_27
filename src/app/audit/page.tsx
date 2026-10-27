import type { Metadata } from "next";
import styles from "../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import AuditTool from "@/components/AuditPage/AuditTool/AuditTool";
import WhatItChecks from "@/components/AuditPage/WhatItChecks/WhatItChecks";
import SampleReport from "@/components/AuditPage/SampleReport/SampleReport";
import Faq, { type FaqItem } from "@/components/HomePage/Faq/Faq";
import FinalCta from "@/components/HomePage/FinalCta/FinalCta";
import Footer from "@/components/shared/Footer/Footer";
import FeatureMarquee from "@/components/HomePage/FeatureMarquee/FeatureMarquee";
import { sampleView } from "@/lib/audit/sample";
import { formStamp } from "@/lib/server/spam";

// Drawn fresh on each visit, so the form's stamp is too.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute:
      "Free Website Audit for Limo & Black Car Companies | Fonts & Footers",
  },
  description:
    "Find out what's costing you bookings: Google, your Google Business Profile, your site on a phone, online booking and AI search. Free, run by hand and emailed within 24–48 hours, for limo and black car operators.",
  alternates: { canonical: "/audit" },
};

const auditFaqs: FaqItem[] = [
  {
    id: 1,
    question: "Is it really free?",
    answer: "Yes. No payment and no card.",
  },
  {
    id: 2,
    question: "How long does it take?",
    answer:
      "You'll have your report within 24–48 hours. I run every audit myself: your live site, Google's speed test on a phone, your Google listing and the searches riders make in your city.",
  },
  {
    id: 3,
    question: "Why do you need my email?",
    answer:
      "That's where the report goes: your score, your top three fixes and every check, with a link to view it online and a PDF you can forward. No newsletter unless you ask for one.",
  },
  {
    id: 4,
    question: "Does a person look at it?",
    answer:
      "Yes, every one. I run each audit myself and read it before it goes out, and I'm happy to walk you through the results. No pitch if it's not a fit.",
  },
  {
    id: 5,
    question: "What if my site doesn't do well?",
    answer:
      "Most operators find more to fix than they expect. The audit ranks the fixes, so you know exactly what to do first, and you can hand the report to any developer.",
  },
  {
    id: 6,
    question: "I don't have a website. Can I still get one?",
    answer:
      "Yes. Leave the website blank and add your city, and I'll audit your Google listing and where you show up in the map results.",
  },
  {
    id: 7,
    question: "Can I share the results?",
    answer:
      "Yes. Every report has its own link you can copy and send to whoever handles your website, and the full report comes as a PDF you can forward.",
  },
];

export default async function AuditPage() {
  const sample = await sampleView();
  return (
    <main className={styles.container}>
      <Nav />
      <AuditTool
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        stamp={formStamp()}
      />
      <FeatureMarquee />
      <WhatItChecks />
      {sample && <SampleReport view={sample} />}
      <Faq faqs={auditFaqs} heading='Audit Questions' />
      <FinalCta />
      <Footer />
    </main>
  );
}
