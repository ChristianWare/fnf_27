// What each kind of lead is, who books the rides there, why they need a
// car service, and what to offer first. The briefs and scripts are built
// from these, so the advice stays the same everywhere.

import type { IconName } from "@/components/Dashboard/icons";
import type { AccountCategory, EventType, SourceId } from "./types";

type Angle = {
  label: string;
  /** Who you drive for, in a sentence: "hotels and resorts". */
  audience: string;
  /** One word, for chips and lists. */
  short: string;
  icon: IconName;
  /** Who to ask for. */
  who: string;
  /** Their job titles, for finding them (most likely first). */
  titles: string[];
  why: string;
  season: string;
  /** What to offer first. */
  offer: string;
  /** How the email opens, after "I run …". */
  hook: string;
  subject: string;
};

export const CATEGORIES: Record<AccountCategory, Angle> = {
  HOTEL: {
    audience: "hotels and resorts",
    label: "Hotels and resorts",
    short: "Hotel",
    icon: "home",
    who: "the Director of Sales or the Chief Concierge",
    titles: [
      "Director of Sales",
      "Chief Concierge",
      "Concierge",
      "Director of Sales and Marketing",
      "General Manager",
    ],
    why: "Guests need airport runs, dinner reservations and tee times, and the concierge needs a car they can count on at short notice.",
    season:
      "January to April is peak season in the Valley. Summer is quieter, but corporate groups keep coming.",
    offer:
      "a direct line for the concierge desk and a set guest rate to the airport",
    hook: "your guests are the people we drive every day: airport runs, dinner reservations, early tee times",
    subject: "A car your concierge can count on",
  },
  VENUE: {
    audience: "wedding venues",
    label: "Wedding and event venues",
    short: "Venue",
    icon: "star",
    who: "the Events Manager or Venue Coordinator",
    titles: [
      "Events Manager",
      "Venue Coordinator",
      "Event Coordinator",
      "Venue Manager",
      "Director of Events",
    ],
    why: "Every wedding and party needs the couple, the wedding party and the guests moved between hotels and the venue, and couples ask the venue who to call.",
    season:
      "Wedding season runs October to May here. Couples book transportation 3 to 6 months out.",
    offer:
      "a spot on their preferred vendor list, with a rate for their couples",
    hook: "the couples you host ask about getting their wedding party and guests to and from your venue",
    subject: "Transportation for your couples",
  },
  CORPORATE: {
    audience: "companies",
    label: "Corporate offices",
    short: "Corporate",
    icon: "users",
    who: "the Travel Manager or the CEO's Executive Assistant",
    titles: [
      "Travel Manager",
      "Executive Assistant to the CEO",
      "Executive Assistant",
      "Office Manager",
    ],
    why: "Executives and visiting clients need rides between the airport, the office and dinners, and one account can mean rides every week.",
    season:
      "Steady all year, with peaks around quarterly meetings, board visits and conference season.",
    offer: "a corporate account with monthly invoicing and one number to call",
    hook: "your executives and visiting clients need reliable rides to the airport and client dinners",
    subject: "Executive transportation for your team",
  },
  LAW: {
    audience: "law firms",
    label: "Law firms",
    short: "Law firm",
    icon: "shield",
    who: "the Office Manager or the Managing Partner's assistant",
    titles: [
      "Office Manager",
      "Firm Administrator",
      "Office Administrator",
      "Executive Assistant",
    ],
    why: "Partners, out-of-town clients and expert witnesses need discreet, on-time rides to court, depositions and the airport.",
    season: "Steady all year. Trial dates bring busy weeks.",
    offer:
      "a firm account billed monthly, with drivers who know the courthouses",
    hook: "your partners and out-of-town clients need discreet, on-time rides to court and the airport",
    subject: "Discreet rides for your partners and clients",
  },
  FUNERAL: {
    audience: "funeral homes",
    label: "Funeral homes",
    short: "Funeral home",
    icon: "clock",
    who: "the Funeral Director",
    titles: ["Funeral Director", "General Manager", "Owner"],
    why: "Families need a limousine to and from the service and the cemetery, often at a few days' notice.",
    season: "All year, always at short notice.",
    offer: "family limousines on short notice, with a flat rate per service",
    hook: "the families you serve often need a limousine to and from the service, at a few days' notice",
    subject: "Family limousines, on short notice",
  },
  GOLF: {
    audience: "golf clubs",
    label: "Golf and country clubs",
    short: "Golf club",
    icon: "target",
    who: "the Director of Membership or the Events Director",
    titles: [
      "Director of Membership",
      "Membership Director",
      "Events Director",
      "General Manager",
    ],
    why: "Members, guests and tournament players need rides between the club, resorts and the airport.",
    season:
      "Tournament and member-guest season runs January to April, the busiest stretch of the year.",
    offer: "member and tournament transportation, with a member rate",
    hook: "your members and their guests need rides between the club, their resorts and the airport",
    subject: "Transportation for your members and tournaments",
  },
  CASINO: {
    audience: "casinos",
    label: "Casinos",
    short: "Casino",
    icon: "sparkle",
    who: "the VIP Host Manager",
    titles: [
      "VIP Host Manager",
      "Executive Host",
      "Director of Player Development",
    ],
    why: "VIP hosts comp rides for their best players, from the airport and home after a late night.",
    season: "All year, with big weekends around concerts and holidays.",
    offer: "on-call cars for the VIP hosts, billed to the casino",
    hook: "your hosts look after players who expect a car from the airport and a ride home after a late night",
    subject: "Cars for your VIP players",
  },
  SENIOR: {
    audience: "senior communities",
    label: "Senior living",
    short: "Senior living",
    icon: "user",
    who: "the Executive Director or the Life Enrichment Director",
    titles: [
      "Executive Director",
      "Life Enrichment Director",
      "Activities Director",
    ],
    why: "Residents need rides to appointments, family events and the airport, and families pay for a service they trust.",
    season: "All year, with outings around the holidays.",
    offer: "a resident rate and a standing weekly appointment run",
    hook: "your residents need safe rides to appointments, family events and the airport",
    subject: "Rides your residents' families can trust",
  },
  TOURS: {
    audience: "tour companies",
    label: "Tours and wineries",
    short: "Tours",
    icon: "globe",
    who: "the Owner or the Tour Operations Manager",
    titles: ["Owner", "Tour Operations Manager", "Operations Manager"],
    why: "Tour and tasting groups need a driver for the day, and they send work to the car services they trust.",
    season: "Spring and fall are the busy seasons.",
    offer: "day-trip packages for their groups, and referrals both ways",
    hook: "your guests need a driver for the day so they can enjoy the tastings",
    subject: "A driver for your tasting groups",
  },
};

