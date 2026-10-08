// PLACEHOLDER posts for the Journal page. Swap these for real posts (or a
// CMS) when the first ones are written. The titles come from the site
// plan's first posts; the dates and excerpts are made up. The category
// slugs match the links in the footer.

import type { StaticImageData } from "next/image";
import Img1 from "../../../public/images/WhyWeExist.jpg";
import Img2 from "../../../public/images/work.jpg";
import Img3 from "../../../public/images/range.jpg";
import Img4 from "../../../public/images/launch.jpg";

export type Post = {
  id: number;
  slug: string;
  category: string;
  categorySlug: string;
  date: string;
  title: string;
  excerpt: string;
  src: StaticImageData;
  alt: string;
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

// Newest first. The first post is the featured one.
export const posts: Post[] = [
  {
    id: 1,
    slug: "limo-anywhere-alternatives",
    category: "Software & booking",
    categorySlug: "software-booking",
    date: "06 Oct 2026",
    title: "Limo Anywhere alternatives: an honest comparison",
    excerpt:
      "What the big booking platforms charge, who owns the customer on each one, and what to check before you switch. Written for operators who are tired of paying per booking.",
    src: Img1,
    alt: "An operator reviewing a booking calendar on a desktop computer",
  },
  {
    id: 2,
    slug: "how-to-get-corporate-clients-limo-company",
    category: "Winning accounts",
    categorySlug: "winning-accounts",
    date: "29 Sep 2026",
    title: "How to get corporate clients for a limo company",
    excerpt:
      "Who books rides at a company, how to reach them, and what to offer first. The outreach that wins accounts, step by step.",
    src: Img2,
    alt: "An operator at his desk, thinking through an email",
  },
  {
    id: 3,
    slug: "seo-for-limo-companies",
    category: "Getting found",
    categorySlug: "getting-found",
    date: "22 Sep 2026",
    title: "SEO for limo companies: what actually moves rankings",
    excerpt:
      "The searches riders make, the pages that answer them, and why the Google Maps listing matters more than the website for most operators.",
    src: Img3,
    alt: "A black SUV driving on the highway",
  },
  {
    id: 4,
    slug: "building-fonts-and-footers-in-public",
    category: "Build in public",
    categorySlug: "build-in-public",
    date: "15 Sep 2026",
    title: "Building Fonts & Footers in public: month one",
    excerpt:
      "What we shipped, what we got wrong, and what a real operator taught us about direct booking in the first month.",
    src: Img4,
    alt: "A rocket launching at dusk",
  },
];

// The link to a post. PLACEHOLDER: these pages don't exist yet.
export const postHref = (post: Post) => `/journal/${post.slug}`;
