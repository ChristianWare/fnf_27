// SAMPLE clients for the sample accounts in src/lib/auth/users.ts. Every
// date is worked out from today, so the dashboard always looks current.
// When the database moves over, getClient() in ./index.ts reads it there
// and this file goes away.

import { profileAccess, serviceAgreement } from "./agreement";
import { websiteInvoices } from "./billing";
import { PLANS } from "./plans";
import type { Answers, BlueprintPage, Client, DesignOption } from "./types";

const DAY = 86_400_000;
const HOUR = 3_600_000;
// Arizona is on Mountain Standard Time all year: UTC-7.
const AZ = 7 * HOUR;

/** 9am (or the given hour) in Arizona on a calendar date. */
const azDate = (y: number, m: number, d: number, hour = 9) =>
  new Date(Date.UTC(y, m, d, hour) + AZ).toISOString();

const CHRIS = "Chris Ware";

// The 12-month plan from the SEO blueprint: visitors from search a month.
const TARGETS = [
  100, 150, 250, 400, 600, 900, 1300, 1800, 2400, 3100, 4000, 5000,
];

export const designOptions = (): DesignOption[] => [
  {
    id: "midnight",
    name: "Midnight",
    mood: "Black, quiet and expensive. Lets the cars do the talking.",
    palette: [
      { name: "Ink", hex: "#0d0d0e" },
      { name: "Mint", hex: "#b5f2e0" },
      { name: "Paper", hex: "#f1f2f4" },
    ],
    type: "Creato Display, set large and tight",
    notes: [
      "Full-bleed night photos",
      "One mint accent on every Book now",
      "Best for corporate and airport work",
    ],
  },
  {
    id: "desert",
    name: "Desert",
    mood: "Warm sand and copper. Arizona, without the cactus clichés.",
    palette: [
      { name: "Sand", hex: "#efe6da" },
      { name: "Copper", hex: "#b8693d" },
      { name: "Earth", hex: "#2a211c" },
    ],
    type: "Creato Display with an editorial feel",
    notes: [
      "Golden-hour photos",
      "Copper buttons and details",
      "Best for weddings and tours",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    mood: "Bright, clean and confident. Feels like a tech company.",
    palette: [
      { name: "White", hex: "#ffffff" },
      { name: "Lime", hex: "#d1ff93" },
      { name: "Ink", hex: "#0d0d0e" },
    ],
    type: "Creato Display, bold and oversized",
    notes: [
      "Cut-out vehicle photos",
      "Lime highlights and big numbers",
      "Best for a modern, local brand",
    ],
  },
];

export function demoClient(id: string, now: Date): Client | undefined {
  const ago = (days: number, hours = 0) =>
    new Date(now.getTime() - days * DAY - hours * HOUR).toISOString();
  const ahead = (days: number) =>
    new Date(now.getTime() + days * DAY).toISOString();

  if (id === "desert-star") return desertStar(now, ago);
  if (id === "copper-state") return copperState(now, ago, ahead);
  if (id === "mesa-executive") return mesaExecutive(ago, ahead);
  return undefined;
}

type Ago = (days: number, hours?: number) => string;
type Ahead = (days: number) => string;

/* ─────────────────────────────────────────────────────────────────────
   Desert Star Chauffeured: Full Platform, live for five months.
   ───────────────────────────────────────────────────────────────────── */
function desertStar(now: Date, ago: Ago): Client {
  const local = new Date(now.getTime() - AZ);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const today = local.getUTCDate();
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

  // Launched on the 12th, five months ago.
  const launched = azDate(y, m - 5, 12, 10);
  const before = (days: number) =>
    new Date(new Date(launched).getTime() - days * DAY).toISOString();

  // The setup fee, then the monthly fee on every 1st after it.
  const { invoices, nextBillingAt } = websiteInvoices({
    plan: PLANS.FULL_PLATFORM.name,
    setupFee: PLANS.FULL_PLATFORM.setup,
    setupPaidAt: before(52),
    monthly: PLANS.FULL_PLATFORM.monthly,
    method: "Visa ending 4242",
    now,
    numbering: { start: 1001 },
  });

  const actuals = [112, 171, 263, 431, 648];
  const months = TARGETS.map((target, i) => ({
    month: azDate(y, m - 5 + i, 1, 0),
    target,
    actual: actuals[i],
  }));
  const share = today / daysInMonth;
  const lastMonthName = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "America/Phoenix",
  }).format(new Date(months[4].month));

  const blueprint: BlueprintPage[] = [
    {
      id: "home",
      name: "Home",
      path: "/",
      purpose: "Turn a Phoenix search into a booking.",
      keyword: "black car service phoenix",
      sections: [
        {
          id: "home-hero",
          title: "Hero",
          status: "APPROVED",
          copy: [
            "Headline: Phoenix black car service, booked in a minute.",
            "Under it: Sky Harbor, Scottsdale and corporate travel, with chauffeurs who know the Valley.",
          ],
          comments: [],
        },
        {
          id: "home-services",
          title: "What we drive",
          status: "APPROVED",
          copy: [
            "Four cards: Airport transfers, Corporate travel, Events, Hourly charters.",
          ],
          comments: [],
        },
        {
          id: "home-proof",
          title: "Reviews and questions",
          status: "APPROVED",
          copy: ["Google reviews, pulled in live, and six common questions."],
          comments: [],
        },
      ],
    },
    {
      id: "sky-harbor",
      name: "Sky Harbor car service",
      path: "/sky-harbor-car-service",
      purpose: "Rank for the airport searches that book the most rides.",
      keyword: "sky harbor car service",
      sections: [
        {
          id: "sky-hero",
          title: "Hero",
          status: "APPROVED",
          copy: ["Headline: Sky Harbor car service, waiting when you land."],
          comments: [],
        },
        {
          id: "sky-terminals",
          title: "Terminals and pickup",
          status: "APPROVED",
          copy: ["Where we meet you at Terminals 3 and 4, airline by airline."],
          comments: [],
        },
      ],
    },
    {
      id: "corporate",
      name: "Corporate accounts",
      path: "/corporate",
      purpose: "Win the assistants who book for executives.",
      keyword: "corporate car service phoenix",
      sections: [
        {
          id: "corp-hero",
          title: "Hero",
          status: "APPROVED",
          copy: ["Headline: One account for every executive ride."],
          comments: [],
        },
      ],
    },
  ];

  return {
    id: "desert-star",
    business: "Desert Star Chauffeured",
    city: "Phoenix, AZ",
    contact: {
      name: "Dana Reyes",
      email: "platform@demo.test",
      phone: "(602) 555-0118",
      role: "Owner",
    },
    signedUpAt: before(60),
    approvedAt: before(56),
    request: { plan: "FULL_PLATFORM" },
    notes:
      "Wants more corporate accounts. Ask about the Scottsdale hotel concierges at the next check-in.",
    website: {
      plan: "FULL_PLATFORM",
      status: "ACTIVE",
      monthly: PLANS.FULL_PLATFORM.monthly,
      setupFee: PLANS.FULL_PLATFORM.setup,
      domain: "desertstar.example",
      startedAt: before(52),
      liveUrl: "https://desertstar.example",
      bookingAdminUrl: "https://desertstar.example/admin",
      nextBillingAt,
      facts: {
        agreementSignedAt: before(52),
        setupFeePaidAt: before(52),
        questionnaireSubmittedAt: before(47),
        assetsCompleteAt: before(40),
        designChosenAt: before(33),
        blueprintApprovedAt: before(30),
        stripeConnectedAt: before(28),
        ratesSetAt: before(20),
        driversAddedAt: before(12),
        previewReadyAt: before(9),
        previewApprovedAt: before(3),
        launchedAt: launched,
      },
    },
    leads: { status: "NONE" },
    documents: [
      {
        id: "gbp-access",
        title: "Google Business Profile access",
        summary:
          "Lets us post updates and photos to your Google profile each week. You stay the owner.",
        status: "AWAITING",
        sentAt: ago(2),
        body: profileAccess("Desert Star Chauffeured"),
      },
      {
        id: "agreement",
        title: "Service agreement",
        summary:
          "Your Full Platform plan: what we build and run, and the fees.",
        status: "SIGNED",
        sentAt: before(53),
        signedAt: before(52),
        signedBy: "Dana Reyes",
        body: serviceAgreement("Desert Star Chauffeured", "FULL_PLATFORM"),
      },
    ],
    answers: {
      businessName: "Desert Star Chauffeured",
      yearStarted: "2014",
      baseCity: "Phoenix, AZ",
      serviceArea:
        "Phoenix, Scottsdale, Paradise Valley, Tempe, Mesa, Chandler, Gilbert, Sedona day trips",
      phone: "(602) 555-0118",
      bookingEmail: "book@desertstar.example",
      hours: "24/7",
      services: [
        "Airport transfers",
        "Corporate travel",
        "Games and concerts",
        "Hourly charters",
      ],
      airports: ["Sky Harbor (PHX)", "Mesa Gateway (AZA)", "Scottsdale (SDL)"],
      moreOf: "Corporate accounts and early-morning airport runs.",
      different:
        "We answer at 3am, we track every flight, and our chauffeurs have been with us for years.",
      vehicles:
        "3 × Cadillac Escalade\n1 × Mercedes S-Class\n1 × Mercedes Sprinter",
      largestGroup: "14 in the Sprinter",
      amenities: ["Water and mints", "Phone chargers", "Flight tracking"],
      words: ["Professional", "Discreet", "Reliable"],
      colors: "Black, with a little gold",
      sitesYouLike: "Hotel sites like the Phoenician: calm, lots of space.",
      avoid: "Stock photos of limos we don't own.",
      stripe: "Yes",
      payWhen: "The full fare when they book",
      cancellation: "Free up to 24 hours before pickup; 50% after that.",
      rates: "2-hour minimum on hourly. Flat rates to Sky Harbor by city.",
      driverCount: "5",
      domain: "desertstar.example",
      registrar: "GoDaddy",
      googleProfile: "Yes",
      social: "instagram.com/desertstar (sample)",
    },
    assets: [
      {
        id: "a1",
        name: "desert-star-logo.svg",
        label: "Logo",
        size: "18 KB",
        addedAt: before(44),
      },
      {
        id: "a2",
        name: "escalade-desert.png",
        label: "Fleet photo",
        size: "2.4 MB",
        addedAt: before(42),
        src: "/images/cadiv.png",
      },
      {
        id: "a3",
        name: "escalade-downtown.png",
        label: "Fleet photo",
        size: "2.1 MB",
        addedAt: before(42),
        src: "/images/cadiMotion.png",
      },
      {
        id: "a4",
        name: "s-class.jpg",
        label: "Fleet photo",
        size: "1.8 MB",
        addedAt: before(41),
        src: "/images/benz.jpg",
      },
      {
        id: "a5",
        name: "yukon-front.png",
        label: "Fleet photo",
        size: "2.0 MB",
        addedAt: before(41),
        src: "/images/yukon.png",
      },
      {
        id: "a6",
        name: "yukon-side.png",
        label: "Fleet photo",
        size: "1.9 MB",
        addedAt: before(41),
        src: "/images/yukonii.png",
      },
      {
        id: "a7",
        name: "escalade-studio.png",
        label: "Fleet photo",
        size: "1.6 MB",
        addedAt: before(40),
        src: "/images/cadi.png",
      },
      {
        id: "a8",
        name: "chauffeur-welcome.png",
        label: "Team photo",
        size: "2.2 MB",
        addedAt: before(40),
        src: "/images/chevy_corp.png",
      },
    ],
    blueprint,
    designs: {
      readyAt: before(36),
      options: designOptions(),
      chosen: "midnight",
      chosenAt: before(33),
    },
    changes: [
      {
        id: "c15",
        number: 15,
        title: "Add our new Escalade to the fleet page",
        area: "Fleet",
        details:
          "We just added a 2026 Escalade ESV. Photos are in Brand assets. Seats 6, black interior.",
        status: "PENDING",
        submittedAt: ago(0, 2),
      },
      {
        id: "c14",
        number: 14,
        title: "Holiday hours banner for Thanksgiving week",
        area: "Whole site",
        details:
          "A small banner: we're open all week, book airport runs early. Remove after the weekend.",
        status: "IN_PROGRESS",
        submittedAt: ago(1, 4),
        updatedAt: ago(1),
        reply:
          "On it. It goes up the Monday before Thanksgiving and comes down on its own after the weekend.",
      },
      {
        id: "c13",
        number: 13,
        title: "Add Mesa Gateway flat rates to the airport page",
        area: "Airport pages",
        details:
          "Same cities as Sky Harbor, about 15% higher from the west side.",
        status: "COMPLETED",
        submittedAt: ago(9),
        updatedAt: ago(8),
        reply:
          "Done. The rates show on the Mesa Gateway page, and the booking form quotes them too.",
      },
      {
        id: "c12",
        number: 12,
        title: "New photo of the Sprinter on the fleet page",
        area: "Fleet",
        details: "The new one with the lights on is much better.",
        status: "COMPLETED",
        submittedAt: ago(19),
        updatedAt: ago(18),
        reply: "Swapped in, and added to the group travel page as well.",
      },
      {
        id: "c11",
        number: 11,
        title: "Add a Sedona day trip page",
        area: "New page",
        details:
          "We do a lot of Sedona runs from Scottsdale resorts. Can we get a page for it?",
        status: "COMPLETED",
        submittedAt: ago(33),
        updatedAt: ago(30),
        reply:
          "Live, with the route from Scottsdale and Phoenix. It's already showing up for “sedona car service from phoenix”.",
      },
      {
        id: "c10",
        number: 10,
        title: "Add a live chat bubble",
        area: "Whole site",
        details: "Riders keep asking questions before they book.",
        status: "DECLINED",
        submittedAt: ago(41),
        updatedAt: ago(40),
        reply:
          "We held off: the chat widgets we tested slowed your pages by over a second on phones, which costs bookings. We added a Text us button to every page instead.",
      },
    ],
    growth: {
      months,
      monthToDate: Math.max(12, Math.round(990 * share)),
      calls: { monthToDate: Math.round(52 * share), lastMonth: 47 },
      bookings: {
        label: "Bookings from search",
        monthToDate: Math.round(61 * share),
        lastMonth: 54,
      },
      reviews: {
        total: 87,
        newThisMonth: Math.min(6, Math.ceil(6 * share)),
        rating: 4.9,
      },
      queries: [
        { query: "scottsdale car service", position: 4, change: 3, clicks: 41 },
        { query: "sky harbor car service", position: 3, change: 1, clicks: 38 },
        { query: "phoenix airport limo", position: 6, change: 2, clicks: 29 },
        {
          query: "black car service phoenix",
          position: 8,
          change: 5,
          clicks: 22,
        },
        {
          query: "sedona car service from phoenix",
          position: 5,
          change: 0,
          clicks: 17,
        },
        {
          query: "mesa gateway car service",
          position: 7,
          change: 4,
          clicks: 12,
        },
      ],
      notes: [
        `${lastMonthName} beat the plan: 648 visitors from search against a target of 600.`,
        "Your Sky Harbor page moved from #4 to #3 for “sky harbor car service”, the search that books the most rides.",
        "Two new pages went live, Scottsdale to Sedona and Phoenix to Tucson. Both are indexed and climbing.",
        "Six new Google reviews. Riders who get the review link in their receipt leave one about 1 time in 5.",
      ],
      habits: [
        {
          id: "reviews",
          text: "Ask three riders for a Google review",
          detail: "The link is in every receipt; asking in person doubles it.",
        },
        {
          id: "photo",
          text: "Post one photo to your Google profile",
          detail: "A clean car at a landmark beats any stock photo.",
        },
        {
          id: "reply",
          text: "Reply to every new review",
          detail: "Two lines is plenty. Google notices profiles that answer.",
        },
        {
          id: "story",
          text: "Send us one story from the week",
          detail: "A wedding, a big game, a 4am flight: it becomes a post.",
        },
      ],
    },
    invoices,
    card: { brand: "Visa", last4: "4242", exp: "08/28" },
    threads: [
      {
        id: "t-tips",
        subject: "Can riders add a tip when they book?",
        status: "ANSWERED",
        unread: true,
        messages: [
          {
            id: "m1",
            from: "you",
            name: "Dana Reyes",
            at: ago(3, 4),
            text: "Hi Chris, a few corporate riders asked if they can tip the chauffeur in the booking form. Can we turn that on?",
          },
          {
            id: "m2",
            from: "us",
            name: CHRIS,
            at: ago(3, 2),
            text: "Yes. Tips are a setting in your booking dashboard under Payments. Riders pick 15, 20 or 25 percent or their own amount, and it lands in your Stripe with the fare. Want me to switch it on?",
          },
          {
            id: "m3",
            from: "you",
            name: "Dana Reyes",
            at: ago(2),
            text: "Yes please!",
          },
          {
            id: "m4",
            from: "us",
            name: CHRIS,
            at: ago(1, 20),
            text: "Done. It's on from the next booking, and the tip shows on each trip in your dashboard so you can pass it to the chauffeur.",
          },
        ],
      },
      {
        id: "t-reviews",
        subject: "Review link in the receipt emails",
        status: "CLOSED",
        messages: [
          {
            id: "m5",
            from: "you",
            name: "Dana Reyes",
            at: ago(18, 3),
            text: "Could the receipt email ask for a Google review?",
          },
          {
            id: "m6",
            from: "us",
            name: CHRIS,
            at: ago(18),
            text: "Good call. Every receipt now ends with “How was your ride?” and a link that opens your Google review form.",
          },
          {
            id: "m7",
            from: "you",
            name: "Dana Reyes",
            at: ago(17),
            text: "Perfect, thank you.",
          },
        ],
      },
    ],
    activity: [
      {
        id: "e1",
        at: ago(0, 2),
        kind: "change",
        text: "You asked for: Add our new Escalade to the fleet page",
        href: "/dashboard/website/changes",
      },
      {
        id: "e2",
        at: ago(1, 20),
        kind: "support",
        text: "Chris replied: tips are on from the next booking",
        href: "/dashboard/support",
      },
      {
        id: "e3",
        at: ago(2),
        kind: "document",
        text: "Google Business Profile access is ready to sign",
        href: "/dashboard/website/documents",
      },
      {
        id: "e4",
        at: ago(4),
        kind: "growth",
        text: `${lastMonthName} report: 648 visitors from search, plan was 600`,
        href: "/dashboard/growth",
      },
      {
        id: "e5",
        at: ago(8),
        kind: "change",
        text: "Done: Mesa Gateway flat rates are live",
        href: "/dashboard/website/changes",
      },
    ],
  };
}

