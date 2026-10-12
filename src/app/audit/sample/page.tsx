// /audit/sample: the sample report, a real audit with the operator's name,
// site, address, phone and the operators near them taken out. Picked on
// Admin → Audits; until one is, this page doesn't exist.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import styles from "../../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import Footer from "@/components/shared/Footer/Footer";
import AuditReport from "@/components/AuditPage/AuditReport/AuditReport";
import { sampleView } from "@/lib/audit/sample";
import { formStamp } from "@/lib/server/spam";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Sample Website Audit | Fonts & Footers" },
  robots: { index: false, follow: true },
};

export default async function SampleReportPage() {
  const view = await sampleView();
  if (!view) notFound();
  return (
    <main className={styles.container}>
      <Nav />
      <AuditReport view={view} stamp={formStamp()} />
      <Footer />
    </main>
  );
}
