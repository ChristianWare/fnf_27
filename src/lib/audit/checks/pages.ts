// Check 5, the pages riders search for: a page of its own for each kind of
// ride they offer (airport, corporate, wedding, events, hourly), a fleet
// page, and pages for the cities they serve. Found in the sitemap and the
// homepage's links, by address and link text. A kind of ride the site
// never mentions isn't counted against them. Server only.

import type { Service } from "../ai";
import type { SiteRead } from "../site";
import type { CheckResult, Part } from "../types";
import { list, noWebsite, num, part, plural, result, words } from "./parts";

type Intent = {
  id: string;
  label: string;
  max: number;
  /** In a page's address or link text. */
  page: RegExp;
  /** In the site's words: they offer it. */
  offered?: RegExp;
  service?: Service;
  /** The phrase riders search, for the volume beside it. */
  search?: string;
};

const INTENTS: Intent[] = [
  {
    id: "airport",
    label: "Airport rides",
    max: 25,
    page: /airport|sky-?harbor|terminal|\b(phx|sdl|aza|tus|lax|sfo|oak|sjc|jfk|lga|ewr|ord|mdw|dfw|dal|iah|hou|mia|fll|atl|sea|las|den|bos|msp|dtw|phl|clt|mco|san|slc|bna|aus|dca|iad|bwi)\b/i,
    offered: /airport/i,
    service: "airport",
    search: "airport car service",
  },
  {
    id: "fleet",
    label: "Your fleet",
    max: 15,
    page: /fleet|vehicles|our-cars|our-limos|\/cars\b|\bsuvs?\b|sedans?\b|sprinter|party-?bus|coach|limousines?$|limo-?bus/i,
  },
  {
    id: "corporate",
    label: "Corporate travel",
    max: 15,
    page: /corporate|business-travel|executive-(car|transport|travel)/i,
    offered: /corporate|business travel|executive travel/i,
    service: "corporate",
    search: "corporate car service",
  },
  {
    id: "wedding",
    label: "Weddings",
    max: 15,
    page: /wedding/i,
    offered: /wedding/i,
    service: "wedding",
    search: "wedding limo",
  },
  {
    id: "events",
    label: "Events and nights out",
    max: 10,
    page: /prom|homecoming|quince|bachelor|night-?out|concert|special-?event|events?\b|birthday|anniversar|wine|brewer/i,
    offered:
      /\bprom\b|special event|concert|night out|bachelor|quince|wine tour|sporting event/i,
    service: "events",
  },
  {
    id: "hourly",
    label: "Hourly service",
    max: 10,
    page: /hourly|as-directed|by-the-hour/i,
    offered: /hourly|as directed|by the hour/i,
    service: "hourly",
  },
];

/** Words in an address that aren't a place. */
const NOT_A_PLACE = new Set(
  "limo limos limousine limousines car cars service services black transportation transport chauffeur chauffeured driver drivers airport airports shuttle shuttles sedan sedans suv suvs party bus buses sprinter van vans luxury executive private premium best cheap affordable top professional corporate business wedding weddings prom events event hourly rates rate pricing price book booking reserve reservations quote contact about us our fleet the and in to from near me of for a with page pages home index html php az ca tx fl ny wa co nv il ga nc wine tour tours travel ride rides trip trips night out special town city cities area areas location locations serving served sky harbor international terminal rental rentals hire charter charters group groups transfer transfers pickup dropoff package packages deals specials faq faqs gallery photos reviews testimonials blog news careers jobs team policy policies terms service-area greater metro valley county".split(
    " ",
  ),
);

const SERVICE_SLUG =
  /limo|limousine|car-service|black-car|chauffeur|transport|shuttle|party-bus|sedan|suv/i;

