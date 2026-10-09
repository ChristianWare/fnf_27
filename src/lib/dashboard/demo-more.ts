// SAMPLE: six more clients, so the admin has a real-looking studio to run.
// Nobody signs in as these; an admin can still open each one with "View as
// client". Like demo.ts, every date is worked out from today, and this file
// goes away when the database moves over.

import { serviceAgreement } from "./agreement";
import { firstOfMonth, leadsInvoices, websiteInvoices } from "./billing";
import { designOptions } from "./demo";
import { PLANS } from "./plans";
import type { Answers, Client, Growth } from "./types";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const AZ = 7 * HOUR;
const CHRIS = "Chris Ware";

const TARGETS = [
  100, 150, 250, 400, 600, 900, 1300, 1800, 2400, 3100, 4000, 5000,
];

/** A date `days` after another, as an ISO string. */
const plus = (date: string, days: number, hours = 0) =>
  new Date(new Date(date).getTime() + days * DAY + hours * HOUR).toISOString();

const base = (
  client: Pick<Client, "id" | "business" | "city" | "contact" | "signedUpAt"> &
    Partial<Client>,
): Client => ({
  leads: { status: "NONE" },
  documents: [],
  answers: {},
  assets: [],
  blueprint: [],
  designs: { options: [] },
  changes: [],
  invoices: [],
  threads: [],
  activity: [],
  ...client,
});

/** A growth record from launch, with real months and this month so far. */
function growthFrom(
  now: Date,
  launchedAt: string,
  actuals: number[],
  city: string,
  bookingsLabel: string,
): Growth {
  const local = new Date(now.getTime() - AZ);
  const daysInMonth = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const share = local.getUTCDate() / daysInMonth;
  const current = actuals.length;
  const target = TARGETS[Math.min(current, 11)];
  const town = city.split(",")[0].toLowerCase();

  return {
    months: TARGETS.map((t, i) => ({
      month: firstOfMonth(launchedAt, i),
      target: t,
      actual: actuals[i],
    })),
    monthToDate: Math.max(8, Math.round(target * 1.05 * share)),
    calls: {
      monthToDate: Math.round(target * 0.05 * share),
      lastMonth: Math.round((actuals.at(-1) ?? 100) * 0.06),
    },
    bookings: {
      label: bookingsLabel,
      monthToDate: Math.round(target * 0.06 * share),
      lastMonth: Math.round((actuals.at(-1) ?? 100) * 0.07),
    },
    reviews: { total: 40 + current * 6, newThisMonth: 2, rating: 4.8 },
    queries: [
      { query: `${town} car service`, position: 5, change: 2, clicks: 31 },
      { query: `${town} airport shuttle`, position: 7, change: 3, clicks: 22 },
      { query: `black car service ${town}`, position: 9, change: 4, clicks: 14 },
    ],
    notes: [],
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
    ],
  };
}

