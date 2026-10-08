// The projects with a page of their own at /projects/[slug]. The cards on
// /projects live in ProjectGrid; keep the slugs here matching its hrefs.
// Nier is real. The two concepts are PLACEHOLDERS until those sites exist.

import type { StaticImageData } from "next/image";
import NierLogo from "../../public/images/nierLogo.png";
import Barry from "../../public/images/barry.png";
import NierHero from "../../public/images/cadiv.png";
import NierStory from "../../public/images/cadiMotion.png";
import Concept1Hero from "../../public/images/chevy_corp.png";
import Concept1Story from "../../public/images/cadi_drive.png";
import Concept2Hero from "../../public/images/branded.jpg";
import Concept2Story from "../../public/images/cadiii.png";

export type Fact = { label: string; value: string; href?: string };

export type Stat = {
  /** Two short lines, shown in mono above the number. */
  label: string;
  value: string;
};

export type StoryBlock =
  | { type: "text"; heading: string; paragraphs: string[] }
  | {
      type: "quote";
      text: string;
      name: string;
      role: string;
      avatar?: StaticImageData;
    }
  | { type: "image"; src: StaticImageData; alt: string };

export type Project = {
  slug: string;
  name: string;
  logo?: StaticImageData;
  /** The page title: the result, in one line. */
  title: string;
  /** For the page's metadata. */
  summary: string;
  hero: StaticImageData;
  heroAlt: string;
  facts: Fact[];
  stats: Stat[];
  story: StoryBlock[];
};

