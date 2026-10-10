// /sitemap.xml: every public page, for Google and the other search
// engines. The Journal's posts and the projects come from their files, so a
// new post shows up here on its own. Submit it once in Search Console.

import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/server/config";
import { getPosts, postHref } from "@/lib/journal";
import { projectHref, projects } from "@/lib/projects";

type Entry = MetadataRoute.Sitemap[number];

const pages: [
  path: string,
  priority: number,
  often: Entry["changeFrequency"],
][] = [
  ["/", 1, "weekly"],
  ["/services", 0.9, "monthly"],
  ["/services/websites", 0.9, "monthly"],
  ["/services/booking-software", 0.9, "monthly"],
  ["/services/leads", 0.9, "monthly"],
  ["/pricing", 0.8, "monthly"],
  ["/audit", 0.8, "monthly"],
  ["/journal", 0.7, "weekly"],
  ["/projects", 0.6, "monthly"],
  ["/about", 0.6, "monthly"],
  ["/contact", 0.6, "yearly"],
  ["/privacy", 0.2, "yearly"],
  ["/terms", 0.2, "yearly"],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getPosts();
  return [
    ...pages.map(([path, priority, changeFrequency]) => ({
      url: `${APP_URL}${path === "/" ? "" : path}`,
      changeFrequency,
      priority,
      ...(path === "/journal" && posts[0]
        ? { lastModified: posts[0].date }
        : {}),
    })),
    ...posts.map((post) => ({
      url: `${APP_URL}${postHref(post)}`,
      lastModified: post.date,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
    // Concepts still named in brackets are placeholders; they join when
    // they get a real name.
    ...projects
      .filter((project) => !/^\[.*\]$/.test(project.name))
      .map((project) => ({
        url: `${APP_URL}${projectHref(project)}`,
        changeFrequency: "yearly" as const,
        priority: 0.5,
      })),
  ];
}
