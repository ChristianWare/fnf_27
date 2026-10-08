import type { Metadata } from "next";
import styles from "../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import LegalDoc from "@/components/LegalPage/LegalDoc/LegalDoc";
import Footer from "@/components/shared/Footer/Footer";
import { terms } from "@/lib/legal/terms";

export const metadata: Metadata = {
  title: { absolute: "Terms of Service | Fonts & Footers" },
  description:
    "The terms for Fonts & Footers websites, the Full Platform booking software, the leads tool and the free audit: billing, cancellation, your data and ours.",
};

export default function TermsPage() {
  return (
    <main className={styles.container}>
      <Nav />
      <LegalDoc doc={terms} />
      <Footer />
    </main>
  );
}
