// The projects with a page of their own at /projects/[slug]. The cards on
// /projects live in ProjectGrid; keep the slugs here matching its hrefs.
// Nier is real. Mesa Midnight is a live concept site. Valley Vintage
// Carriage Co. is a concept still being built, so it's marked "Coming soon"
// and has no link to a live site yet.

import type { StaticImageData } from "next/image";
import type { IconName } from "@/components/Dashboard/icons";
import NierLogo from "../../public/images/logos/nierLogo.png";
import Barry from "../../public/images/barry.png";
import NierHero from "../../public/images/clients/nier/nier1.png";
import NierHome from "../../public/images/clients/nier/nier2.png";
import NierBlog from "../../public/images/clients/nier/nier3.png";
import NierCorp from "../../public/images/clients/nier/nier4.png";
import NierServ from "../../public/images/clients/nier/nier5.png";
import NierTerm from "../../public/images/clients/nier/nier6.png";
import Concept1Hero from "../../public/images/clients/mesa_midnight/mm1.png";
import Concept1Story from "../../public/images/clients/mesa_midnight/mm2.png";
import Concept2 from "../../public/images/clients/mesa_midnight/mm3.png";
import Concept3 from "../../public/images/clients/mesa_midnight/mm4.png";
import Concept4 from "../../public/images/clients/mesa_midnight/mm5.png";
import Concept5 from "../../public/images/clients/mesa_midnight/mm6.png";
import VintageHome from "../../public/images/clients/vintage/vintage.png";

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
  /** Shown beside the client's name in the facts card. */
  logo: StaticImageData;
  /** The page title: the result, in one line. */
  title: string;
  /** A pill above the title, e.g. "Coming soon" while the site is built. */
  status?: string;
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
    slug: "mesa-midnight",
    name: "Mesa Midnight",
    logo: NierLogo, // PLACEHOLDER
    title: "Mesa Midnight",
    summary:
      "A concept black car company in Mesa, Arizona, built on the Full Platform: a live site you can book on in test mode, with the admin, driver, rider and corporate dashboards behind it.",
    facts: [
      { label: "Location", value: "Mesa, AZ" },
      { label: "Year", value: "2026" },
      { label: "Service", value: "Full Platform, in test mode" },
      { label: "Industry", value: "Late-night & executive black car" },
      { label: "Client", value: "Concept, not a real company" },
      {
        label: "Website",
        value: "mesamidnighttransport.com",
        href: "https://www.mesamidnighttransport.com",
      },
    ],
    results: {
      title: "Built to",
      intro:
        "What Mesa Midnight is built to do, against the typical East Valley black car site.",
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
          now: "22",
          note: "5 service pages, 7 vehicle pages, 4 airport pages, 3 city pages and 3 route pages, each written for a search East Valley riders make.",
        },
        {
          label: "Steps to book",
          before: "A form and a callback",
          now: "3",
          note: "Trip details, vehicle, confirm. The price shows before the rider pays, worked out from the real route.",
        },
        {
          label: "Booking hours",
          before: "Office hours, by phone",
          now: "24/7",
          note: "Built for the 2am Sky Harbor run: riders book and pay at any hour without a call.",
        },
        {
          label: "Dashboards",
          before: "Email and a spreadsheet",
          now: "4",
          note: "Admin, driver, rider and corporate, each with its own login, filled with sample rides so you can click through every screen.",
        },
        {
          label: "Sample rides",
          before: "",
          now: "676",
          note: "Months of demo bookings, payments and invoices, so the reports and calendars look like a working company's.",
        },
      ],
    },
    brief: [
      {
        label: "What it shows",
        text: "What a black car company's site looks like on the Full Platform, end to end. Mesa Midnight is a made-up late-night and executive operator in Mesa, with a site built around Sky Harbor and Mesa Gateway runs, corporate travel and event rides.",
      },
      {
        label: "What we built",
        text: "The public site: a booking widget on the home page, 22 pages for the searches East Valley riders make, a fleet with a page per vehicle, and a flight tracker. Behind it, the same platform Nier runs on: booking, dispatch, a driver app, a corporate portal and payments through Stripe.",
      },
      {
        label: "Try it",
        text: "Everything runs in test mode, so you can book a ride end to end with Stripe's test card and nothing is charged. A banner on every page says it's a demo, and the site is kept out of search results.",
      },
      {
        label: "Behind the login",
        text: "The dashboards are filled with sample data: riders, drivers, corporate accounts, invoices and hundreds of rides. On a call I'll log in as each role and show you how a ride moves from booking to dispatch to payout.",
      },
      {
        label: "Who it's for",
        text: "Operators who want to see the whole platform before they commit, from the booking page a rider sees to the board a dispatcher works from.",
      },
    ],
    inside: [
      {
        icon: "booking",
        title: "Online booking",
        text: "Address search, a route map and the price up front, in three steps.",
      },
      {
        icon: "clipboard",
        title: "Dispatch",
        text: "Every ride assigned from one board, with a calendar of the week.",
      },
      {
        icon: "phone",
        title: "Driver app",
        text: "Drivers see their schedule, update each trip and track their earnings.",
      },
      {
        icon: "clock",
        title: "Flight tracking",
        text: "Look up any flight, and airport pickups follow the landing time.",
      },
      {
        icon: "users",
        title: "Corporate portal",
        text: "Company accounts, their employees and one invoice a month.",
      },
      {
        icon: "card",
        title: "Payments",
        text: "Stripe in test mode: deposits, payment links, receipts and refunds.",
      },
      {
        icon: "globe",
        title: "Search pages",
        text: "22 pages for services, vehicles, airports, cities and routes.",
      },
      {
        icon: "bell",
        title: "Notifications",
        text: "Emails and push alerts for riders, drivers and dispatch, sent on their own.",
      },
    ],
    // PLACEHOLDER photos: swap in screenshots of mesamidnighttransport.com.
    photos: [
      {
        src: Concept1Hero,
        alt: "The Mesa Midnight home page",
        caption: "The home page",
      },
      {
        src: Concept1Story,
        alt: "The Mesa Midnight booking flow",
        caption: "The booking flow",
      },
      {
        src: Concept2,
        alt: "The Mesa Midnight booking flow",
        caption: "The booking flow",
      },
      {
        src: Concept3,
        alt: "The Mesa Midnight booking flow",
        caption: "The booking flow",
      },
      {
        src: Concept4,
        alt: "The Mesa Midnight booking flow",
        caption: "The booking flow",
      },
      {
        src: Concept5,
        alt: "The Mesa Midnight booking flow",
        caption: "The booking flow",
      },
    ],
    cta: {
      title: "Want a site like this?",
      text: "Book a ride on the live demo, run the free audit to see where your site stands today, or book a call and I'll walk you through the dashboards.",
    },
  },
  {
    slug: "valley-vintage-carriage-co",
    name: "Valley Vintage Carriage Co.",
    logo: NierLogo, // PLACEHOLDER
    title: "Valley Vintage Carriage Co.",
    status: "Coming soon",
    summary:
      "A concept wedding car company in Phoenix with five restored classics from 1928 to 1957, built on the same platform as Nier and reshaped for a small fleet that books one wedding per car, per day.",
    facts: [
      { label: "Location", value: "Phoenix, AZ" },
      { label: "Year", value: "2026" },
      { label: "Service", value: "Full Platform" },
      { label: "Industry", value: "Vintage wedding cars" },
      { label: "Client", value: "Concept, not a real company" },
      { label: "Status", value: "Coming soon" },
    ],
    results: {
      title: "Built to",
      intro:
        "What Valley Vintage is being built to do, against the typical vintage wedding car site.",
      beforeLabel: "Typical site",
      rows: [
        {
          label: "Per-booking fees",
          before: "A platform fee per booking",
          now: "$0",
          note: "Bookings go straight to the company, through its own Stripe account.",
        },
        {
          label: "How a booking starts",
          before: "A contact form and a callback",
          now: "Date first",
          note: "Each car books once per day, so couples pick their date and only see the cars still free on it.",
        },
        {
          label: "Deposits",
          before: "Invoiced by email",
          now: "$250 online",
          note: "A deposit holds the car at booking, and the balance is charged on its own 14 days before the wedding.",
        },
        {
          label: "The fleet",
          before: "One photo gallery",
          now: "5 named cars",
          note: "Each car has its own story, year, rider count and season, so couples choose a car, not a category.",
        },
        {
          label: "Wedding planners",
          before: "Emails and spreadsheets",
          now: "A portal",
          note: "Planners book for every couple from one account, with saved venues and one monthly invoice.",
        },
      ],
    },
    brief: [
      {
        label: "What it shows",
        text: "That the platform behind a black car company can run a very different transportation business. Valley Vintage is a made-up Phoenix company that drives couples to and from their weddings in restored cars from the 1920s to the 1950s.",
      },
      {
        label: "What we're building",
        text: "A site with an art deco look and Sonoran colors: a page for each of the five cars, wedding packages with prices, celebrations beyond weddings, a gallery, the family story, the areas served and an FAQ that answers the Phoenix questions, like heat, monsoon season and how many people fit beside a gown.",
      },
      {
        label: "Same platform, new business",
        text: "The booking flow starts with the date, shows only the cars free that day and takes a deposit instead of full payment. Airport flight tracking is switched off, add-ons like floral décor and a champagne toast are added, and corporate accounts become planner accounts.",
      },
      {
        label: "Status",
        text: "Coming soon. The site is still being built, so there's no live link yet. When it launches, the booking flow will run in test mode like the other concept sites.",
      },
      {
        label: "Who it's for",
        text: "Operators whose business isn't airport runs: wedding cars, classic and specialty fleets, party buses, and anyone who needs deposits, date-based availability and planner accounts more than flight tracking.",
      },
    ],
    inside: [
      {
        icon: "calendar",
        title: "Date-first booking",
        text: "Couples check their date before anything else and see only the cars still free.",
      },
      {
        icon: "image",
        title: "A page per car",
        text: "Five named classics, each with its story, riders, climate control and season.",
      },
      {
        icon: "card",
        title: "Deposits and balances",
        text: "$250 to reserve, with the balance charged automatically before the day.",
      },
      {
        icon: "sparkle",
        title: "Add-ons",
        text: "Floral décor, a champagne toast, a red carpet and a second car, added at checkout.",
      },
      {
        icon: "users",
        title: "Planner accounts",
        text: "Wedding planners book for every couple and get one monthly invoice.",
      },
      {
        icon: "bell",
        title: "Reminders",
        text: "Timeline, balance and meet-your-chauffeur emails go out on their own.",
      },
      {
        icon: "clipboard",
        title: "Dispatch",
        text: "Every car and chauffeur assigned from one board, with a driver portal.",
      },
      {
        icon: "globe",
        title: "Service-area pages",
        text: "A page for each part of the Valley the cars serve, from Downtown to Cave Creek.",
      },
    ],
    photos: [
      {
        src: VintageHome,
        alt: "The Valley Vintage Carriage Co. home page design",
        caption: "The home page",
      },
    ],
    cta: {
      title: "Want a site like this?",
      text: "This one is still being built. Book a call and I'll show you how the same platform can be shaped around your kind of transportation business, or run the free audit to see where your site stands today.",
    },
  },
];

export const projectHref = (project: Pick<Project, "slug">) =>
  `/projects/${project.slug}`;

export const getProject = (slug: string) =>
  projects.find((project) => project.slug === slug);
