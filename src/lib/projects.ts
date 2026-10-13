// The projects with a page of their own at /projects/[slug]. The cards on
// /projects live in ProjectGrid; keep the slugs here matching its hrefs.
// Nier is real. The two concepts are PLACEHOLDERS until those sites exist.

import type { StaticImageData } from "next/image";
import type { IconName } from "@/components/Dashboard/icons";
import NierLogo from "../../public/images/nierLogo.png";
import Barry from "../../public/images/barry.png";
import NierHero from "../../public/images/cadiv.png";
import NierStory from "../../public/images/nierIntro.png";
import NierHome from "../../public/images/nierHomePage.png";
import NierBlog from "../../public/images/nierBlogPage.png";
import NierCorp from "../../public/images/nierCorporatePage.png";
import NierServ from "../../public/images/nierServicesPage.png";
import NierTerm from "../../public/images/nierTerminalPage.png";
import Concept1Hero from "../../public/images/chevy_corp.png";
import Concept1Story from "../../public/images/cadi_drive.png";
import Concept2Hero from "../../public/images/branded.jpg";
import Concept2Story from "../../public/images/cadiii.png";

export type Fact = { label: string; value: string; href?: string };

export type Quote = {
  text: string;
  name: string;
  role: string;
  avatar?: StaticImageData;
};

/** One row of the scorecard: what it was, what it is now, and why. */
export type Result = {
  label: string;
  before: string;
  now: string;
  note: string;
};

/** One line of the brief: a label on the left, two or three sentences. */
export type BriefLine = { label: string; text: string };

/** One tile in "What's inside". */
export type Feature = { icon: IconName; title: string; text: string };

/**
 * A picture in the hero's carousel. `top` keeps the top of the picture in
 * view, for a full-page screenshot.
 */
export type Photo = {
  src: StaticImageData;
  alt: string;
  caption: string;
  top?: boolean;
};

export type Project = {
  slug: string;
  name: string;
  logo?: StaticImageData;
  /** The page title: the result, in one line. */
  title: string;
  /** Under the title in the hero, and the page's description. */
  summary: string;
  /** In the hero, under the title. */
  facts: Fact[];
  /** The scorecard: "What changed" for a client, "Built to" for a concept. */
  results: {
    title: string;
    intro: string;
    /** What the left side of each row is called: "Before", say. */
    beforeLabel: string;
    rows: Result[];
  };
  quote?: Quote;
  brief: BriefLine[];
  inside: Feature[];
  /** The hero's carousel, in order: the first one shows first. */
  photos: Photo[];
  /** The card beside the case study. */
  cta: { title: string; text: string };
};