/** Pages for one city: "/scottsdale-limo-service", "Car Service in Mesa". */
function cityPages(site: SiteRead, cities: string[]) {
  const named = cities.map((c) => c.toLowerCase());
  const found = new Map<string, string>();
  for (const { url, text } of site.known) {
    let path: string;
    try {
      path = new URL(url).pathname.toLowerCase();
    } catch {
      continue;
    }
    const slug = path.split("/").filter(Boolean).pop() ?? "";
    const place =
      named.find(
        (c) =>
          c.length > 2 &&
          (slug.includes(c.replace(/\s+/g, "-")) ||
            text.toLowerCase().includes(c)),
      ) ??
      (SERVICE_SLUG.test(slug)
        ? slug
            .split(/[-_]+/)
            .filter((w) => w.length > 2 && !NOT_A_PLACE.has(w) && !/\d/.test(w))
            .join(" ")
        : "");
    if (place && !found.has(place)) found.set(place, url);
  }
  return [...found.entries()].map(([place, url]) => ({ place, url }));
}

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
};

export function pagesCheck(input: {
  site?: SiteRead;
  services: Service[];
  cities: string[];
  city?: string;
  volumes?: Map<string, number>;
}): CheckResult {
  const { site } = input;
  if (!site)
    return noWebsite(
      "pages",
      "There's no website, so there are no pages for riders' searches to land on.",
      "A site with a page for each kind of ride you offer, and for each city you serve, is how riders' searches find you.",
    );

  const words_ = [site.home, ...site.pages]
    .map((p) => `${p.title} ${p.text}`)
    .join(" ");
  const offers = (intent: Intent) =>
    !intent.offered ||
    (intent.service && input.services.includes(intent.service)) ||
    intent.offered.test(words_);

  const parts: Part[] = [];
  const missingNames: string[] = [];
  for (const intent of INTENTS) {
    // Airport rides count for every car service, unless the site never says airport.
    if (!offers(intent)) continue;
    const hits = site.known.filter(({ url, text }) => {
      const path = pathOf(url);
      return (
        path !== "/" &&
        (intent.page.test(path) ||
          intent.page.test(text.toLowerCase().replace(/\s+/g, "-")))
      );
    });
    const volume =
      intent.search && input.city
        ? input.volumes?.get(`${intent.search} ${input.city.toLowerCase()}`)
        : undefined;
    const searchNote =
      volume && input.city
        ? ` "${intent.search} ${input.city.toLowerCase()}" gets about ${num(volume)} searches a month.`
        : "";
    if (!hits.length) missingNames.push(intent.label.toLowerCase());
    parts.push(
      part({
        id: intent.id,
        label: intent.label,
        max: intent.max,
        state: hits.length ? "good" : "missing",
        found: hits.length
          ? `You have a page for ${intent.label.toLowerCase()}.`
          : `No page for ${intent.label.toLowerCase()}.${searchNote}`,
        proof: hits
          .slice(0, 4)
          .map((h) => ({ label: pathOf(h.url), href: h.url })),
        fix: `Add a page for ${intent.label.toLowerCase()}.`,
      }),
    );
  }

  const base = input.city?.toLowerCase();
  const places = cityPages(
    site,
    input.cities.filter((c) => c.toLowerCase() !== base),
  ).filter((p) => p.place !== base);
  parts.push(
    part({
      id: "cities",
      label: "The cities you serve",
      max: 20,
      state:
        places.length >= 3 ? "good" : places.length ? "partial" : "missing",
      points: 10,
      found: places.length
        ? `You have ${words(places.length)} ${plural(places.length, "page")} for the cities you serve.`
        : "No pages for the cities you serve beyond your own.",
      proof: places
        .slice(0, 6)
        .map((p) => ({ label: pathOf(p.url), href: p.url })),
      fix: "Add a page for each city you serve most, with the city in the page title.",
    }),
  );
  if (!places.length) missingNames.push("each city you serve");

  const have = parts.filter((p) => p.state === "good").length;
  const found =
    have === parts.length
      ? "You have a page for every kind of ride we looked for, and for the cities you serve."
      : have === 0
        ? `You don't have a page for any of the ${words(parts.length)} things riders search for.`
        : `You have pages for ${words(have)} of the ${words(parts.length)} things riders search for.`;
  const fix = missingNames.length
    ? `Add a page for ${list(missingNames)}. Each one should name the city in its title and say what the ride includes and how to book it, so Google has a page to show for each search.`
    : undefined;
  return result("pages", parts, { found, fix });
}
