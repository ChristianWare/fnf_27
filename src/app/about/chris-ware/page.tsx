// Chris's author page, linked from every post's byline, so Google and AI
// search can see who writes the Journal.

import type { Metadata } from "next";
import styles from "../../page.module.css";
import Nav from "@/components/shared/Nav/Nav";
import AuthorBio from "@/components/AboutPage/AuthorBio/AuthorBio";
import MorePosts from "@/components/JournalPage/MorePosts/MorePosts";
import FinalCta from "@/components/HomePage/FinalCta/FinalCta";
import Footer from "@/components/shared/Footer/Footer";
import JsonLd from "@/components/shared/JsonLd/JsonLd";
import { getPosts } from "@/lib/journal";
import { AUTHOR_PATH, authorPage, breadcrumbs } from "@/lib/seo";

export const metadata: Metadata = {
  title: { absolute: "Chris Ware, Founder of Fonts & Footers" },
  description:
    "Chris Ware is the Phoenix developer behind Fonts & Footers, building websites, booking software and leads tools for black car and limo operators.",
  alternates: { canonical: AUTHOR_PATH },
  openGraph: { type: "profile" },
};

export default function AuthorPage() {
  const posts = getPosts().filter((post) => post.author === "Chris Ware");
  return (
    <main className={styles.container}>
      <JsonLd
        data={[
          authorPage,
          breadcrumbs([
            { name: "About", path: "/about" },
            { name: "Chris Ware", path: AUTHOR_PATH },
          ]),
        ]}
      />
      <Nav />
      <AuthorBio />
      <MorePosts posts={posts} heading='Posts by Chris' />
      <FinalCta />
      <Footer />
    </main>
  );
}
