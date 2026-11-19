// Previews (the demo sites made for a prospect): the markets to pick from
// when making one, and the photos each starts with. Safe anywhere.
//
// The markets match the demo platform's (fnf-demos, src/markets/): each
// brings its airports, areas, wording and photos. A preview only chooses
// the market and whether to swap in the prospect's own two photos.

export type DemoAirport = {
  code: string;
  name: string;
  kind: "commercial" | "private" | "tours";
};

export type DemoMarket = {
  /** The demo platform's market id (its DEMO_MARKET). */
  id: string;
  city: string;
  state: string;
  timeZone: string;
  airports: DemoAirport[];
  /** The neighborhoods and suburbs the site names. */
  areas: string[];
  /** A small copy of the market's home page hero, for the form. */
  heroThumb: string;
  /** Other states whose prospects this market fits (DC's suburbs). */
  alsoStates?: string[];
  /** How it's named, when "<city>, <state>" doesn't read right. */
  label?: string;
};

/** "Phoenix, AZ", "Washington, DC", "Florida (statewide)". */
export const marketLabel = (m: DemoMarket) => m.label ?? `${m.city}, ${m.state}`;

export const DEMO_MARKETS: DemoMarket[] = [
  {
    id: "las-vegas",
    city: "Las Vegas",
    state: "NV",
    timeZone: "Pacific",
    airports: [
      { code: "LAS", name: "Harry Reid International", kind: "commercial" },
      { code: "HND", name: "Henderson Executive", kind: "private" },
      { code: "VGT", name: "North Las Vegas", kind: "private" },
      { code: "BLD", name: "Boulder City", kind: "tours" },
    ],
    areas: [
      "The Strip",
      "Downtown",
      "Henderson",
      "Summerlin",
      "North Las Vegas",
      "Boulder City",
      "Lake Las Vegas",
    ],
    heroThumb: "/demos/las-vegas-hero.jpg",
  },
  {
    id: "phoenix",
    city: "Phoenix",
    state: "AZ",
    timeZone: "Arizona",
    airports: [
      { code: "PHX", name: "Sky Harbor", kind: "commercial" },
      { code: "AZA", name: "Mesa Gateway", kind: "commercial" },
      { code: "SDL", name: "Scottsdale", kind: "private" },
      { code: "DVT", name: "Deer Valley", kind: "private" },
    ],
    areas: [
      "Downtown Phoenix",
      "Scottsdale",
      "Tempe",
      "Mesa",
      "Chandler",
      "Paradise Valley",
      "Glendale",
    ],
    heroThumb: "/demos/phoenix-hero.jpg",
  },
  {
    id: "los-angeles",
    city: "Los Angeles",
    state: "CA",
    timeZone: "Pacific",
    airports: [
      { code: "LAX", name: "Los Angeles International", kind: "commercial" },
      { code: "BUR", name: "Hollywood Burbank", kind: "commercial" },
      { code: "LGB", name: "Long Beach", kind: "commercial" },
      { code: "VNY", name: "Van Nuys", kind: "private" },
    ],
    areas: [
      "Beverly Hills",
      "Santa Monica",
      "Hollywood",
      "Downtown",
      "Pasadena",
      "Burbank",
      "Malibu",
    ],
    heroThumb: "/demos/los-angeles-hero.jpg",
  },
  {
    id: "atlanta",
    city: "Atlanta",
    state: "GA",
    timeZone: "Eastern",
    airports: [
      { code: "ATL", name: "Hartsfield-Jackson", kind: "commercial" },
      { code: "PDK", name: "Peachtree-DeKalb", kind: "private" },
      { code: "FTY", name: "Fulton County", kind: "private" },
    ],
    areas: ["Buckhead", "Midtown", "Downtown", "Alpharetta", "Sandy Springs", "Decatur", "The Battery Atlanta"],
    heroThumb: "/demos/atlanta-hero.jpg",
  },
  {
    id: "washington-dc",
    city: "Washington, DC",
    state: "DC",
    alsoStates: ["MD", "VA"],
    label: "Washington, DC",
    timeZone: "Eastern",
    airports: [
      { code: "DCA", name: "Reagan National", kind: "commercial" },
      { code: "IAD", name: "Dulles", kind: "commercial" },
      { code: "BWI", name: "BWI", kind: "commercial" },
      { code: "HEF", name: "Manassas", kind: "private" },
    ],
    areas: ["Georgetown", "Downtown", "Capitol Hill", "Arlington", "Alexandria", "Bethesda", "Tysons"],
    heroThumb: "/demos/washington-dc-hero.jpg",
  },
  {
    id: "florida",
    city: "Florida",
    state: "FL",
    label: "Florida (statewide)",
    timeZone: "Eastern",
    airports: [
      { code: "MIA", name: "Miami International", kind: "commercial" },
      { code: "FLL", name: "Fort Lauderdale", kind: "commercial" },
      { code: "PBI", name: "Palm Beach", kind: "commercial" },
      { code: "MCO", name: "Orlando", kind: "commercial" },
      { code: "TPA", name: "Tampa", kind: "commercial" },
      { code: "JAX", name: "Jacksonville", kind: "commercial" },
      { code: "OPF", name: "Opa-locka", kind: "private" },
    ],
    areas: [
      "Miami Beach",
      "Brickell & Downtown Miami",
      "Fort Lauderdale",
      "Palm Beach",
      "Orlando",
      "Tampa & St. Pete",
      "Jacksonville",
    ],
    heroThumb: "/demos/florida-hero.jpg",
  },
];

/** The About page photo every market starts with (small copy). */
export const DEMO_ABOUT_THUMB = "/demos/about-hero.jpg";

/** The market that fits a prospect's state, else Las Vegas. */
export function marketFor(state: string): DemoMarket {
  const st = state.trim().toUpperCase();
  return DEMO_MARKETS.find((m) => m.state === st || m.alsoStates?.includes(st)) ?? DEMO_MARKETS[0];
}

export const DEMO_DAYS = [14, 30, 45] as const;

export const DEMO_DOMAIN = "demo.fontsandfooters.com";

/** "Desert Star Limousine" → "desert-star-limousine" */
export function demoSlug(business: string) {
  return (
    business
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/-+$/, "") || "preview"
  );
}

export const demoUrl = (slug: string) => `https://${slug}.${DEMO_DOMAIN}`;
