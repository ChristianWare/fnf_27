// /robots.txt. On the live site, search engines may read everything but
// the dashboards and the API, and are pointed at the sitemap. Anywhere else
// (a Vercel preview, development) they're asked to stay out entirely, so a
// preview never turns up in Google next to the real site.

import type { MetadataRoute } from "next";
import { APP_URL } from "@/lib/server/config";
import { IS_LIVE } from "@/lib/server/email";

export default function robots(): MetadataRoute.Robots {
  if (!IS_LIVE) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The pages with a login keep their own "noindex", which a crawler
      // has to be let in to see. These never show anything without one.
      disallow: ["/admin", "/dashboard", "/api/"],
    },
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
