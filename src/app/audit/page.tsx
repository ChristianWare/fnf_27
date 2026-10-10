import type { Metadata } from "next";
import styles from "../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import AuditTool from "@/components/AuditPage/AuditTool/AuditTool";
import WhatItChecks from "@/components/AuditPage/WhatItChecks/WhatItChecks";
import Faq, { type FaqItem } from "@/components/HomePage/Faq/Faq";
import FinalCta from "@/components/HomePage/FinalCta/FinalCta";
import Footer from "@/components/shared/Footer/Footer";
import FeatureMarquee from "@/components/HomePage/FeatureMarquee/FeatureMarquee";
import { TURNAROUND } from "@/lib/audit";
import { formStamp } from "@/lib/server/spam";

// Drawn fresh on each visit, so the form's stamp is too.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    absolute:
      "Free Website Audit for Limo & Black Car Companies | Fonts & Footers",
  },
  description:
    "Find out what's costing you bookings: Google, your site on a phone, online booking and AI search. Checked by hand and free, for limo and black car operators.",
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
    answer: `Within ${TURNAROUND}. We check your live site and your Google listing by hand, from a phone, the way a rider would find you, and email you what we found.`,
  },
  {
    id: 3,
    question: "Why do you need my email?",
    answer: "That's where the audit goes, and where we answer if you reply.",
  },
  {
    id: 4,
    question: "What if my site doesn't do well?",
    answer:
      "Most operators find more to fix than they expect. The audit ranks the fixes, so you know exactly what to do first, and you can hand it to any developer.",
  },
  {
    id: 5,
    question: "Will you try to sell me something?",
    answer:
      "No. You get the audit either way. If you want help with the fixes, we can talk about it, and if we're not the right fit, we'll say so.",
  },
  {
    id: 6,
    question: "Can I share the results?",
    answer:
      "Yes. The audit comes as an email, so you can forward it to whoever handles your website.",
  },
];

export default function AuditPage() {
  return (
    <main className={styles.container}>
      <Nav />
      <AuditTool
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
        stamp={formStamp()}
      />
      <FeatureMarquee />
      <WhatItChecks />
      <Faq faqs={auditFaqs} heading='Audit Questions' />
      <FinalCta />
      <Footer />
    </main>
  );
}