export const EVENT_TYPES: Record<EventType, Angle> = {
  GALA: {
    audience: "galas and fundraisers",
    label: "Galas and fundraisers",
    short: "Gala",
    icon: "sparkle",
    who: "the Event Chair or the Development Director",
    titles: [
      "Event Chair",
      "Development Director",
      "Director of Development",
      "Events Manager",
    ],
    why: "Sponsors and honorees arrive together and want a proper entrance, and after an open bar everyone needs a safe ride home.",
    season: "",
    offer:
      "a sponsor arrival package: cars from the hotels, a red-carpet drop-off and rides home",
    hook: "sponsors and honorees will want a proper arrival, and a safe ride home after the open bar",
    subject: "Arrivals and rides home for {event}",
  },
  CONFERENCE: {
    audience: "conferences",
    label: "Conferences and trade shows",
    short: "Conference",
    icon: "users",
    who: "the Event Manager or the speaker coordinator",
    titles: [
      "Event Manager",
      "Conference Manager",
      "Speaker Coordinator",
      "Director of Events",
    ],
    why: "Speakers and executives fly in and need to get between the airport, their hotel and the venue on time.",
    season: "",
    offer:
      "airport pickups for speakers and a shuttle loop between the host hotels",
    hook: "your speakers and executives will need to get between the airport, their hotels and the venue",
    subject: "Speaker and VIP transportation for {event}",
  },
  BUSINESS: {
    audience: "business events",
    label: "Business dinners and awards",
    short: "Business",
    icon: "users",
    who: "the Events Director",
    titles: ["Events Director", "Event Manager", "Director of Events"],
    why: "Honorees, board members and guests want to arrive together and get home safely.",
    season: "",
    offer: "rides for honorees and the board, with a member rate",
    hook: "your honorees and board members will want to arrive together and get home safely",
    subject: "Rides for your honorees at {event}",
  },
  FESTIVAL: {
    audience: "festivals",
    label: "Festivals",
    short: "Festival",
    icon: "zap",
    who: "the Festival Director or the VIP and hospitality lead",
    titles: ["Festival Director", "Hospitality Manager", "VIP Manager"],
    why: "Parking is the worst part of a festival, so groups and VIP guests would rather ride together.",
    season: "",
    offer:
      "group and party bus packages from the main hotels, plus artist and VIP runs",
    hook: "your VIP guests and artists will need rides, and groups would rather skip the parking",
    subject: "VIP and group rides for {event}",
  },
  CONCERT: {
    audience: "concerts and games",
    label: "Concerts and games",
    short: "Concert",
    icon: "zap",
    who: "the venue's Premium Seating or Suites Manager",
    titles: [
      "Premium Seating Manager",
      "Suites Manager",
      "Director of Premium Seating",
    ],
    why: "Suite holders and groups want to arrive together and skip the parking lots.",
    season: "",
    offer: "group rides for suite holders and a pickup point after the show",
    hook: "your suite holders and groups would rather ride together and skip the parking",
    subject: "Group rides for {event}",
  },
  GRADUATION: {
    audience: "graduations",
    label: "Graduations",
    short: "Graduation",
    icon: "star",
    who: "the Events Office or Parent and Family Programs",
    titles: [
      "Events Coordinator",
      "Director of Events",
      "Parent and Family Programs Director",
    ],
    why: "Families fly in for the day and need to get between the airport, hotels and the ceremony.",
    season: "",
    offer: "family packages from the airport and the hotels near campus",
    hook: "families flying in for the ceremony will need to get between the airport, their hotels and campus",
    subject: "Family transportation for {event}",
  },
  WEDDING_SHOW: {
    audience: "couples and wedding pros",
    label: "Wedding shows",
    short: "Wedding show",
    icon: "star",
    who: "the Show Producer or Vendor Coordinator",
    titles: ["Show Producer", "Vendor Coordinator", "Owner"],
    why: "Hundreds of couples book their vendors at these shows, and the producer decides who gets a booth.",
    season: "",
    offer: "a booth or featured-vendor spot, with a show-only rate for couples",
    hook: "couples at the show will be booking their wedding vendors, transportation included",
    subject: "Exhibiting at {event}",
  },
  TOURNAMENT: {
    audience: "tournaments",
    label: "Golf and charity tournaments",
    short: "Tournament",
    icon: "target",
    who: "the Tournament Director or the Sponsorship Manager",
    titles: [
      "Tournament Director",
      "Sponsorship Manager",
      "Executive Director",
    ],
    why: "Sponsors and players move between the course, resorts and the airport all week.",
    season: "",
    offer: "player and sponsor transportation for the week of the tournament",
    hook: "your players and sponsors will be moving between the course, their resorts and the airport all week",
    subject: "Player and sponsor transportation for {event}",
  },
  AUCTION: {
    audience: "auctions",
    label: "Auctions and shows",
    short: "Auction",
    icon: "zap",
    who: "the VIP Services or Bidder Relations Manager",
    titles: [
      "VIP Services Manager",
      "Bidder Relations Manager",
      "Director of Events",
    ],
    why: "Bidders fly in from all over and expect a car from the airport to the auction and back.",
    season: "",
    offer: "airport-to-auction cars for VIP bidders all week",
    hook: "your VIP bidders will be flying in and expecting a car between the airport, their hotels and the auction",
    subject: "VIP bidder transportation for {event}",
  },
};

