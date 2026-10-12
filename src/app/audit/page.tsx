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
import { RESULTS_IN } from "@/lib/audit";
import { sampleView } from "@/lib/audit/sample";
import { formStamp } from "@/lib/server/spam";

// Drawn fresh on each visit, so the form's stamp is too.
export const dynamic = "force-dynamic";
// Starting an audit runs it straight after, inside this page's time limit.
export const maxDuration = 300;

export const metadata: Metadata = {
  title: {
    absolute:
      "Free Website Audit for Limo & Black Car Companies | Fonts & Footers",
  },
  description:
    "Find out what's costing you bookings: Google, your Google Business Profile, your site on a phone, online booking and AI search. Free, with your score in about a minute, for limo and black car operators.",
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
    answer: `Your score shows in ${RESULTS_IN}. The audit checks your live site, Google's speed test on a phone, your Google listing and the searches riders make in your city while you wait.`,
  },
  {
    id: 3,
    question: "Do I need to give you my email?",
    answer:
      "Not for your score or your top three fixes. If you want the full report, every check and every fix as a PDF, that's where it goes.",
  },
  {
    id: 4,
    question: "Does a person look at it?",
    answer:
      "Yes. I read every audit that comes through, and sometimes follow up personally to walk an operator through the results. No pitch if it's not a fit.",
  },
  {
    id: 5,
    question: "What if my site doesn't do well?",
    answer:
      "Most operators find more to fix than they expect. The audit ranks the fixes, so you know exactly what to do first, and you can hand the report to any developer.",
  },
  {
    id: 6,
    question: "I don't have a website. Can I still run it?",
    answer:
      "Yes. Type your business name and city instead, and the audit checks your Google listing and where you show up in the map results.",
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