/* ─────────────────────────────────────────────────────────────────────
   Copper State Limo: Website Only, four weeks into the build.
   ───────────────────────────────────────────────────────────────────── */
function copperState(now: Date, ago: Ago, ahead: Ahead): Client {
  // The setup fee, then the monthly fee on every 1st after it.
  const { invoices, nextBillingAt } = websiteInvoices({
    plan: PLANS.WEBSITE_ONLY.name,
    setupFee: PLANS.WEBSITE_ONLY.setup,
    setupPaidAt: ago(27),
    monthly: PLANS.WEBSITE_ONLY.monthly,
    method: "Mastercard ending 4444",
    now,
    numbering: { start: 1031 },
  });

  const answers: Answers = {
    businessName: "Copper State Limo",
    yearStarted: "2012",
    baseCity: "Tucson, AZ",
    serviceArea:
      "Tucson, Oro Valley, Marana, the Catalina Foothills, Green Valley, Sahuarita, and runs to Phoenix",
    phone: "(520) 555-0142",
    bookingEmail: "rides@copperstate.example",
    hours: "24/7",
    services: [
      "Airport transfers",
      "Corporate travel",
      "Weddings",
      "Hourly charters",
    ],
    airports: ["Tucson (TUS)", "Sky Harbor (PHX)"],
    moreOf: "Runs to Sky Harbor and corporate accounts at the Tech Park.",
    different:
      "Same chauffeurs every time, and we've never missed a flight. Riders say we're the only ones who text when we're 10 minutes out.",
    vehicles:
      "2 × Cadillac Escalade\n1 × Mercedes S-Class\n1 × Mercedes Sprinter",
    largestGroup: "14 in the Sprinter",
    amenities: ["Water and mints", "Wi-Fi", "Meet and greet with a sign"],
    words: ["Professional", "Local", "Reliable"],
    colors: "Black and copper",
    sitesYouLike: "Clean hotel and airline sites. Nothing flashy.",
    avoid: "Party bus photos. We don't do party buses.",
    bookingSoftware: "Limo Anywhere",
    bookingLink: "",
    domain: "copperstate.example",
    registrar: "Namecheap",
    googleProfile: "Yes",
    social: "",
  };

  const blueprint: BlueprintPage[] = [
    {
      id: "home",
      name: "Home",
      path: "/",
      purpose: "Turn a Tucson search into a booking.",
      keyword: "tucson limo service",
      sections: [
        {
          id: "home-hero",
          title: "Hero",
          status: "APPROVED",
          copy: [
            "Headline: Tucson's black car service, booked in a minute.",
            "Under it: Airport runs to TUS and Sky Harbor, corporate travel and weddings, with chauffeurs who've driven Tucson since 2012.",
            "Buttons: Book a ride, and Call (520) 555-0142.",
          ],
          comments: [
            {
              id: "hc1",
              from: "you",
              name: "Marcus Hill",
              at: ago(2, 5),
              text: "Love this one.",
            },
          ],
        },
        {
          id: "home-services",
          title: "What we drive",
          status: "APPROVED",
          copy: [
            "Four cards: Airport transfers, Corporate travel, Weddings and events, Hourly charters. Each links to its own page.",
          ],
          comments: [],
        },
        {
          id: "home-why",
          title: "Why Copper State",
          status: "REVIEW",
          copy: [
            "Three reasons, from your questionnaire: the same chauffeurs every time; a text when your chauffeur is 10 minutes out; and in 12 years, never a missed flight.",
            "Under each, one line from a real review that says the same thing.",
          ],
          comments: [
            {
              id: "wc1",
              from: "us",
              name: CHRIS,
              at: ago(3),
              text: "I pulled these from your questionnaire. Is “never a missed flight” something you're happy to stand behind on the homepage?",
            },
          ],
        },
        {
          id: "home-proof",
          title: "Reviews and questions",
          status: "REVIEW",
          copy: [
            "Your best Google reviews, pulled in live, so new ones show up on their own.",
            "Six questions riders ask before booking: how far ahead to book, late flights, car seats, paying, cancelling, and where you drive.",
          ],
          comments: [],
        },
      ],
    },
    {
      id: "tus",
      name: "Tucson airport",
      path: "/tucson-airport-car-service",
      purpose: "Rank for the searches people make before a flight.",
      keyword: "tucson airport car service",
      sections: [
        {
          id: "tus-hero",
          title: "Hero",
          status: "REVIEW",
          copy: [
            "Headline: Tucson Airport car service, waiting when you land.",
            "Under it: Flight tracking on every pickup, meet and greet at baggage claim, and a flat rate you see before you book.",
          ],
          comments: [],
        },
        {
          id: "tus-how",
          title: "How pickup works",
          status: "REVIEW",
          copy: [
            "Three steps: book with your flight number; we track the flight and adjust if it's early or late; your chauffeur meets you at baggage claim with a sign.",
          ],
          comments: [],
        },
        {
          id: "tus-rates",
          title: "Rates from TUS",
          status: "DRAFT",
          copy: [
            "A table of flat rates from TUS to downtown, the Foothills, Oro Valley, Marana and Green Valley.",
          ],
          comments: [],
        },
      ],
    },
    {
      id: "phx",
      name: "Tucson to Sky Harbor",
      path: "/tucson-to-phoenix-airport",
      purpose: "Win the two-hour run for flights Tucson doesn't have.",
      keyword: "tucson to phoenix airport shuttle",
      sections: [
        {
          id: "phx-hero",
          title: "Hero",
          status: "DRAFT",
          copy: [
            "Headline: Tucson to Sky Harbor, door to terminal.",
            "Under it: A private ride, no shuttle stops, timed to your departure.",
          ],
          comments: [],
        },
        {
          id: "phx-route",
          title: "The route",
          status: "DRAFT",
          copy: [
            "About two hours on I-10, with when to leave for morning and evening flights.",
          ],
          comments: [],
        },
      ],
    },
    {
      id: "corporate",
      name: "Corporate travel",
      path: "/corporate-car-service-tucson",
      purpose: "Win the assistants who book for executives.",
      keyword: "corporate car service tucson",
      sections: [
        {
          id: "corp-hero",
          title: "Hero",
          status: "DRAFT",
          copy: ["Headline: One account for every executive ride in Tucson."],
          comments: [],
        },
        {
          id: "corp-accounts",
          title: "Accounts and invoicing",
          status: "DRAFT",
          copy: [
            "Monthly invoices, a ride log per traveler, and a direct line to dispatch.",
          ],
          comments: [],
        },
      ],
    },
    {
      id: "fleet",
      name: "Fleet",
      path: "/fleet",
      purpose: "Show riders exactly what they're booking.",
      sections: [
        {
          id: "fleet-cards",
          title: "The vehicles",
          status: "APPROVED",
          copy: [
            "Each vehicle with a photo, seats, bags and what's inside: two Escalades, an S-Class and a 14-passenger Sprinter.",
          ],
          comments: [],
        },
      ],
    },
    {
      id: "about",
      name: "About",
      path: "/about",
      purpose: "Put a face to the name.",
      sections: [
        {
          id: "about-story",
          title: "Your story",
          status: "APPROVED",
          copy: [
            "Marcus started Copper State in 2012 with one Town Car and a list of hotel concierges. Twelve years on, the same promise: on time, every time.",
          ],
          comments: [],
        },
      ],
    },
  ];

  return {
    id: "copper-state",
    business: "Copper State Limo",
    city: "Tucson, AZ",
    contact: {
      name: "Marcus Hill",
      email: "website@demo.test",
      phone: "(520) 555-0142",
      role: "Owner",
    },
    signedUpAt: ago(31),
    approvedAt: ago(29),
    request: {
      plan: "WEBSITE_ONLY",
      message: "We use Limo Anywhere and want to keep it. Just need a site that ranks in Tucson.",
    },
    website: {
      plan: "WEBSITE_ONLY",
      status: "ACTIVE",
      monthly: PLANS.WEBSITE_ONLY.monthly,
      setupFee: PLANS.WEBSITE_ONLY.setup,
      domain: "copperstate.example",
      startedAt: ago(28),
      targetLaunch: ahead(41),
      nextBillingAt,
      facts: {
        agreementSignedAt: ago(28),
        setupFeePaidAt: ago(27),
        questionnaireSubmittedAt: ago(20),
      },
    },
    leads: { status: "NONE" },
    documents: [
      {
        id: "agreement",
        title: "Service agreement",
        summary: "Your Website Only plan: what we build and run, and the fees.",
        status: "SIGNED",
        sentAt: ago(29),
        signedAt: ago(28),
        signedBy: "Marcus Hill",
        body: serviceAgreement("Copper State Limo", "WEBSITE_ONLY"),
      },
    ],
    answers,
    assets: [
      {
        id: "a1",
        name: "copper-state-logo.svg",
        label: "Logo",
        size: "22 KB",
        addedAt: ago(19),
      },
      {
        id: "a2",
        name: "escalade-front.png",
        label: "Fleet photo",
        size: "2.3 MB",
        addedAt: ago(19),
        src: "/images/cadiv.png",
      },
      {
        id: "a3",
        name: "s-class-side.jpg",
        label: "Fleet photo",
        size: "1.7 MB",
        addedAt: ago(19),
        src: "/images/benz.jpg",
      },
    ],
    blueprint,
    designs: { readyAt: ago(2), options: designOptions() },
    changes: [],
    invoices,
    card: { brand: "Mastercard", last4: "4444", exp: "11/27" },
    threads: [
      {
        id: "t-photos",
        subject: "When do you need the photos?",
        status: "ANSWERED",
        unread: true,
        messages: [
          {
            id: "m1",
            from: "you",
            name: "Marcus Hill",
            at: ago(2, 6),
            text: "Hey Chris, when do you need the fleet photos by? We're shooting this weekend.",
          },
          {
            id: "m2",
            from: "us",
            name: CHRIS,
            at: ago(1, 3),
            text: "Perfect timing. Anything by next Friday makes the first build. Landscape, in open shade, the whole car in frame, and one of you or a chauffeur by the car if you can. Upload them in Brand assets.",
          },
        ],
      },
    ],
    activity: [
      {
        id: "e1",
        at: ago(1, 3),
        kind: "support",
        text: "Chris replied about the photo shoot",
        href: "/dashboard/support",
      },
      {
        id: "e2",
        at: ago(2),
        kind: "build",
        text: "Three design options are ready to choose from",
        href: "/dashboard/website/design",
      },
      {
        id: "e3",
        at: ago(3),
        kind: "build",
        text: "Your blueprint is ready for review",
        href: "/dashboard/website/blueprint",
      },
      {
        id: "e4",
        at: ago(20),
        kind: "build",
        text: "You sent your questionnaire",
        href: "/dashboard/website/questionnaire",
      },
      {
        id: "e5",
        at: ago(27),
        kind: "invoice",
        text: "Paid the $500 setup fee",
        href: "/dashboard/billing",
      },
      {
        id: "e6",
        at: ago(28),
        kind: "document",
        text: "You signed your service agreement",
        href: "/dashboard/website/documents",
      },
    ],
  };
}

