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

// Each category has its own page at /journal/<slug>, once it has a post.
export const categories = [
  {
    slug: "software-booking",
    name: "Software & booking",
    description:
      "Limo booking and dispatch software, per-booking fees, and what it really costs to take rides online.",
  },
  {
    slug: "getting-found",
    name: "Getting found",
    description:
      "SEO for limo companies: Google, your Business Profile, reviews and AI search, from where the traffic actually comes from.",
  },
  {
    slug: "winning-accounts",
    name: "Winning accounts",
    description:
      "How limo and black car operators win corporate clients, hotels, venues and event work, and keep them.",
  },
  {
    slug: "starting-a-black-car-business",
    name: "Starting a black car business",
    description:
      "What a new black car or limo company needs in year one: the website, the listings and the first accounts.",
  },
  {
    slug: "build-in-public",
    name: "Build in public",
    description:
      "How Fonts & Footers is built: the decisions, the numbers and what we learned along the way.",
  },
];

export type Category = (typeof categories)[number];

export const categoryHref = (category: Pick<Category, "slug">) =>
  `/journal/${category.slug}`;

export const getCategory = (slug: string | undefined) =>
  categories.find((c) => c.slug === slug);

/** The categories with at least one post; the others get no page yet. */
export function activeCategories(posts = getPosts()): Category[] {
  return categories.filter((c) =>
    posts.some((post) => post.categorySlug === c.slug),
  );
}

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

function readPost(dir: string, file: string): Post {
  const slug = file.replace(/\.mdx?$/, "");
  const raw = fs.readFileSync(path.join(dir, file), "utf8");
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

/**
 * Every MDX file in a folder under content/, newest first. The Journal
 * reads content/journal; the comparison pages read content/compare.
 */
export function readFolder(folder: string): Post[] {
  const dir = path.join(process.cwd(), "content", folder);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => readPost(dir, file))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** Every post, newest first. */
export function getPosts(): Post[] {
  return readFolder("journal");
}

export function getPost(slug: string): Post | undefined {
  return getPosts().find((post) => post.slug === slug);
}