/** Where the events come from. The more of these a market has, the more events it gets. */
export const SOURCES: Record<
  SourceId,
  { label: string; text: string; icon: IconName }
> = {
  EVENTBRITE: {
    label: "Eventbrite",
    text: "Galas, fundraisers, conferences and launches.",
    icon: "globe",
  },
  CONVENTION: {
    label: "Convention centers",
    text: "Trade shows and conferences from each convention center's calendar.",
    icon: "users",
  },
  TOURISM: {
    label: "City and tourism calendars",
    text: "Festivals, auctions and big weekends from the city and its tourism board.",
    icon: "star",
  },
  CHAMBER: {
    label: "Chambers of commerce",
    text: "Business dinners, awards nights and member events.",
    icon: "users",
  },
  UNIVERSITY: {
    label: "Universities",
    text: "Graduations, galas and visiting speakers.",
    icon: "star",
  },
  TICKETMASTER: {
    label: "Ticketmaster",
    text: "Concerts, games and shows big enough to fill the roads.",
    icon: "zap",
  },
  WEDDING: {
    label: "Wedding shows",
    text: "Bridal shows and open houses where couples book their vendors.",
    icon: "sparkle",
  },
  TOURNAMENT: {
    label: "Golf and charity tournaments",
    text: "Pro-ams and charity tournaments with sponsors and players to move.",
    icon: "target",
  },
  GOOGLE: {
    label: "Google Events",
    text: "Galas, conferences and fundraisers listed on Google, checked weekly.",
    icon: "search",
  },
};