export const projects: Project[] = [
  {
    slug: "nier-transportation",
    name: "Nier Transportation",
    logo: NierLogo,
    title: "Nier Transportation",
    summary:
      "How a 20-year Phoenix black car operator moved from per-booking platforms to its own website, booking system and dispatch, with $0 per-booking fees.",
    facts: [
      { label: "Location", value: "Phoenix, AZ" },
      { label: "Year", value: "2026" },
      { label: "Service", value: "Full Platform" },
      { label: "Industry", value: "Black car & chauffeur" },
      { label: "Client", value: "Nier Transportation" },
      {
        label: "Website",
        value: "niertransportation.com",
        href: "https://www.niertransportation.com",
      },
    ],
    results: {
      title: "What changed",
      intro:
        "Nier's first months on its own platform, against the years on per-booking platforms.",
      beforeLabel: "Before",
      rows: [
        {
          label: "Per-booking fees",
          before: "A fee on every ride",
          now: "$0",
          note: "Every booking is a direct booking. The fees that grew with every good month are gone.",
        },
        {
          label: "Pages built for search",
          before: "A brochure site",
          now: "53",
          note: "40 city pages, 3 airport pages and 10 route pages, each written for a search Phoenix riders make.",
        },
        {
          label: "Organic traffic",
          before: "Previous period",
          now: "+105%",
          note: 'The route and airport pages already rank for searches like "tucson to phoenix shuttle" and "sky harbor delta terminal".',
        },
        {
          label: "Booking hours",
          before: "Office hours, by phone",
          now: "24/7",
          note: "Riders see the price and book at 11pm without calling. The quote, the booking and the payment all happen on the site.",
        },
        {
          label: "Customer list",
          before: "The platform's",
          now: "Nier's",
          note: "It lives in Nier's dashboard, exportable anytime. No one shows Nier's riders three other companies.",
        },
        {
          label: "Days offline at the switch",
          before: "",
          now: "0",
          note: "New bookings moved over on launch day. Rides already booked finished where they were.",
        },
      ],
    },
    quote: {
      text: "Fonts & Footers built us a direct booking platform that looks better than anything our competitors are running, and our clients actually use it. It paid for itself in the first month.",
      name: "Barry LaNier",
      role: "Owner, Nier Transportation",
      avatar: Barry,
    },
    brief: [
      {
        label: "The problem",
        text: "Since 2004, Nier's bookings came through platforms that took a fee on every ride and kept the customer list. A rider who booked Nier once was shown three other companies the next time, and the website was a brochure with no way to book.",
      },
      {
        label: "What we built",
        text: "A site built around the searches Phoenix riders make: 40 city pages, 3 airport pages for Sky Harbor, Mesa Gateway and Scottsdale, and 10 route pages. Behind it, the Full Platform: booking, dispatch, a driver app and payments through Nier's own Stripe account.",
      },
      {
        label: "The switch",
        text: "We built and tested while the old platform kept running. Vehicles, rates, service areas, corporate accounts and the customer list came over from an export. On launch day new bookings started on niertransportation.com, and there was never a day without a way to book.",
      },
      {
        label: "What changed",
        text: "Every booking is direct, with $0 per-booking fees. Confirmations, reminders and receipts carry Nier's name instead of a platform's, and the Leads Tool feeds Barry the hotels, venues and corporate accounts in his market each morning.",
      },
      {
        label: "Who it's for",
        text: "Operators paying a platform on every ride, or running a site that can't take a booking, from an owner who drives to a fleet of twenty.",
      },
    ],
    inside: [
      {
        icon: "booking",
        title: "Online booking",
        text: "Service, time, route and vehicle, with the price up front. Round trips and multi-day trips in one booking.",
      },
      {
        icon: "clipboard",
        title: "Dispatch",
        text: "Barry assigns each ride from one board and sees every trip's status.",
      },
      {
        icon: "phone",
        title: "Driver app",
        text: "Drivers see their schedule and update each trip from their phone.",
      },
      {
        icon: "clock",
        title: "Flight tracking",
        text: "Airport pickups follow the flight, so a late landing moves the pickup.",
      },
      {
        icon: "users",
        title: "Corporate portal",
        text: "Company accounts book under their own name and get one invoice.",
      },
      {
        icon: "card",
        title: "Payments",
        text: "Through Nier's own Stripe: deposits, cards on file, payment links and refunds.",
      },
      {
        icon: "globe",
        title: "City and airport pages",
        text: "53 pages, each written for a search Phoenix riders make.",
      },
      {
        icon: "target",
        title: "Leads Tool",
        text: "Hotels, venues and corporate accounts near Nier, found each morning.",
      },
    ],
    photos: [
      {
        src: NierHero,
        alt: "A black Cadillac Escalade parked in the Arizona desert",
        caption: "The fleet",
      },
      {
        src: NierBlog,
        alt: "The Nier Transportation home page, top to bottom",
        caption: "The home page",
        top: true,
      },
      {
        src: NierCorp,
        alt: "The Nier Transportation home page, top to bottom",
        caption: "The home page",
        top: true,
      },
      {
        src: NierServ,
        alt: "The Nier Transportation home page, top to bottom",
        caption: "The home page",
        top: true,
      },
      {
        src: NierHome,
        alt: "The Nier Transportation home page, top to bottom",
        caption: "The home page",
        top: true,
      },
      {
        src: NierTerm,
        alt: "The Nier Transportation home page, top to bottom",
        caption: "The home page",
        top: true,
      },
      // {
      //   src: NierStory,
      //   alt: "A black SUV driving through downtown Phoenix",
      //   caption: "On the road in Phoenix",
      // },
    ],
    cta: {
      title: "Want this for your fleet?",
      text: "Run the free audit to see where your site stands today, or book a call and I'll walk you through how Nier's runs.",
    },
  },
  {
    slug: "concept-1",
    name: "[Concept 1]",
    title: "Concept 1",
    summary:
      "A concept site for a corporate and executive black car company: airport and route pages, corporate accounts and a booking flow in test mode.",
    facts: [
      { label: "Location", value: "Concept" },
      { label: "Year", value: "2026" },
      { label: "Service", value: "Website + booking, test mode" },
      { label: "Industry", value: "Corporate & executive black car" },
      { label: "Client", value: "Concept, not a real company" },
      { label: "Booking", value: "Live, in test mode" },
    ],
    // PLACEHOLDER: replace with the concept's own numbers once it's built.
    results: {
      title: "Built to",
      intro:
        "What this concept is built to do, against the typical corporate black car site.",
      beforeLabel: "Typical site",
      rows: [
        {
          label: "Per-booking fees",
          before: "A platform fee per ride",
          now: "$0",
          note: "Bookings go straight to the operator, through its own Stripe account.",
        },
        {
          label: "Pages built for search",
          before: "A homepage and a fleet page",
          now: "18",
          note: "A page per airport and per suburb executives travel from, each written for a real search.",
        },
        {
          label: "Steps to book",
          before: "A form and a callback",
          now: "3",
          note: "Pick the ride, see the price, pay. The booking runs end to end in test mode.",
        },
        {
          label: "Corporate accounts",
          before: "Emails and spreadsheets",
          now: "A portal",
          note: "Assistants book under the company's name, and the company gets one invoice.",
        },
      ],
    },
    brief: [
      {
        label: "What it shows",
        text: "PLACEHOLDER. What a corporate black car company's site looks like on the Full Platform: a homepage for the city, a page per airport, route pages for the suburbs, and a corporate accounts page written for the assistant who books the rides.",
      },
      {
        label: "Booking",
        text: "The booking flow is real and runs in test mode, so you can book a ride end to end without anything being charged.",
      },
      {
        label: "For a real operator",
        text: "PLACEHOLDER. Replace with the concept's own story once the site is built: the pages, the booking flow, the corporate portal, and the first three months.",
      },
    ],
    inside: [
      {
        icon: "booking",
        title: "Online booking",
        text: "The price up front and three steps to book, in test mode.",
      },
      {
        icon: "users",
        title: "Corporate portal",
        text: "Company accounts, their bookers and one invoice a month.",
      },
      {
        icon: "clock",
        title: "Flight tracking",
        text: "Airport pickups follow the flight.",
      },
      {
        icon: "globe",
        title: "Airport and route pages",
        text: "9 pages for the airports and the runs executives take.",
      },
      {
        icon: "clipboard",
        title: "Dispatch",
        text: "Every ride assigned from one board, with a driver app.",
      },
      {
        icon: "card",
        title: "Payments",
        text: "Cards on file, invoices and refunds through the operator's Stripe.",
      },
    ],
    photos: [
      {
        src: Concept1Hero,
        alt: "A chauffeur shaking hands with a client beside a black SUV",
        caption: "The home page photo",
      },
      {
        src: Concept1Story,
        alt: "A chauffeur's hands on the steering wheel",
        caption: "The service pages",
      },
    ],
    cta: {
      title: "Want a site like this?",
      text: "Run the free audit to see where your site stands today, or book a call and I'll show you the booking flow live.",
    },
  },
  {
    slug: "concept-2",
    name: "[Concept 2]",
    title: "Concept 2",
    summary:
      "A concept site for a wedding and party limo company: event pages, fleet galleries and a booking flow in test mode.",
    facts: [
      { label: "Location", value: "Concept" },
      { label: "Year", value: "2026" },
      { label: "Service", value: "Website + booking, test mode" },
      { label: "Industry", value: "Wedding & party limo" },
      { label: "Client", value: "Concept, not a real company" },
      { label: "Booking", value: "Live, in test mode" },
    ],
    // PLACEHOLDER: replace with the concept's own numbers once it's built.
    results: {
      title: "Built to",
      intro:
        "What this concept is built to do, against the typical wedding and party limo site.",
      beforeLabel: "Typical site",
      rows: [
        {
          label: "Per-booking fees",
          before: "A platform fee per ride",
          now: "$0",
          note: "Bookings go straight to the operator, through its own Stripe account.",
        },
        {
          label: "Event pages",
          before: "One “weddings” page",
          now: "12",
          note: "A page per occasion: weddings, proms, quinceañeras, bachelor and bachelorette parties and more.",
        },
        {
          label: "Fleet gallery",
          before: "Stock photos",
          now: "6 vehicles",
          note: "Every vehicle with real interior photos, seats and what's included.",
        },
        {
          label: "Deposits and balances",
          before: "Chased by phone",
          now: "Automatic",
          note: "A deposit at booking, and the balance link goes out on its own before the day.",
        },
      ],
    },
    brief: [
      {
        label: "What it shows",
        text: "PLACEHOLDER. What a wedding and party limo company's site looks like on the Full Platform: a page per occasion, a fleet gallery with real interior photos, and a booking flow that takes a deposit and sends the balance link before the day.",
      },
      {
        label: "Booking",
        text: "The booking flow is real and runs in test mode, so you can book a ride end to end without anything being charged.",
      },
      {
        label: "For a real operator",
        text: "PLACEHOLDER. Replace with the concept's own story once the site is built: the event pages, the fleet gallery, the deposit flow, and a wedding season with reminders going out on their own.",
      },
    ],
    inside: [
      {
        icon: "booking",
        title: "Online booking",
        text: "Pick the occasion, the vehicle and the hours, and see the price.",
      },
      {
        icon: "calendar",
        title: "Event pages",
        text: "12 pages, one for each occasion people search for.",
      },
      {
        icon: "image",
        title: "Fleet gallery",
        text: "Real interior photos of all 6 vehicles.",
      },
      {
        icon: "card",
        title: "Deposits",
        text: "A deposit at booking and a balance link before the day.",
      },
      {
        icon: "bell",
        title: "Reminders",
        text: "The couple and the driver hear about the day without a call.",
      },
      {
        icon: "clipboard",
        title: "Dispatch",
        text: "Every ride assigned from one board, with a driver app.",
      },
    ],
    photos: [
      {
        src: Concept2Hero,
        alt: "Three men in suits and sunglasses, laughing",
        caption: "The home page photo",
      },
      {
        src: Concept2Story,
        alt: "A black SUV on a sand-colored backdrop",
        caption: "The fleet gallery",
      },
    ],
    cta: {
      title: "Want a site like this?",
      text: "Run the free audit to see where your site stands today, or book a call and I'll show you the booking flow live.",
    },
  },
];

export const projectHref = (project: Pick<Project, "slug">) =>
  `/projects/${project.slug}`;

export const getProject = (slug: string) =>
  projects.find((project) => project.slug === slug);