/* ─────────────────────────────────────────────────────────────────────
   Mesa Executive Cars: the Leads Tool on a free trial, no website plan.
   ───────────────────────────────────────────────────────────────────── */
function mesaExecutive(ago: Ago, ahead: Ahead): Client {
  return {
    id: "mesa-executive",
    business: "Mesa Executive Cars",
    city: "Mesa, AZ",
    contact: {
      name: "Priya Shah",
      email: "leads@demo.test",
      phone: "(480) 555-0176",
      role: "Owner",
    },
    signedUpAt: ago(8),
    request: { plan: "LEADS" },
    leads: { status: "TRIAL", startedAt: ago(8), trialEndsAt: ahead(22) },
    documents: [],
    answers: {},
    assets: [],
    blueprint: [],
    designs: { options: [] },
    changes: [],
    invoices: [],
    threads: [
      {
        id: "t-welcome",
        subject: "Welcome to your Leads Tool trial",
        status: "ANSWERED",
        messages: [
          {
            id: "m1",
            from: "us",
            name: CHRIS,
            at: ago(8),
            text: "Hi Priya, your 30-day trial is on, no card needed. Your first morning digest went out today with 12 venues and companies in Mesa, Chandler and Gilbert. Reply here with anything you want more of and I'll tune it.",
          },
          {
            id: "m2",
            from: "you",
            name: "Priya Shah",
            at: ago(7, 5),
            text: "Thanks! Can it include the hotels near Mesa Gateway?",
          },
          {
            id: "m3",
            from: "us",
            name: CHRIS,
            at: ago(7, 2),
            text: "Added. You'll see them from tomorrow's digest.",
          },
        ],
      },
    ],
    activity: [
      {
        id: "e1",
        at: ago(0, 3),
        kind: "leads",
        text: "This morning's digest: 9 new leads",
        href: "/dashboard/leads",
      },
      {
        id: "e2",
        at: ago(7, 2),
        kind: "leads",
        text: "Hotels near Mesa Gateway were added to your digest",
        href: "/dashboard/support",
      },
      {
        id: "e3",
        at: ago(8),
        kind: "leads",
        text: "You started your 30-day free trial",
        href: "/dashboard/billing",
      },
    ],
  };
}
