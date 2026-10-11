// A Journal post, or a category's page (/journal/getting-found): the two
// share the address space, so this page serves both. Category slugs and
// post slugs never overlap.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import styles from "../../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import PostArticle from "@/components/JournalPage/PostArticle/PostArticle";
import JournalHero from "@/components/JournalPage/JournalHero/JournalHero";
import MorePosts from "@/components/JournalPage/MorePosts/MorePosts";
import FinalCta from "@/components/HomePage/FinalCta/FinalCta";
import Footer from "@/components/shared/Footer/Footer";
import JsonLd from "@/components/shared/JsonLd/JsonLd";
import {
  activeCategories,
  categoryHref,
  getPost,
  getPosts,
  postHref,
  type Category,
} from "@/lib/journal";
import { article, breadcrumbs } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

const findCategory = (slug: string) =>
  activeCategories().find((c) => c.slug === slug);

// Every post and every category with a post is built at build time, and
// nothing else exists.
export const dynamicParams = false;

export function generateStaticParams() {
  return [
    ...getPosts().map((post) => ({ slug: post.slug })),
    ...activeCategories().map((c) => ({ slug: c.slug })),
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = findCategory(slug);
  if (category)
    return {
      title: {
        absolute: `${category.name}: Guides for Limo Operators | Fonts & Footers`,
      },
      description: category.description,
      alternates: { canonical: categoryHref(category) },
    };

  const post = getPost(slug);
  if (!post) return { title: { absolute: "Journal | Fonts & Footers" } };
  return {
    title: { absolute: `${post.title} | Fonts & Footers` },
    description: post.excerpt,
    alternates: { canonical: postHref(post) },
    authors: [{ name: post.author, url: "/about/chris-ware" }],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      siteName: "Fonts & Footers",
      type: "article",
      publishedTime: post.date,
      images: [{ url: post.image, alt: post.imageAlt }],
    },
  };
}

function CategoryPage({ category }: { category: Category }) {
  const posts = getPosts();
  const [featured, ...rest] = posts.filter(
    (post) => post.categorySlug === category.slug,
  );
  // With only one post here so far, the rest of the Journal fills in.
  const more =
    rest.length > 0
      ? rest
      : posts.filter((post) => post.slug !== featured.slug).slice(0, 3);

  return (
    <main className={styles.container}>
      <JsonLd
        data={breadcrumbs([
          { name: "Journal", path: "/journal" },
          { name: category.name, path: categoryHref(category) },
        ])}
      />
      <Nav />
      <JournalHero
        featured={featured}
        category={category.name}
        heading={category.name}
        copy={category.description}
      />
      <MorePosts
        posts={more}
        heading={rest.length > 0 ? `More in ${category.name}` : "More posts"}
      />
      <FinalCta />
      <Footer />
    </main>
  );
}

export default async function PostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const category = findCategory(slug);
  if (category) return <CategoryPage category={category} />;

  const post = getPost(slug);
  if (!post) notFound();

  // The other posts, newest first.
  const more = getPosts()
    .filter((other) => other.slug !== post.slug)
    .slice(0, 3);
  const postCategory = activeCategories().find(
    (c) => c.slug === post.categorySlug,
  );

  return (
    <main className={styles.container}>
      <JsonLd
        data={[
          article({ ...post, path: postHref(post) }),
          breadcrumbs([
            { name: "Journal", path: "/journal" },
            ...(postCategory
              ? [{ name: postCategory.name, path: categoryHref(postCategory) }]
              : []),
            { name: post.title, path: postHref(post) },
          ]),
        ]}
      />
      <Nav />
      <PostArticle post={post} />
      <MorePosts posts={more} />
      <Footer />
    </main>
  );
}
