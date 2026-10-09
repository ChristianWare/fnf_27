// What we learn about a business, once for every client, refreshed every
// 90 days: whether their website shows a car service, a line about them,
// and the person who books the rides. Server only.

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { aiReady, askJson } from "./apis/ai";
import { apolloReady, revealPerson, searchPeople } from "./apis/apollo";
import {
  domainOf,
  pageLinks,
  pageText,
  publicUrl,
  readPage,
} from "./apis/http";
import { CATEGORIES, EVENT_TYPES } from "./catalog";
import { shareImage } from "./media";
import type { Who } from "./usage";
import type { AccountCategory, Contact, EventType } from "./types";

const DAY = 86_400_000;
export const RESEARCH_DAYS = 90;

export type Research = typeof schema.leadsResearch.$inferSelect;

export const fresh = (at: Date | null | undefined, days = RESEARCH_DAYS) =>
  Boolean(at && Date.now() - at.getTime() < days * DAY);

/* ── Car service ── */

const HAS_SERVICE =
  /\b(house car|courtesy (car|shuttle|van|vehicle)|complimentary (airport )?(shuttle|transportation|car)|airport (shuttle|transfers?|transportation)|chauffeur(ed)?|limousine service|limo service|car service|black car|transportation (partner|provider|services))\b/i;

/** What a business's own website says about getting guests around. */
export function carServiceFrom(text: string) {
  const m = HAS_SERVICE.exec(text);
  if (!m) return { status: "NONE" as const };
  const start = Math.max(0, text.lastIndexOf("\n", m.index) + 1);
  const stop = text.indexOf("\n", m.index);
  const snippet = text
    .slice(start, stop === -1 ? undefined : stop)
    .trim()
    .slice(0, 140);
  return {
    status: "HAS" as const,
    note: `Their site mentions "${m[0].toLowerCase()}"${snippet && snippet.length < 140 ? `: ${snippet}` : ""}`,
  };
}

async function save(key: string, values: Partial<Research>) {
  await db
    .insert(schema.leadsResearch)
    .values({ key, ...values })
    .onConflictDoUpdate({ target: schema.leadsResearch.key, set: values });
}

export async function researchFor(key: string) {
  const [row] = await db
    .select()
    .from(schema.leadsResearch)
    .where(eq(schema.leadsResearch.key, key))
    .limit(1);
  return row;
}

/**
 * Reads an account's website: whether they already have a car service,
 * and (with the AI) a line about them for the brief. Safe to run again.
 */
