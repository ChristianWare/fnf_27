// Previews (the demo sites made for a prospect): the markets, services and
// vehicles to pick from when making one. Safe anywhere.
//
// For now this only feeds the screens. A market marked "ready" has its
// airports, areas and sample trips built on the demo platform; the others
// are still to do.

export type DemoAirport = {
  code: string;
  name: string;
  kind: "commercial" | "private";
};

export type DemoMarket = {
  id: string;
  city: string;
  state: string;
  /** Built on the demo platform yet. */
  ready: boolean;
  timeZone: string;
  airports: DemoAirport[];
  /** The neighborhoods and suburbs the site names. */
  areas: string[];
};

export const DEMO_MARKETS: DemoMarket[] = [
  {
    id: "las-vegas",
    city: "Las Vegas",
    state: "NV",
    ready: true,
    timeZone: "Pacific",
    airports: [
      { code: "LAS", name: "Harry Reid International", kind: "commercial" },
      { code: "HND", name: "Henderson Executive", kind: "private" },
      { code: "VGT", name: "North Las Vegas", kind: "private" },
    ],
    areas: ["The Strip", "Downtown", "Henderson", "Summerlin", "Lake Las Vegas"],
  },
  {
    id: "phoenix",
    city: "Phoenix",
    state: "AZ",
    ready: false,
    timeZone: "Arizona",
    airports: [
      { code: "PHX", name: "Sky Harbor", kind: "commercial" },
      { code: "AZA", name: "Mesa Gateway", kind: "commercial" },
      { code: "SDL", name: "Scottsdale Airport", kind: "private" },
      { code: "DVT", name: "Deer Valley", kind: "private" },
      { code: "FFZ", name: "Falcon Field", kind: "private" },
    ],
    areas: ["Scottsdale", "Tempe", "Mesa", "Chandler", "Glendale", "Paradise Valley"],
  },
  {
    id: "atlanta",
    city: "Atlanta",
    state: "GA",
    ready: false,
    timeZone: "Eastern",
    airports: [
      { code: "ATL", name: "Hartsfield-Jackson", kind: "commercial" },
      { code: "PDK", name: "DeKalb-Peachtree", kind: "private" },
      { code: "FTY", name: "Fulton County", kind: "private" },
    ],
    areas: ["Buckhead", "Midtown", "Downtown", "Alpharetta", "Sandy Springs"],
  },
];

/** The market that fits a prospect's state, else the first ready one. */
export function marketFor(state: string): DemoMarket {
  return (
    DEMO_MARKETS.find((m) => m.state === state.toUpperCase()) ??
    DEMO_MARKETS.find((m) => m.ready) ??
    DEMO_MARKETS[0]
  );
}

export const DEMO_SERVICES = [
  { id: "airport", label: "Airport transfers", on: true },
  { id: "point", label: "Point to point", on: true },
  { id: "hourly", label: "Hourly chauffeur", on: true },
  { id: "corporate", label: "Corporate travel", on: true },
  { id: "events", label: "Weddings and events", on: false },
  { id: "nights", label: "Nights out and concerts", on: false },
  { id: "long", label: "Long distance", on: false },
  { id: "tours", label: "Tours and wine country", on: false },
] as const;

export const DEMO_VEHICLES = [
  { id: "sedan", label: "Sedan", seats: "Up to 3", on: true },
  { id: "suv", label: "SUV", seats: "Up to 6", on: true },
  { id: "sprinter", label: "Sprinter van", seats: "Up to 14", on: false },
  { id: "limo", label: "Stretch limo", seats: "Up to 10", on: false },
  { id: "coach", label: "Mini coach", seats: "Up to 28", on: false },
  { id: "party", label: "Party bus", seats: "Up to 30", on: false },
] as const;

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
