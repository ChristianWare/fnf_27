// The audit's uses of the AI (Claude, through ANTHROPIC_API_KEY): telling a
// car service from any other business, reading a site the way an AI
// assistant would, looking at the first screen on a phone, and writing the
// fixes. Every answer comes back in a set shape, and anything it quotes is
// checked against the page before it's believed. Without the key, the
// audit still runs; the checks that need the AI say they couldn't check.
// Server only.

import { aiReady, askJson } from "@/lib/leads/apis/ai";
import type { Cost } from "./cost";
import type { Page } from "./site";

export { aiReady };

/* ── Is this a car service? ── */

export async function isCarService(
  text: string,
  cost: Cost,
): Promise<boolean | undefined> {
  if (!aiReady()) return undefined;
  const answer = await askJson<{ carService: boolean }>({
    model: "fast",
    system:
      "You sort websites. A ground transportation company is a business that drives people: black car, limousine, chauffeur, airport car service, sedan or SUV service, party bus, sprinter or shuttle charters, wine or tour transportation. Taxis count. Ride-hailing apps, car rentals, car dealers, auto repair, travel agents and directories don't.",
    prompt: `Is this the website of a ground transportation company?\n\n${text.slice(0, 4_000)}`,
    schema: {
      type: "object",
      properties: { carService: { type: "boolean" } },
      required: ["carService"],
    },
    maxTokens: 100,
    who: {},
    onCost: (m) => cost.addMicros(m),
  });
  return answer?.carService;
}

/* ── Reading the site like an AI assistant ── */

export const SERVICES = [
  "airport",
  "corporate",
  "wedding",
  "prom",
  "events",
  "hourly",
  "tours",
  "party_bus",
  "long_distance",
] as const;

export type Service = (typeof SERVICES)[number];

export const FACTS = [
  "cities",
  "airports",
  "vehicles",
  "booking",
  "policies",
] as const;

export type FactId = (typeof FACTS)[number];

export type Fact = {
  found: boolean;
  summary?: string;
  quote?: string;
  url?: string;
};

export type SiteReading = {
  services: Service[];
  cities: string[];
  facts: Record<FactId, Fact>;
};

const FACT_QUESTIONS: Record<FactId, string> = {
  cities: "Which cities or areas they serve",
  airports: "Which airports they serve",
  vehicles: "What vehicles they have (kinds, or how many people each seats)",
  booking: "How a rider books a ride (online, by phone, a form…)",
  policies:
    "At least one rider policy: cancellation, waiting time, child seats, gratuity or payment",
};

const normal = (text: string) =>
  text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9$'"%&@.,:/ -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** True when the quote really is on one of the pages. */
function onPage(quote: string, pages: Page[]) {
  const q = normal(quote);
  if (q.length < 4) return false;
  const texts = pages.map((p) => normal(`${p.title} ${p.text}`));
  if (texts.some((t) => t.includes(q))) return true;
  // A long quote that's slightly off: its first eight words will do.
  const start = q.split(" ").slice(0, 8).join(" ");
  return start.length >= 20 && texts.some((t) => t.includes(start));
}

export async function readSite(
  pages: Page[],
  cost: Cost,
): Promise<SiteReading | undefined> {
  if (!aiReady() || !pages.length) return undefined;
  const material = pages
    .slice(0, 9)
    .map((p) => `PAGE ${p.url}\nTitle: ${p.title}\n${p.text.slice(0, 2_600)}`)
    .join("\n\n---\n\n");

  const fact = {
    type: "object",
    properties: {
      found: { type: "boolean" },
      summary: {
        type: "string",
        description:
          'What the site says, in at most 12 words, written to finish the sentence "It can tell…": start lowercase unless it starts with a name.',
      },
      quote: {
        type: "string",
        description:
          "Words copied exactly from the page that say it, at most 25. Empty when not found.",
      },
      url: { type: "string", description: "The PAGE address it's on." },
    },
    required: ["found"],
  };

  const answer = await askJson<{
    services?: string[];
    cities?: string[];
    facts?: Partial<Record<FactId, Fact>>;
  }>({
    model: "good",
    system:
      "You are an AI assistant deciding whether you could recommend a car service to a rider, using only the text of its website below. Read it literally: something counts only when the text plainly says it. Never guess or fill in from what businesses like this usually offer.",
    prompt: `Here are pages from one car service's website.\n\n${material}\n\nFrom the text alone, answer:\n- services: the kinds of rides they say they offer.\n- cities: the cities or areas they say they serve (place names only, at most 15).\n- facts: for each of these, whether the text plainly states it, with an exact quote:\n${FACTS.map((id) => `  - ${id}: ${FACT_QUESTIONS[id]}`).join("\n")}`,
    schema: {
      type: "object",
      properties: {
        services: {
          type: "array",
          items: { type: "string", enum: [...SERVICES] },
        },
        cities: { type: "array", items: { type: "string" } },
        facts: {
          type: "object",
          properties: Object.fromEntries(FACTS.map((id) => [id, fact])),
          required: [...FACTS],
        },
      },
      required: ["services", "cities", "facts"],
    },
    maxTokens: 1_500,
    who: {},
    onCost: (m) => cost.addMicros(m),
  });
  if (!answer) return undefined;

  const facts = {} as Record<FactId, Fact>;
  for (const id of FACTS) {
    const f = answer.facts?.[id];
    // Only believe what it can quote from the page.
    const real = Boolean(f?.found && f.quote && onPage(f.quote, pages));
    facts[id] = real
      ? {
          found: true,
          summary: f?.summary?.slice(0, 120),
          quote: f?.quote?.slice(0, 240),
          url: pages.some((p) => p.url === f?.url) ? f?.url : undefined,
        }
      : { found: false };
  }
  return {
    services: (answer.services ?? []).filter((s): s is Service =>
      (SERVICES as readonly string[]).includes(s),
    ),
    cities: [
      ...new Set(
        (answer.cities ?? [])
          .map((c) => c.replace(/\s+/g, " ").trim())
          .filter((c) => c.length > 1 && c.length < 40),
      ),
    ].slice(0, 15),
    facts,
  };
}

