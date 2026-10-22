// A comparison page: the Full Platform next to one named alternative
// (/compare/limo-anywhere). The text is MDX in content/compare, laid out
// like a Journal post.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import styles from "../../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import PostArticle from "@/components/JournalPage/PostArticle/PostArticle";
import MorePosts from "@/components/JournalPage/MorePosts/MorePosts";
import FinalCta from "@/components/HomePage/FinalCta/FinalCta";
import Footer from "@/components/shared/Footer/Footer";
import JsonLd from "@/components/shared/JsonLd/JsonLd";
import { compareHref, getComparison, getComparisons } from "@/lib/compare";
import { getPosts } from "@/lib/journal";
import { article, breadcrumbs } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

// Every comparison is built at build time, and nothing else exists.
export const dynamicParams = false;

export function generateStaticParams() {
  return getComparisons().map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getComparison(slug);
  if (!page) return { title: { absolute: "Compare | Fonts & Footers" } };
  return {
    title: { absolute: `${page.title} | Fonts & Footers` },
    description: page.excerpt,
    alternates: { canonical: compareHref(page) },
    authors: [{ name: page.author, url: "/about/chris-ware" }],
    openGraph: {
      title: page.title,
      description: page.excerpt,
      siteName: "Fonts & Footers",
      type: "article",
      publishedTime: page.date,
      images: [{ url: page.image, alt: page.imageAlt }],
    },
  };
}

export default async function ComparePage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = getComparison(slug);
  if (!page) notFound();

  // The software posts first, since they're the ones a reader comparing
  // systems wants next.
  const posts = getPosts();
  const more = [
    ...posts.filter((post) => post.categorySlug === "software-booking"),
    ...posts.filter((post) => post.categorySlug !== "software-booking"),
  ].slice(0, 3);

  return (
    <main className={styles.container}>
      <JsonLd
        data={[
          article({ ...page, path: compareHref(page) }),
          breadcrumbs([
            { name: "Services", path: "/services" },
            { name: "Booking software", path: "/services/booking-software" },
            { name: page.title, path: compareHref(page) },
          ]),
        ]}
      />
      <Nav />
      <PostArticle
        post={page}
        basePath='/compare'
        back={{ href: "/services/booking-software", label: "Booking software" }}
      />
      <MorePosts posts={more} heading='Keep comparing' />
      <FinalCta />
      <Footer />
    </main>
  );
}
