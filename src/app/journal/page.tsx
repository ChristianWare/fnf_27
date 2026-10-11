import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import styles from "../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import JournalHero from "@/components/JournalPage/JournalHero/JournalHero";
import MorePosts from "@/components/JournalPage/MorePosts/MorePosts";
import FinalCta from "@/components/HomePage/FinalCta/FinalCta";
import Footer from "@/components/shared/Footer/Footer";
import {
  activeCategories,
  categoryHref,
  getCategory,
  getPosts,
} from "@/lib/journal";

export const metadata: Metadata = {
  title: { absolute: "Journal | Fonts & Footers" },
  description:
    "Guides for black car and limo operators: booking software, getting found on Google, and winning corporate accounts.",
  alternates: { canonical: "/journal" },
};

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  // Old links to /journal?category=… go to the category's own page.
  const { category: slug } = await searchParams;
  const posts = getPosts();
  const category = getCategory(slug);
  if (category && activeCategories(posts).includes(category))
    permanentRedirect(categoryHref(category));

  const [featured, ...rest] = posts;

  return (
    <main className={styles.container}>
      <Nav />
      <JournalHero featured={featured} />
      <MorePosts posts={rest} />
      <FinalCta />
      <Footer />
    </main>
  );
}
