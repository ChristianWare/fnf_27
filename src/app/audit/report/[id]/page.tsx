// /audit/report/<id>: one audit's own page. While it runs, the checks come
// in as they finish; then the score, the top three and the six checks, and
// the full report once they've given an email (admins always see it). The
// link is unguessable and kept out of Google, so it's safe to text.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import styles from "../../../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import Footer from "@/components/shared/Footer/Footer";
import AuditReport from "@/components/AuditPage/AuditReport/AuditReport";
import { getSessionUser } from "@/lib/auth/dal";
import { getAudit } from "@/lib/audit/store";
import { toView } from "@/lib/audit/view";
import { formStamp } from "@/lib/server/spam";

export const dynamic = "force-dynamic";
// Asking for the full report renders and emails the PDF.
export const maxDuration = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const row = await getAudit((await params).id);
  const name = row?.domain ?? row?.business;
  return {
    title: {
      absolute: `Website audit${name ? `: ${name}` : ""} | Fonts & Footers`,
    },
    robots: { index: false, follow: false },
  };
}

export default async function AuditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getAudit(id);
  if (!row || row.status === "CONFIRM") notFound();
  const user = await getSessionUser();
  const view = toView(row, { admin: user?.role === "ADMIN" });

  return (
    <main className={styles.container}>
      <Nav />
      <AuditReport view={view} stamp={formStamp()} />
      <Footer />
    </main>
  );
}