export const projects: Project[] = [
  {
    slug: "nier-transportation",
    name: "Nier Transportation",
    logo: NierLogo,
    title:
      "Off the per-booking platforms: $0 fees, and bookings 24/7 on its own site",
    summary:
      "How a 20-year Phoenix black car operator moved from per-booking platforms to its own website, booking system and dispatch, with $0 per-booking fees.",
    hero: NierHero,
    heroAlt: "A black Cadillac Escalade parked in the Arizona desert",
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
    stats: [
      { label: "Per-booking fees\non every ride", value: "$0" },
      { label: "City pages\nbuilt for search", value: "40" },
      { label: "Airport and\nroute pages", value: "13" },
      { label: "Driving Phoenix\nsince", value: "2004" },
    ],
    story: [
      {
        type: "text",
        heading: "The problem: paying to rent your own customers",
        paragraphs: [
          "Nier Transportation has run black car service in Phoenix since 2004. For years its bookings came through platforms that charged a fee on every ride and kept the customer list. A rider who booked Nier once was shown three other companies the next time, and the fees grew with every good month.",
          "The website was a brochure. It had no way to book, no page for the airport, and nothing that matched the searches riders in Phoenix make. Barry wanted riders to book on his own site, under his own name, and to stop paying for the privilege of someone else owning his customers.",
        ],
      },
      {
        type: "quote",
        text: "Fonts & Footers built us a direct booking platform that looks better than anything our competitors are running, and our clients actually use it. It paid for itself in the first month.",
        name: "Barry LaNier",
        role: "Owner, Nier Transportation",
        avatar: Barry,
      },
      {
        type: "text",
        heading: "What we built",
        paragraphs: [
          "A custom site built around the searches Phoenix riders make: 40 city pages, 3 airport pages for Sky Harbor, Mesa Gateway and Scottsdale, and 10 route pages for the runs Nier drives every week, from Scottsdale to Sky Harbor to Phoenix to Sedona.",
          "Behind it, the Full Platform. Riders choose the service, pickup time, route and vehicle, see the price, and book, with round trips and multi-day itineraries in one booking and one payment. Barry assigns each ride; his drivers see their schedule and update each trip's status from their phone. Airport pickups track the flight. Payments run through Nier's own Stripe account, with deposits, cards on file, payment links and refunds, and corporate accounts get their own portal and invoices.",
        ],
      },
      {
        type: "image",
        src: NierStory,
        alt: "A black SUV driving through downtown Phoenix",
      },
      {
        type: "text",
        heading: "The switch, with no day offline",
        paragraphs: [
          "We built and tested while the old platform kept running. Nier's vehicles, rates, service areas and corporate accounts were set up from an export, and the customer list came with them. On launch day, new bookings started on niertransportation.com; reservations already on the books stayed where they were until they were done.",
          "There was never a day without a way to book, and no rider had to learn anything. The confirmation emails, reminders and receipts now carry Nier's name instead of a platform's.",
        ],
      },
      {
        type: "text",
        heading: "What changed",
        paragraphs: [
          "Every booking is now a direct booking, with $0 per-booking fees. The customer list lives in Nier's dashboard, exportable anytime. Riders book at 11pm without calling, drivers get their trips on their phone, and corporate clients book under their company's name and get one invoice.",
          'The pages are indexed and climbing: the route and airport pages already rank for searches like "tucson to phoenix shuttle" and "sky harbor delta terminal", and organic traffic is up 105% on the previous period. The leads tool, included with the platform, now feeds Barry the hotels, venues and corporate accounts in his market each morning.',
        ],
      },
    ],
  },
  {
    slug: "concept-1",
    name: "[Concept 1]",
    title:
      "A corporate black car site with airport and route pages and a working booking flow",
    summary:
      "A concept site for a corporate and executive black car company: airport and route pages, corporate accounts and a booking flow in test mode.",
    hero: Concept1Hero,
    heroAlt: "A chauffeur shaking hands with a client beside a black SUV",
    facts: [
      { label: "Location", value: "Concept" },
      { label: "Year", value: "2026" },
      { label: "Service", value: "Website + booking, test mode" },
      { label: "Industry", value: "Corporate & executive black car" },
      { label: "Client", value: "Concept, not a real company" },
      { label: "Booking", value: "Live, in test mode" },
    ],
    stats: [
      { label: "Pages built\nfor search", value: "18" },
      { label: "Airport and\nroute pages", value: "9" },
      { label: "Steps to\nbook a ride", value: "3" },
      { label: "Per-booking\nfees", value: "$0" },
    ],
    story: [
      {
        type: "text",
        heading: "What this concept shows",
        paragraphs: [
          "PLACEHOLDER. This is a concept site, built to show what a corporate black car company's site looks like on the Full Platform: a homepage for the city, a page per airport, route pages for the suburbs executives travel from, and a corporate accounts page written for the assistant who books the rides.",
          "The booking flow is real and runs in test mode, so you can book a ride end to end without anything being charged.",
        ],
      },
      {
        type: "image",
        src: Concept1Story,
        alt: "A chauffeur's hands on the steering wheel",
      },
      {
        type: "text",
        heading: "How it would run for a real operator",
        paragraphs: [
          "PLACEHOLDER. Replace with the concept's own story once the site is built: the pages, the booking flow, the corporate portal, and what an operator in this niche would see in the first three months.",
        ],
      },
    ],
  },
  {
    slug: "concept-2",
    name: "[Concept 2]",
    title:
      "A wedding and party limo site with event pages, fleet galleries and online booking",
    summary:
      "A concept site for a wedding and party limo company: event pages, fleet galleries and a booking flow in test mode.",
    hero: Concept2Hero,
    heroAlt: "Three men in suits and sunglasses, laughing",
    facts: [
      { label: "Location", value: "Concept" },
      { label: "Year", value: "2026" },
      { label: "Service", value: "Website + booking, test mode" },
      { label: "Industry", value: "Wedding & party limo" },
      { label: "Client", value: "Concept, not a real company" },
      { label: "Booking", value: "Live, in test mode" },
    ],
    stats: [
      { label: "Event pages\nbuilt for search", value: "12" },
      { label: "Vehicles in\nthe fleet gallery", value: "6" },
      { label: "Steps to\nbook a ride", value: "3" },
      { label: "Per-booking\nfees", value: "$0" },
    ],
    story: [
      {
        type: "text",
        heading: "What this concept shows",
        paragraphs: [
          "PLACEHOLDER. This is a concept site, built to show what a wedding and party limo company's site looks like on the Full Platform: a page per occasion, a fleet gallery with real interior photos, and a booking flow that takes a deposit and sends the balance link before the day.",
          "The booking flow is real and runs in test mode, so you can book a ride end to end without anything being charged.",
        ],
      },
      {
        type: "image",
        src: Concept2Story,
        alt: "A black SUV on a sand-colored backdrop",
      },
      {
        type: "text",
        heading: "How it would run for a real operator",
        paragraphs: [
          "PLACEHOLDER. Replace with the concept's own story once the site is built: the event pages, the fleet gallery, the deposit flow, and what a wedding season looks like with reminders and balance links going out on their own.",
        ],
      },
    ],
  },
];

export const projectHref = (project: Pick<Project, "slug">) =>
  `/projects/${project.slug}`;

export const getProject = (slug: string) =>
  projects.find((project) => project.slug === slug);
