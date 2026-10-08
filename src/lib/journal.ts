// The Journal's posts: MDX files in content/journal, read on the server.
// Each file starts with front matter (title, excerpt, intro, category,
// date, image), then the article. Add a post by adding a file.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type Post = {
  slug: string;
  title: string;
  /** One or two sentences for the cards. */
  excerpt: string;
  /** The "Introduction" paragraph beside the article. */
  intro: string;
  category: string;
  categorySlug: string;
  /** YYYY-MM-DD, for sorting. */
  date: string;
  /** The date as shown: "06 Oct 2026". */
  dateLabel: string;
  /** A path under public/, e.g. /images/website.jpg. */
  image: string;
  imageAlt: string;
  author: string;
  /** Minutes, from the word count. */
  readTime: number;
  /** The article, as MDX. */
  body: string;
};

export const categories = [
  { slug: "software-booking", name: "Software & booking" },
  { slug: "getting-found", name: "Getting found" },
  { slug: "winning-accounts", name: "Winning accounts" },
  {
    slug: "starting-a-black-car-business",
    name: "Starting a black car business",
  },
  { slug: "build-in-public", name: "Build in public" },
];

const DIR = path.join(process.cwd(), "content", "journal");

export const postHref = (post: Pick<Post, "slug">) => `/journal/${post.slug}`;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

function readPost(file: string): Post {
  const slug = file.replace(/\.mdx?$/, "");
  const raw = fs.readFileSync(path.join(DIR, file), "utf8");
  const { data, content } = matter(raw);
  const categorySlug = String(data.categorySlug ?? "");
  const category =
    categories.find((c) => c.slug === categorySlug)?.name ??
    String(data.category ?? "");
  const words = content.split(/\s+/).filter(Boolean).length;
  return {
    slug,
    title: String(data.title ?? slug),
    excerpt: String(data.excerpt ?? ""),
    intro: String(data.intro ?? data.excerpt ?? ""),
    category,
    categorySlug,
    date: String(data.date ?? ""),
    dateLabel: data.date ? formatDate(String(data.date)) : "",
    image: String(data.image ?? ""),
    imageAlt: String(data.imageAlt ?? ""),
    author: String(data.author ?? "Chris Ware"),
    readTime: Math.max(1, Math.round(words / 220)),
    body: content,
  };
}

/** Every post, newest first. */
export function getPosts(): Post[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((file) => /\.mdx?$/.test(file))
    .map(readPost)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function getPost(slug: string): Post | undefined {
  return getPosts().find((post) => post.slug === slug);
}