export function moreClients(now: Date): Client[] {
  const ago = (days: number, hours = 0) =>
    new Date(now.getTime() - days * DAY - hours * HOUR).toISOString();
  const ahead = (days: number) =>
    new Date(now.getTime() + days * DAY).toISOString();

  /* ── Saguaro Sedan Co.: Full Platform, live 9 months, payment failed ── */
  const saguaroLaunch = plus(firstOfMonth(now, -9), 14, 10);
  const saguaroSetup = plus(saguaroLaunch, -40);
  const saguaroBilling = websiteInvoices({
    plan: PLANS.FULL_PLATFORM.name,
    setupFee: 500,
    setupPaidAt: saguaroSetup,
    monthly: 449,
    method: "Amex ending 1005",
    now,
    numbering: { start: 1101 },
    lastFailed: true,
  });
  const saguaroFailed = saguaroBilling.invoices.find((i) => i.status === "DUE");

  const saguaro = base({
    id: "saguaro-sedan",
    business: "Saguaro Sedan Co.",
    city: "Scottsdale, AZ",
    contact: {
      name: "Luis Ortega",
      email: "luis@saguarosedan.example",
      phone: "(480) 555-0133",
      role: "Owner",
    },
    signedUpAt: plus(saguaroSetup, -5),
    approvedAt: plus(saguaroSetup, -3),
    request: { plan: "FULL_PLATFORM" },
    notes:
      "Founding client: $449 a month, locked in until 2027. Prefers texts to email.",
    website: {
      plan: "FULL_PLATFORM",
      status: "PAST_DUE",
      monthly: 449,
      setupFee: 500,
      domain: "saguarosedan.example",
      startedAt: saguaroSetup,
      liveUrl: "https://saguarosedan.example",
      bookingAdminUrl: "https://saguarosedan.example/admin",
      nextBillingAt: saguaroBilling.nextBillingAt,
      facts: {
        agreementSignedAt: saguaroSetup,
        setupFeePaidAt: saguaroSetup,
        questionnaireSubmittedAt: plus(saguaroSetup, 4),
        assetsCompleteAt: plus(saguaroSetup, 9),
        designChosenAt: plus(saguaroSetup, 12),
        blueprintApprovedAt: plus(saguaroSetup, 15),
        stripeConnectedAt: plus(saguaroSetup, 16),
        ratesSetAt: plus(saguaroSetup, 20),
        driversAddedAt: plus(saguaroSetup, 28),
        previewReadyAt: plus(saguaroSetup, 31),
        previewApprovedAt: plus(saguaroSetup, 37),
        launchedAt: saguaroLaunch,
      },
    },
    documents: [
      {
        id: "agreement",
        title: "Service agreement",
        summary: "Full Platform at a founding rate of $449 a month.",
        status: "SIGNED",
        sentAt: plus(saguaroSetup, -1),
        signedAt: saguaroSetup,
        signedBy: "Luis Ortega",
        body: serviceAgreement("Saguaro Sedan Co.", "FULL_PLATFORM"),
      },
    ],
    answers: {
      businessName: "Saguaro Sedan Co.",
      baseCity: "Scottsdale, AZ",
      phone: "(480) 555-0133",
      services: ["Airport transfers", "Corporate travel", "Hourly charters"],
      vehicles: "4 × Cadillac Escalade\n2 × Lincoln Navigator",
      words: ["Luxury", "Discreet", "Reliable"],
      domain: "saguarosedan.example",
    },
    designs: {
      readyAt: plus(saguaroSetup, 10),
      options: designOptions(),
      chosen: "studio",
      chosenAt: plus(saguaroSetup, 12),
    },
    changes: [
      {
        id: "c4",
        number: 4,
        title: "Add the Phoenician to the hotel transfers page",
        area: "City and route pages",
        details: "We do a lot of pickups there now.",
        status: "COMPLETED",
        submittedAt: ago(26),
        updatedAt: ago(25),
        reply: "Done, with a photo of the drive-up and the usual pickup spot.",
      },
    ],
    growth: growthFrom(
      now,
      saguaroLaunch,
      [96, 162, 275, 390, 640, 870, 1240, 1690, 2210],
      "Scottsdale, AZ",
      "Bookings from search",
    ),
    invoices: saguaroBilling.invoices,
    card: { brand: "Amex", last4: "1005", exp: "09/26", expired: true },
    threads: [
      {
        id: "t-gratuity",
        subject: "Gratuity on corporate invoices",
        status: "CLOSED",
        messages: [
          {
            id: "m1",
            from: "you",
            name: "Luis Ortega",
            at: ago(40, 2),
            text: "Can the corporate invoices show the gratuity on its own line?",
          },
          {
            id: "m2",
            from: "us",
            name: CHRIS,
            at: ago(40),
            text: "Yes. It's on from the next invoice run.",
          },
        ],
      },
    ],
    activity: [
      {
        id: "e1",
        at: saguaroFailed?.date ?? ago(7),
        kind: "invoice",
        text: "A monthly payment didn't go through: the card on file has expired",
        href: "/dashboard/billing",
      },
      {
        id: "e2",
        at: ago(25),
        kind: "change",
        text: "Done: the Phoenician is on the hotel transfers page",
        href: "/dashboard/website/changes",
      },
    ],
  });

  /* ── Red Rock Rides: Website Only, live 2 months, waiting on a reply ── */
  const redLaunch = plus(firstOfMonth(now, -2), 19, 10);
  const redSetup = plus(redLaunch, -45);
  const redBilling = websiteInvoices({
    plan: PLANS.WEBSITE_ONLY.name,
    setupFee: 500,
    setupPaidAt: redSetup,
    monthly: PLANS.WEBSITE_ONLY.monthly,
    method: "Visa ending 3110",
    now,
    numbering: { start: 1201 },
  });

  const redRock = base({
    id: "red-rock",
    business: "Red Rock Rides",
    city: "Sedona, AZ",
    contact: {
      name: "Jenna Park",
      email: "jenna@redrockrides.example",
      phone: "(928) 555-0164",
      role: "Owner",
    },
    signedUpAt: plus(redSetup, -4),
    approvedAt: plus(redSetup, -3),
    request: { plan: "WEBSITE_ONLY" },
    website: {
      plan: "WEBSITE_ONLY",
      status: "ACTIVE",
      monthly: PLANS.WEBSITE_ONLY.monthly,
      setupFee: 500,
      domain: "redrockrides.example",
      startedAt: redSetup,
      liveUrl: "https://redrockrides.example",
      nextBillingAt: redBilling.nextBillingAt,
      facts: {
        agreementSignedAt: redSetup,
        setupFeePaidAt: redSetup,
        questionnaireSubmittedAt: plus(redSetup, 5),
        assetsCompleteAt: plus(redSetup, 11),
        designChosenAt: plus(redSetup, 14),
        blueprintApprovedAt: plus(redSetup, 19),
        bookingLinkAddedAt: plus(redSetup, 5),
        previewReadyAt: plus(redSetup, 34),
        previewApprovedAt: plus(redSetup, 41),
        launchedAt: redLaunch,
      },
    },
    documents: [
      {
        id: "agreement",
        title: "Service agreement",
        summary: "Website Only: what we build and run, and the fees.",
        status: "SIGNED",
        sentAt: plus(redSetup, -1),
        signedAt: redSetup,
        signedBy: "Jenna Park",
        body: serviceAgreement("Red Rock Rides", "WEBSITE_ONLY"),
      },
    ],
    answers: {
      businessName: "Red Rock Rides",
      baseCity: "Sedona, AZ",
      services: ["Wine and day tours", "Airport transfers", "Weddings"],
      bookingSoftware: "Moovs",
      bookingLink: "https://book.redrockrides.example",
      domain: "redrockrides.example",
    },
    designs: {
      readyAt: plus(redSetup, 12),
      options: designOptions(),
      chosen: "desert",
      chosenAt: plus(redSetup, 14),
    },
    changes: [
      {
        id: "c3",
        number: 3,
        title: "Add our Grand Canyon day tour page",
        area: "New page",
        details:
          "Full day, leaves Sedona at 7am, lunch at the El Tovar. Up to 6 riders in the Sprinter. $1,450 flat.",
        status: "PENDING",
        submittedAt: ago(0, 5),
      },
      {
        id: "c2",
        number: 2,
        title: "Update the wedding package prices",
        area: "Weddings",
        details: "Gold is now $895, Platinum $1,195.",
        status: "COMPLETED",
        submittedAt: ago(12),
        updatedAt: ago(11),
        reply: "Updated on the weddings page and the FAQ.",
      },
    ],
    growth: growthFrom(
      now,
      redLaunch,
      [84, 140],
      "Sedona, AZ",
      "Book now clicks from search",
    ),
    invoices: redBilling.invoices,
    card: { brand: "Visa", last4: "3110", exp: "04/28" },
    threads: [
      {
        id: "t-phone",
        subject: "New phone number",
        status: "OPEN",
        messages: [
          {
            id: "m1",
            from: "you",
            name: "Jenna Park",
            at: ago(0, 3),
            text: "We got a new main line: (928) 555-0190. Can you swap it everywhere on the site, and on Google too?",
          },
        ],
      },
    ],
    activity: [
      {
        id: "e1",
        at: ago(0, 3),
        kind: "support",
        text: "You asked about changing your phone number",
        href: "/dashboard/support",
      },
      {
        id: "e2",
        at: ago(0, 5),
        kind: "change",
        text: "You asked for: Add our Grand Canyon day tour page",
        href: "/dashboard/website/changes",
      },
    ],
  });

  /* ── Valley Executive Transport: signed up last night, needs approval ── */
  const valley = base({
    id: "valley-exec",
    business: "Valley Executive Transport",
    city: "Chandler, AZ",
    contact: {
      name: "Omar Haddad",
      email: "omar@valleyexec.example",
      phone: "(480) 555-0187",
      role: "Owner",
    },
    signedUpAt: ago(0, 19),
    request: {
      plan: "FULL_PLATFORM",
      message:
        "We run 6 Suburbans and 2 Sprinters out of Chandler, mostly airport and corporate. Tired of paying per-booking fees and want riders booking on our own site.",
    },
    activity: [
      {
        id: "e1",
        at: ago(0, 19),
        kind: "build",
        text: "You signed up for the Full Platform",
      },
    ],
  });

  /* ── Tempe Airport Cars: Website Only, questionnaire just came in ── */
  const tempeSetup = ago(12);
  const tempeBilling = websiteInvoices({
    plan: PLANS.WEBSITE_ONLY.name,
    setupFee: 500,
    setupPaidAt: tempeSetup,
    monthly: PLANS.WEBSITE_ONLY.monthly,
    method: "Visa ending 8812",
    now,
    numbering: { start: 1301 },
  });
  const tempeAnswers: Answers = {
    businessName: "Tempe Airport Cars",
    yearStarted: "2018",
    baseCity: "Tempe, AZ",
    serviceArea: "Tempe, ASU, Mesa, Chandler, Ahwatukee, runs to Sky Harbor",
    phone: "(480) 555-0121",
    bookingEmail: "rides@tempeairportcars.example",
    hours: "24/7",
    services: ["Airport transfers", "Games and concerts", "Point to point"],
    airports: ["Sky Harbor (PHX)", "Mesa Gateway (AZA)"],
    moreOf: "ASU parents and visiting professors, and early flights.",
    different: "We're ten minutes from Sky Harbor and we answer at 4am.",
    vehicles: "3 × Chevrolet Suburban\n1 × Cadillac Escalade",
    words: ["Reliable", "Friendly", "Local"],
    bookingSoftware: "Phone and email only",
    domain: "tempeairportcars.example",
    googleProfile: "Yes",
  };
  const tempe = base({
    id: "tempe-airport",
    business: "Tempe Airport Cars",
    city: "Tempe, AZ",
    contact: {
      name: "Grace Kim",
      email: "grace@tempeairportcars.example",
      phone: "(480) 555-0121",
      role: "Owner",
    },
    signedUpAt: ago(15),
    approvedAt: ago(14),
    request: { plan: "WEBSITE_ONLY" },
    website: {
      plan: "WEBSITE_ONLY",
      status: "ACTIVE",
      monthly: PLANS.WEBSITE_ONLY.monthly,
      setupFee: 500,
      domain: "tempeairportcars.example",
      startedAt: ago(13),
      targetLaunch: ahead(30),
      nextBillingAt: tempeBilling.nextBillingAt,
      facts: {
        agreementSignedAt: ago(13),
        setupFeePaidAt: tempeSetup,
        questionnaireSubmittedAt: ago(2),
      },
    },
    documents: [
      {
        id: "agreement",
        title: "Service agreement",
        summary: "Website Only: what we build and run, and the fees.",
        status: "SIGNED",
        sentAt: ago(14),
        signedAt: ago(13),
        signedBy: "Grace Kim",
        body: serviceAgreement("Tempe Airport Cars", "WEBSITE_ONLY"),
      },
    ],
    answers: tempeAnswers,
    assets: [
      {
        id: "a1",
        name: "tempe-airport-cars-logo.png",
        label: "Logo",
        size: "140 KB",
        addedAt: ago(3),
      },
      {
        id: "a2",
        name: "suburban-terminal-4.png",
        label: "Fleet photo",
        size: "2.2 MB",
        addedAt: ago(3),
        src: "/images/yukoniii.png",
      },
    ],
    invoices: tempeBilling.invoices,
    card: { brand: "Visa", last4: "8812", exp: "02/29" },
    activity: [
      {
        id: "e1",
        at: ago(2),
        kind: "build",
        text: "You sent your questionnaire",
        href: "/dashboard/website/questionnaire",
      },
      {
        id: "e2",
        at: tempeSetup,
        kind: "invoice",
        text: "Paid the $500 setup fee",
        href: "/dashboard/billing",
      },
    ],
  });

  /* ── Flagstaff Black Car: Leads trial ends in 2 days, no card yet ── */
  const flagstaff = base({
    id: "flagstaff",
    business: "Flagstaff Black Car",
    city: "Flagstaff, AZ",
    contact: {
      name: "Ben Walker",
      email: "ben@flagstaffblackcar.example",
      phone: "(928) 555-0148",
      role: "Owner",
    },
    signedUpAt: ago(28),
    request: { plan: "LEADS" },
    leads: { status: "TRIAL", startedAt: ago(28), trialEndsAt: ahead(2) },
    activity: [
      {
        id: "e1",
        at: ago(28),
        kind: "leads",
        text: "You started your 30-day free trial",
        href: "/dashboard/leads",
      },
    ],
  });

  /* ── Gilbert Chauffeur Co.: the Leads Tool, paying since its trial ── */
  const gilbertTrialEnd = ago(70);
  const gilbertBilling = leadsInvoices({
    monthly: 125,
    trialEndsAt: gilbertTrialEnd,
    method: "Visa ending 5556",
    now,
    numbering: { start: 1401 },
  });
  const gilbert = base({
    id: "gilbert",
    business: "Gilbert Chauffeur Co.",
    city: "Gilbert, AZ",
    contact: {
      name: "Maria Lopez",
      email: "maria@gilbertchauffeur.example",
      phone: "(480) 555-0102",
      role: "Owner",
    },
    signedUpAt: ago(100),
    request: { plan: "LEADS" },
    leads: { status: "ACTIVE", startedAt: ago(100), trialEndsAt: gilbertTrialEnd },
    invoices: gilbertBilling.invoices,
    card: { brand: "Visa", last4: "5556", exp: "07/27" },
    activity: [
      {
        id: "e1",
        at: ago(0, 4),
        kind: "leads",
        text: "This morning's digest: 7 new leads",
        href: "/dashboard/leads",
      },
    ],
  });

  return [valley, saguaro, redRock, tempe, flagstaff, gilbert];
}
