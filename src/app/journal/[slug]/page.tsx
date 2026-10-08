import type { Metadata } from "next";
import { notFound } from "next/navigation";
import styles from "../../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import PostArticle from "@/components/JournalPage/PostArticle/PostArticle";
import MorePosts from "@/components/JournalPage/MorePosts/MorePosts";
import Footer from "@/components/shared/Footer/Footer";
import { getPost, getPosts } from "@/lib/journal";

type Params = Promise<{ slug: string }>;

// Every post is built at build time.
export function generateStaticParams() {
  return getPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: { absolute: "Journal | Fonts & Footers" } };
  return {
    title: { absolute: `${post.title} | Fonts & Footers` },
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      images: [{ url: post.image, alt: post.imageAlt }],
    },
  };
}

export default async function PostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  // The other posts, newest first.
  const more = getPosts()
    .filter((other) => other.slug !== post.slug)
    .slice(0, 3);

  return (
    <main className={styles.container}>
      <Nav />
      <PostArticle post={post} />
      <MorePosts posts={more} />
      <Footer />
    </main>
  );
}
