// The Leads Tool's areas, the parts any page can use: state names, how far
// a client can be from an area and still be in it, and the "All of
// Arizona" reach. Which areas are open is in the database (Admin → Leads
// Tool); this is the fixed part. Safe anywhere.

/** A city within this many miles of an area's center is in that area. */
export const AREA_MILES = 75;

/** "All of Arizona": every lead in the state's areas. */
export const STATEWIDE_MILES = 500;
/** States where clients can choose the whole state. */
export const STATEWIDE_STATES = ["AZ"];

export const RADII = [10, 25, 50, 75];

export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "Washington, DC",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

export const stateName = (code?: string | null) =>
  (code && STATE_NAMES[code.toUpperCase()]) || code || "";

export const statewide = (state?: string | null) =>
  Boolean(state) && STATEWIDE_STATES.includes(state!.toUpperCase());

/** The distances on offer in a state: "All of Arizona" where there is one. */
export const radiiFor = (state?: string | null) =>
  statewide(state) ? [...RADII, STATEWIDE_MILES] : RADII;

export const radiusLabel = (radius: number, state?: string | null) =>
  radius >= STATEWIDE_MILES ? `All of ${stateName(state)}` : `${radius} mi`;

/** "within 50 miles of Phoenix", or "across Arizona". */
export const reachText = (
  radius: number,
  city: string,
  state?: string | null,
) =>
  radius >= STATEWIDE_MILES
    ? `across ${stateName(state)}`
    : `within ${radius} miles of ${city}`;
