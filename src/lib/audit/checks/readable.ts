// Check 6, AI readability: whether ChatGPT and other AI assistants can tell
// what a rider needs from the site's own words. An AI reads the pages the
// way an assistant would and must quote the site for each fact; a quote we
// can't find on the page doesn't count. Then three things that decide
// whether AI crawlers can read the site at all. Server only.

import type { FactId, SiteReading } from "../ai";
import { blocksSite, type SiteRead } from "../site";
import type { CheckResult, Part } from "../types";
import { list, losses, noWebsite, part, result, skipped } from "./parts";

const QUESTIONS: Record<FactId, { label: string; missing: string }> = {
  cities: {
    label: "The cities you serve",
    missing: "It can't tell which cities or areas you serve.",
  },
  airports: {
    label: "The airports you serve",
    missing: "It can't tell which airports you serve.",
  },
  vehicles: {
    label: "Your vehicles",
    missing: "It can't tell what vehicles you have or how many each seats.",
  },
  booking: {
    label: "How to book",
    missing: "It can't tell how a rider books with you.",
  },
  policies: {
    label: "Your policies",
    missing:
      "It can't find your rules for riders: cancellation, waiting time, child seats or payment.",
  },
};

/** The crawlers behind the AI assistants riders use. */
export const AI_BOTS: [agent: string, who: string][] = [
  ["GPTBot", "OpenAI"],
  ["OAI-SearchBot", "ChatGPT search"],
  ["ChatGPT-User", "ChatGPT"],
  ["ClaudeBot", "Anthropic"],
  ["Claude-SearchBot", "Claude search"],
  ["PerplexityBot", "Perplexity"],
  ["Google-Extended", "Google's AI"],
  ["Applebot-Extended", "Apple Intelligence"],
];

const BUSINESS_TYPES =
  /localbusiness|taxi|limo|automotive|transport|travelagency|professionalservice|organization/i;

export function readableCheck(input: {
  site?: SiteRead;
  reading?: SiteReading;
  /** They offer airport rides (so the airports question counts). */
  airport: boolean;
}): CheckResult {
  const { site, reading } = input;
  if (!site)
    return noWebsite(
      "ai",
      "There's no website for AI assistants to read, so they can only go on what others say about you.",
      "A website that says plainly where you drive, what you drive and how to book is what AI assistants read before they recommend a car service.",
    );
  if (!reading)
    return skipped(
      "ai",
      "The AI reader couldn't run this time, so AI readability isn't scored.",
    );

  const parts: Part[] = [];
  const facts = (Object.keys(QUESTIONS) as FactId[]).filter(
    (id) => id !== "airports" || input.airport,
  );
  for (const id of facts) {
    const f = reading.facts[id];
    parts.push(
      part({
        id,
        label: QUESTIONS[id].label,
        max: 12,
        primary: true,
        state: f?.found ? "good" : "missing",
        found: f?.found
          ? `It can tell ${QUESTIONS[id].label.toLowerCase()}${f.summary ? `: ${f.summary.replace(/\.$/, "")}` : ""}.`
          : QUESTIONS[id].missing,
        quote: f?.found ? f.quote : undefined,
        proof:
          f?.found && f.url
            ? [{ label: f.url.replace(/^https?:\/\//, ""), href: f.url }]
            : undefined,
        fix: "Say it in plain words on your site.",
      }),
    );
  }

  // Business details in the page's code (schema.org), for machines.
  const schema = [site.home, ...site.pages].flatMap((p) => p.schema);
  const business = schema.find(
    (s) =>
      s.types.some(
        (t) => BUSINESS_TYPES.test(t) && !/^organization$/i.test(t),
      ) ||
      (s.telephone && (s.city || s.areaServed.length)),
  );
  const org = schema.find((s) =>
    s.types.some((t) => /organization|website/i.test(t)),
  );
  parts.push(
    part({
      id: "schema",
      label: "Business details for machines",
      max: 15,
      state: business ? "good" : org ? "partial" : "missing",
      points: 7,
      found: business
        ? `Your site describes the business in code AI tools read (${business.types.join(", ") || "schema.org"}).`
        : org
          ? "Your site's code names the business, but not as a local business with a phone and service area."
          : "Your site's code doesn't describe the business (no schema.org details).",
      fix: "Add LocalBusiness details (schema.org) with your name, phone, service area and hours; most site builders have a setting or plugin for it.",
    }),
  );

  // Crawlers kept out by robots.txt.
  const everyone =
    site.robots.found &&
    blocksSite(site.robots, "*") &&
    !site.robots.groups.some((g) => g.agents.some((a) => a !== "*"));
  const blocked = site.robots.found
    ? AI_BOTS.filter(([agent]) => blocksSite(site.robots, agent))
    : [];
  parts.push(
    part({
      id: "crawlers",
      label: "AI crawlers let in",
      max: 15,
      state:
        everyone || blocked.length === AI_BOTS.length
          ? "missing"
          : blocked.length
            ? "partial"
            : "good",
      points: 7,
      found: everyone
        ? "Your robots.txt keeps every crawler out, AI ones included."
        : blocked.length
          ? `Your robots.txt keeps out ${list(blocked.map(([agent, who]) => `${agent} (${who})`))}.`
          : "Nothing in your robots.txt keeps AI crawlers out.",
      fix: `Remove the robots.txt lines that block ${blocked.length ? list(blocked.map(([agent]) => agent)) : "AI crawlers"}, unless you meant to keep them out. If you use Cloudflare, check its setting for blocking AI bots too.`,
    }),
  );

  // Words that are there before any script runs.
  const w = site.home.words;
  parts.push(
    part({
      id: "text",
      label: "Words that load without scripts",
      max: 10,
      state: w >= 200 ? "good" : w >= 60 ? "partial" : "missing",
      points: 5,
      found:
        w >= 200
          ? "Your homepage's words are in the page itself, where any crawler can read them."
          : `Your homepage has only ${w} words before scripts run, and many AI crawlers don't run scripts.`,
      fix: "Make sure your main text is in the page itself, not added by scripts after it loads.",
    }),
  );

  const known = parts.filter((p) => facts.includes(p.id as FactId));
  const got = known.filter((p) => p.state === "good");
  const missing = known
    .filter((p) => p.state !== "good")
    .map((p) => QUESTIONS[p.id as FactId].label.toLowerCase());
  const found =
    got.length === known.length
      ? "An AI reading your site can tell where you drive, what you drive, how to book and your policies."
      : `An AI reading your site can't tell ${list(missing)}.`;
  const other = losses(parts).find((p) => !facts.includes(p.id as FactId))?.fix;
  const fix =
    [
      missing.length
        ? `Say it in plain words on your site: ${list(missing)}. An FAQ page is an easy place for the policies.`
        : undefined,
      other,
    ]
      .filter(Boolean)
      .join(" ") || undefined;
  return result("ai", parts, { found, ...(fix ? { fix } : {}) });
}