export async function researchPlace(
  place: {
    id: string;
    name: string;
    city: string;
    category: AccountCategory;
    website?: string | null;
  },
  who: Who,
) {
  const domain = domainOf(place.website);
  if (!place.website || !domain) {
    await save(place.id, {
      domain: null,
      carService: "UNKNOWN",
      checkedAt: new Date(),
      imageCheckedAt: new Date(),
      error: null,
    });
    return;
  }
  let text = "";
  let imageUrl: string | undefined;
  try {
    const page = await readPage(place.website, { limit: 800_000 });
    text = page ? pageText(page.body, 12_000) : "";
    imageUrl = page ? shareImage(page.body, page.url) : undefined;
  } catch (error) {
    await save(place.id, {
      domain,
      carService: "UNKNOWN",
      checkedAt: new Date(),
      imageCheckedAt: new Date(),
      error:
        error instanceof Error
          ? error.message.slice(0, 200)
          : "Couldn't read it.",
    });
    return;
  }
  const found = text ? carServiceFrom(text) : { status: "UNKNOWN" as const };
  let brief: string | undefined;
  let carService: "NONE" | "HAS" | "UNKNOWN" = found.status;
  let carServiceNote = "note" in found ? found.note : undefined;

  if (text.length > 300 && aiReady()) {
    const angle = CATEGORIES[place.category];
    try {
      const answer = await askJson<{
        brief: string;
        carService: "HAS" | "NONE" | "UNKNOWN";
        carServiceNote?: string;
      }>({
        model: "fast",
        who,
        maxTokens: 400,
        system:
          "You help a black car service size up a business before pitching it. Write plainly, like a sharp colleague. No hype, no guessing: only what the website says.",
        prompt: `Business: ${place.name} (${angle.label.toLowerCase()}) in ${place.city}.\nWhy businesses like this need a car service: ${angle.why}\n\nFrom their website text below:\n1. brief: one or two short sentences about this business that matter for the pitch (size, guests, events, who they serve). Under 45 words.\n2. carService: HAS if the site shows they already offer guests transportation (a shuttle, a house car, a chauffeur partner), NONE if it clearly doesn't, UNKNOWN if you can't tell.\n3. carServiceNote: when HAS, say what they offer in under 15 words.\n\nWebsite text:\n${text.slice(0, 8000)}`,
        schema: {
          type: "object",
          properties: {
            brief: { type: "string" },
            carService: { type: "string", enum: ["HAS", "NONE", "UNKNOWN"] },
            carServiceNote: { type: "string" },
          },
          required: ["brief", "carService"],
        },
      });
      if (answer?.brief) brief = answer.brief.trim().slice(0, 400);
      if (answer?.carService) {
        carService = answer.carService;
        carServiceNote =
          answer.carService === "HAS"
            ? (answer.carServiceNote?.trim() || carServiceNote)?.slice(0, 160)
            : undefined;
      }
    } catch (error) {
      console.error(`[leads] AI brief for ${place.name} failed:`, error);
    }
  }
  await save(place.id, {
    domain,
    carService,
    carServiceNote: carServiceNote ?? null,
    brief: brief ?? null,
    checkedAt: new Date(),
    imageUrl: imageUrl ?? null,
    imageCheckedAt: new Date(),
    error: null,
  });
}

/**
 * Just the picture a business's website shares, for businesses read before
 * we kept it. No AI, one page.
 */
export async function researchImage(place: {
  id: string;
  website?: string | null;
}) {
  let imageUrl: string | undefined;
  if (place.website && domainOf(place.website)) {
    const page = await readPage(place.website, { limit: 400_000 }).catch(
      () => undefined,
    );
    imageUrl = page ? shareImage(page.body, page.url) : undefined;
  }
  await db
    .update(schema.leadsResearch)
    .set({ imageUrl: imageUrl ?? null, imageCheckedAt: new Date() })
    .where(eq(schema.leadsResearch.key, place.id));
  return Boolean(imageUrl);
}

/* ── The decision-maker ── */

const FREE_MAIL =
  /@(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|aol|icloud|me|mac|comcast|cox|att|sbcglobal|verizon|protonmail|proton|gmx|mail)\.[a-z.]+$/i;

/** A work email at this business, or nothing. */
export function workEmail(email: string | undefined | null, domain?: string) {
  const value = email?.trim().toLowerCase();
  if (!value || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(value)) return undefined;
  if (FREE_MAIL.test(value)) return undefined;
  if (domain && !value.endsWith(`@${domain}`) && !value.endsWith(`.${domain}`))
    return undefined;
  return value;
}

/** Marketplaces an event's page might be on: not the organizer's own site. */
const MARKETPLACES =
  /(^|\.)(eventbrite|ticketmaster|livenation|axs|seetickets|universe|facebook|meetup|allevents|evvnt|google|instagram|linkedin|x|twitter|squarespace|wix|godaddysites)\.[a-z.]+$/i;

export const organizerDomain = (url?: string | null) => {
  const domain = domainOf(url);
  return domain && !MARKETPLACES.test(domain) ? domain : undefined;
};

const TEAM_LINK =
  /\b(team|staff|leadership|management|people|about|who we are|our story|contact|meet)\b/i;

type Person = { name: string; title: string; email?: string; phone?: string };

