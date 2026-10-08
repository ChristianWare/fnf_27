import type { Metadata } from "next";
import styles from "../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import JournalHero from "@/components/JournalPage/JournalHero/JournalHero";
import MorePosts from "@/components/JournalPage/MorePosts/MorePosts";
import FinalCta from "@/components/HomePage/FinalCta/FinalCta";
import Footer from "@/components/shared/Footer/Footer";
import { categories, posts } from "@/components/JournalPage/posts";

export const metadata: Metadata = {
  title: { absolute: "Journal | Fonts & Footers" },
  description:
    "Guides for black car and limo operators: booking software, getting found on Google, and winning corporate accounts. One post a week.",
};

// The footer links to /journal?category=…; the page shows that category's
// posts, or everything when there's no match.
export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: slug } = await searchParams;
  const category = categories.find((c) => c.slug === slug);
  const matching = category
    ? posts.filter((post) => post.categorySlug === category.slug)
    : [];
  const shown = matching.length > 0 ? matching : posts;
  const [featured, ...rest] = shown;

  return (
    <main className={styles.container}>
      <Nav />
      <JournalHero
        featured={featured}
        category={matching.length > 0 ? category?.name : undefined}
      />
      <MorePosts posts={rest} />
      <FinalCta />
      <Footer />
    </main>
  );
}