/* ── The first screen on a phone ── */

export type FirstScreen = { phone: boolean; book: boolean; seen: string };

export async function readFirstScreen(
  screenshot: string,
  cost: Cost,
): Promise<FirstScreen | undefined> {
  if (!aiReady()) return undefined;
  const m = screenshot.match(/^data:(image\/[a-z]+);base64,(.+)$/);
  if (!m) return undefined;
  const answer = await askJson<FirstScreen>({
    model: "fast",
    system:
      "You look at the first screen of a website on a phone, exactly as shown, the way a rider about to book a car would.",
    prompt:
      "Without scrolling: (1) phone: is a phone number or a call button visible? (2) book: is a button or form to book, reserve or get a quote visible? (3) seen: in at most 18 words, what a rider sees first.",
    schema: {
      type: "object",
      properties: {
        phone: { type: "boolean" },
        book: { type: "boolean" },
        seen: { type: "string" },
      },
      required: ["phone", "book", "seen"],
    },
    images: [{ mime: m[1], data: m[2] }],
    maxTokens: 200,
    who: {},
    onCost: (c) => cost.addMicros(c),
  });
  return answer
    ? {
        phone: answer.phone,
        book: answer.book,
        seen: answer.seen.slice(0, 160),
      }
    : undefined;
}

/* ── The fixes ── */

export type FixRequest = {
  id: string;
  name: string;
  /** What we found, part by part. */
  findings: string[];
  /** The fix we'd write without the AI. */
  draft: string;
};

/**
 * One fix per check, written for this site from what the audit found. The
 * drafts stand when there's no AI, or when it adds nothing.
 */
export async function writeFixes(
  business: string,
  context: string[],
  checks: FixRequest[],
  cost: Cost,
): Promise<Record<string, string>> {
  if (!aiReady() || !checks.length) return {};
  const answer = await askJson<{ fixes?: { id: string; fix: string }[] }>({
    model: "good",
    system:
      "You write the fixes in a website audit for a black car or limo operator: plain, direct English an owner can act on or hand to any developer. Use only the findings given. Never add numbers, statistics, prices or promises that aren't in them, and never name a company that sells websites.",
    prompt: `The business: ${business}.\n${context.join("\n")}\n\nFor each check, write the fix in one or two sentences, specific to what was found (name the page, the search or the listing where it helps). Start with what to do.\n\n${checks
      .map(
        (c) =>
          `CHECK ${c.id} (${c.name})\nFound:\n${c.findings.map((f) => `- ${f}`).join("\n")}\nDraft fix: ${c.draft}`,
      )
      .join("\n\n")}`,
    schema: {
      type: "object",
      properties: {
        fixes: {
          type: "array",
          items: {
            type: "object",
            properties: { id: { type: "string" }, fix: { type: "string" } },
            required: ["id", "fix"],
          },
        },
      },
      required: ["fixes"],
    },
    maxTokens: 1_400,
    who: {},
    onCost: (m) => cost.addMicros(m),
  });
  const asked = new Set(checks.map((c) => c.id));
  const out: Record<string, string> = {};
  for (const f of answer?.fixes ?? []) {
    if (!asked.has(f.id)) continue;
    const text = f.fix?.replace(/\s+/g, " ").trim();
    if (text && text.length > 20 && text.length < 600) out[f.id] = text;
  }
  return out;
}
