// The comparison pages (/compare/limo-anywhere): MDX files in
// content/compare, in the same format as the Journal's posts, so they use
// the same article layout. Add a comparison by adding a file.

import { readFolder, type Post } from "@/lib/journal";

export const compareHref = (page: Pick<Post, "slug">) =>
  `/compare/${page.slug}`;

/** Every comparison page, newest first. */
export function getComparisons(): Post[] {
  return readFolder("compare");
}

export function getComparison(slug: string): Post | undefined {
  return getComparisons().find((page) => page.slug === slug);
}
