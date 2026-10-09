// Google News, weekly: hotels, venues and offices opening or moving in a
// market. The AI picks out the businesses; the market's run then finds
// them on Google. Server only.

import { aiReady, askJson } from "./ai";
import { call, decodeEntities } from "./http";
import { track, type Who } from "../usage";
import { ACCOUNT_CATEGORIES } from "../kinds";
import type { AccountCategory } from "../types";

export type NewsItem = { title: string; url: string; at: string };

async function headlines(query: string, who: Who): Promise<NewsItem[]> {
  const params = new URLSearchParams({
    q: query,
    hl: "en-US",
    gl: "US",
    ceid: "US:en",
  });
  const res = await call(`https://news.google.com/rss/search?${params}`, {
    timeout: 15_000,
  });
  track("news", who);
  if (!res.ok) return [];
  const xml = await res.text();
  return (xml.match(/<item>[\s\S]*?<\/item>/g) ?? [])
    .slice(0, 25)
    .map((item) => {
      const get = (name: string) =>
        decodeEntities(
          new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`).exec(
            item,
          )?.[1] ?? "",
        )
          .replace(/^<!\[CDATA\[|\]\]>$/g, "")
          .trim();
      const date = new Date(get("pubDate"));
      return {
        title: get("title"),
        url: get("link"),
        at: Number.isNaN(date.getTime())
          ? new Date().toISOString()
          : date.toISOString(),
      };
    });
}

export type Opening = {
  name: string;
  category: AccountCategory;
  city: string;
  news: NewsItem;
};

/** Businesses opening or moving near a city, from this week's news. */
export async function openings(city: string, state: string, who: Who) {
  if (!aiReady()) return [];
  const place = `${city} ${state}`;
  const queries = [
    `("hotel opening" OR "new hotel" OR "resort opens" OR "hotel opens") ${place} when:7d`,
    `("new headquarters" OR "relocates headquarters" OR "opens office" OR "moves headquarters") ${place} when:7d`,
    `("wedding venue" OR "event venue" OR "event center") (opens OR opening OR new) ${place} when:7d`,
    `("senior living" OR "country club" OR casino) (opens OR opening OR new) ${place} when:7d`,
  ];
  const items: NewsItem[] = [];
  for (const q of queries) {
    for (const item of await headlines(q, who)) {
      if (item.title && !items.some((i) => i.title === item.title))
        items.push(item);
    }
  }
  if (!items.length) return [];
  const list = items.slice(0, 40);
  const answer = await askJson<{
    businesses: {
      index: number;
      name: string;
      category: string;
      city: string;
    }[];
  }>({
    model: "fast",
    who,
    maxTokens: 2000,
    system:
      "You pick out businesses from news headlines for a black car service looking for new accounts. Only include a business when the headline says it is opening, newly built, or moving its offices to the area. Leave out anything else.",
    prompt: `Area: ${city}, ${state}. Headlines:\n${list
      .map((item, i) => `${i}. ${item.title}`)
      .join(
        "\n",
      )}\n\nFor each business opening or moving in the area, give the headline's number, the business's name as it would appear on Google Maps, its category (one of ${ACCOUNT_CATEGORIES.join(", ")}), and its city.`,
    schema: {
      type: "object",
      properties: {
        businesses: {
          type: "array",
          items: {
            type: "object",
            properties: {
              index: { type: "integer" },
              name: { type: "string" },
              category: { type: "string", enum: [...ACCOUNT_CATEGORIES] },
              city: { type: "string" },
            },
            required: ["index", "name", "category", "city"],
          },
        },
      },
      required: ["businesses"],
    },
  });
  const found: Opening[] = [];
  for (const b of answer?.businesses ?? []) {
    const news = list[b.index];
    if (!news || !b.name) continue;
    if (!(ACCOUNT_CATEGORIES as readonly string[]).includes(b.category))
      continue;
    found.push({
      name: b.name,
      category: b.category as AccountCategory,
      city: b.city || city,
      news,
    });
  }
  return found.slice(0, 15);
}