/**
 * How the nightly run finds each kind of account on Google. A search that
 * comes back full is split into four smaller areas, `depth` times at most.
 */
export const SEARCHES: Record<
  AccountCategory,
  { text: string; type?: string; pages: number; depth: number }[]
> = {
  HOTEL: [
    { text: "hotel", type: "lodging", pages: 3, depth: 4 },
    { text: "resort", type: "resort_hotel", pages: 2, depth: 3 },
  ],
  VENUE: [
    { text: "wedding venue", type: "wedding_venue", pages: 3, depth: 3 },
    { text: "event venue", type: "event_venue", pages: 2, depth: 3 },
  ],
  CORPORATE: [
    {
      text: "corporate headquarters",
      type: "corporate_office",
      pages: 2,
      depth: 2,
    },
  ],
  LAW: [{ text: "law firm", type: "lawyer", pages: 2, depth: 2 }],
  FUNERAL: [{ text: "funeral home", type: "funeral_home", pages: 2, depth: 3 }],
  GOLF: [
    { text: "golf club", type: "golf_course", pages: 2, depth: 3 },
    { text: "country club", pages: 1, depth: 2 },
  ],
  CASINO: [{ text: "casino", type: "casino", pages: 1, depth: 2 }],
  SENIOR: [{ text: "senior living community", pages: 2, depth: 3 }],
  TOURS: [
    { text: "tour company", type: "tour_agency", pages: 1, depth: 2 },
    { text: "winery", type: "winery", pages: 1, depth: 2 },
  ],
};

export const STAGES: {
  id: "NEW" | "CONTACTED" | "TALKING" | "WON" | "NOT_NOW";
  label: string;
  tone: "yellow" | "mint" | "purple" | "lime" | "gray";
}[] = [
  { id: "NEW", label: "New", tone: "yellow" },
  { id: "CONTACTED", label: "Contacted", tone: "mint" },
  { id: "TALKING", label: "Talking", tone: "purple" },
  { id: "WON", label: "Won", tone: "lime" },
  { id: "NOT_NOW", label: "Not now", tone: "gray" },
];

export const stageOf = (id: string) =>
  STAGES.find((s) => s.id === id) ?? STAGES[0];

/** How many days to wait before following up, by how you reached out. */
export const FOLLOW_UP_DAYS = { EMAIL: 5, TEXT: 3, CALL: 7, MET: 7 } as const;
