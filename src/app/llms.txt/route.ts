// /llms.txt: a plain-text map of the site for AI search and assistants
// (llmstxt.org), with what Fonts & Footers does, the prices, and the pages
// worth reading. The Journal's posts come from their files, so a new post
// shows up here on its own.

import { APP_URL } from "@/lib/server/config";
import {
  activeCategories,
  categoryHref,
  getPosts,
  postHref,
} from "@/lib/journal";

export const dynamic = "force-static";

export function GET() {
  const posts = getPosts();
  const link = (title: string, path: string, note?: string) =>
    `- [${title}](${APP_URL}${path === "/" ? "" : path})${note ? `: ${note}` : ""}`;

  const text = [
    "# Fonts & Footers",
    "",
    "> Websites, booking and dispatch software, and a leads tool built only for black car and limo operators in the US. Based in Phoenix, Arizona. Flat, published prices, month to month, and no per-booking fees on any plan.",
    "",
    "Plans: the free website audit ($0, checked by hand, back within two business days); the leads tool ($125/mo, free for the first 30 days with no card); Website Only ($199/mo plus a one-time $500 setup, keeps the operator's current booking software); the Full Platform ($499/mo plus a one-time $500 setup: custom website, booking and dispatch, driver and admin portals, flight tracking, payments through the operator's own Stripe account, and the leads tool included).",
    "",
    "## Services",
    "",
    link("Services", "/services", "every service and which one to start with"),
    link(
      "Limo booking and dispatch software",
      "/services/booking-software",
      "the Full Platform, $499/mo, website included, no per-booking fees",
    ),
    link(
      "Limo website design",
      "/services/websites",
      "custom sites with a page for every airport, route and city, from $199/mo",
    ),
    link(
      "Limo leads",
      "/services/leads",
      "hotels, venues, corporate accounts and events in the operator's market, $125/mo",
    ),
    link("Pricing", "/pricing", "every plan side by side"),
    link("Free website audit", "/audit"),
    "",
    "## Proof",
    "",
    link(
      "Projects",
      "/projects",
      "including Nier Transportation in Phoenix, running on the platform",
    ),
    "",
    "## Journal",
    "",
    ...activeCategories(posts).map((c) =>
      link(c.name, categoryHref(c), c.description),
    ),
    ...posts.map((post) => link(post.title, postHref(post), post.excerpt)),
    "",
    "## Company",
    "",
    link("About", "/about"),
    link("Chris Ware, founder", "/about/chris-ware"),
    link("Contact", "/contact", "hello@fontsandfooters.com"),
    "",
  ].join("\n");

  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