/** The people on a business's team or about pages, read by the AI. */
async function teamFromWebsite(
  home: string,
  domain: string,
  titles: string[],
  who: Who,
): Promise<Person | undefined> {
  if (!aiReady()) return undefined;
  const first = await readPage(home, { limit: 600_000 }).catch(() => undefined);
  if (!first) return undefined;
  const pages = [pageText(first.body, 6_000)];
  const links = pageLinks(first.body, first.url)
    .filter((l) => {
      const u = publicUrl(l.href);
      return (
        u &&
        u.hostname.replace(/^www\./, "") === domain &&
        TEAM_LINK.test(`${l.text} ${u.pathname.replace(/[-_/]/g, " ")}`)
      );
    })
    .map((l) => l.href.split("#")[0]);
  for (const href of [...new Set(links)].slice(0, 3)) {
    const page = await readPage(href, { limit: 600_000 }).catch(
      () => undefined,
    );
    if (page) pages.push(pageText(page.body, 8_000));
  }
  const text = pages.join("\n---\n").slice(0, 20_000);
  if (text.length < 40) return undefined;
  const answer = await askJson<{ found: boolean } & Partial<Person>>({
    model: "fast",
    who,
    maxTokens: 300,
    system:
      "You find the right person to pitch at a business, from its own website. Only use names and details that are on the pages. Never guess an email.",
    prompt: `We want the person who would book transportation. Best titles, in order: ${titles.join(", ")}. A close match is fine; an owner or general manager is fine for a small business.\n\nWebsite pages:\n${text}`,
    schema: {
      type: "object",
      properties: {
        found: { type: "boolean" },
        name: { type: "string" },
        title: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
      },
      required: ["found"],
    },
  });
  if (!answer?.found || !answer.name || !answer.title) return undefined;
  return {
    name: answer.name.trim(),
    title: answer.title.trim(),
    email: workEmail(answer.email, domain),
    phone: answer.phone?.trim() || undefined,
  };
}

/**
 * The person who books the rides: from the business's team page, then
 * Apollo. Work emails only. Shared by every client; looked up again after
 * 90 days.
 */
export async function findContact(
  target: {
    key: string;
    website?: string | null;
    kind: AccountCategory | EventType;
    isEvent: boolean;
  },
  who: Who,
): Promise<(Contact & { source: "TEAM_PAGE" | "APOLLO" }) | undefined> {
  const known = await researchFor(target.key);
  if (known && fresh(known.contactCheckedAt)) return known.contact ?? undefined;

  const domain = target.isEvent
    ? organizerDomain(target.website)
    : domainOf(target.website);
  const angle = target.isEvent
    ? EVENT_TYPES[target.kind as EventType]
    : CATEGORIES[target.kind as AccountCategory];
  let contact: (Contact & { source: "TEAM_PAGE" | "APOLLO" }) | undefined;
  let error: string | null = null;

  if (domain) {
    try {
      const home = publicUrl(target.website)?.origin ?? `https://${domain}`;
      const person = await teamFromWebsite(home, domain, angle.titles, who);
      if (person?.email) {
        contact = { ...person, verified: false, source: "TEAM_PAGE" };
      } else if (apolloReady()) {
        // Their email from Apollo: the person on the team page, or
        // whoever Apollo has with the right title.
        let found = person
          ? await revealPerson(who, { name: person.name, domain })
          : undefined;
        if (!found?.email) {
          const people = await searchPeople(domain, angle.titles, who);
          for (const p of people.slice(0, 2)) {
            found = await revealPerson(who, { id: p.id! });
            if (workEmail(found?.email, domain)) break;
          }
        }
        const email = workEmail(found?.email, domain);
        if (found && email) {
          contact = {
            name: found.name,
            title: found.title,
            email,
            phone: found.phone,
            verified: found.verified,
            source: "APOLLO",
          };
        } else if (person) {
          contact = { ...person, verified: false, source: "TEAM_PAGE" };
        }
      } else if (person) {
        contact = { ...person, verified: false, source: "TEAM_PAGE" };
      }
    } catch (e) {
      error = e instanceof Error ? e.message.slice(0, 200) : "Lookup failed.";
      console.error(`[leads] contact lookup for ${target.key} failed:`, e);
    }
  }
  // A failed lookup is tried again next time someone saves it.
  await save(
    target.key,
    error && !contact
      ? { domain: domain ?? null, error }
      : {
          domain: domain ?? null,
          contact: contact ?? null,
          contactCheckedAt: new Date(),
        },
  );
  return contact;
}
