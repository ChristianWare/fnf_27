import type { Metadata } from "next";
import styles from "../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import LegalDoc from "@/components/LegalPage/LegalDoc/LegalDoc";
import Footer from "@/components/shared/Footer/Footer";
import { privacy } from "@/lib/legal/privacy";

export const metadata: Metadata = {
  title: { absolute: "Privacy Policy | Fonts & Footers" },
  description:
    "What Fonts & Footers collects when you use the site, the free audit, the leads tool or the booking software, how it's used, and the choices you have.",
};

export default function PrivacyPage() {
  return (
    <main className={styles.container}>
      <Nav />
      <LegalDoc doc={privacy} />
      <Footer />
    </main>
  );
}
