// The questionnaire every website client fills in before the build: ten
// short sections, each feeding particular pages of their site. The
// "booking" section changes with the plan: Website Only links to the
// booking software a client already uses; Full Platform sets up payments.
//
// An admin can upload their own questions as a .md file for one client
// (customQuestions.ts), either replacing these or added after them; with
// nothing uploaded, these are what the client sees.
//
// Question ids are what answers are saved under, so an id that already has
// answers keeps its meaning.

import type { Answers, PlanId } from "./types";

export type Question = {
  id: string;
  label: string;
  help?: string;
  type: "text" | "textarea" | "email" | "tel" | "url" | "choice" | "multi";
  options?: string[];
  placeholder?: string;
  required?: boolean;
};

export type QuestionSection = {
  id: string;
  title: string;
  intro: string;
  questions: Question[];
};

const booking: Record<PlanId, Question[]> = {
  WEBSITE_ONLY: [
    {
      id: "bookingSoftware",
      label: "How riders book with you today",
      type: "choice",
      options: [
        "Limo Anywhere",
        "Moovs",
        "Another booking platform",
        "Phone and email only",
      ],
      required: true,
    },
    {
      id: "bookingLink",
      label: "Your booking link",
      help: "The page riders use to book. Every Book now button on your new site will open it.",
      type: "url",
      placeholder: "https://",
    },
  ],
  FULL_PLATFORM: [
    {
      id: "stripe",
      label: "Do you have a Stripe account?",
      help: "Payments go straight to your own Stripe account, with no per-booking fees.",
      type: "choice",
      options: ["Yes", "No, help me set one up"],
      required: true,
    },
    {
      id: "payWhen",
      label: "When do riders pay?",
      type: "choice",
      options: [
        "The full fare when they book",
        "A deposit when they book, the rest after",
        "After the ride",
      ],
      required: true,
    },
    {
      id: "driverCount",
      label: "How many drivers will use the driver app?",
      type: "text",
      placeholder: "e.g. 4",
    },
  ],
};

export function questionnaireFor(plan: PlanId): QuestionSection[] {
  return [
    {
      id: "business",
      title: "Your business",
      intro: "The basics, exactly as riders should see them.",
      questions: [
        {
          id: "businessName",
          label: "Business name",
          type: "text",
          required: true,
        },
        { id: "yearStarted", label: "Year you started", type: "text" },
        {
          id: "baseCity",
          label: "Where you're based",
          type: "text",
          placeholder: "e.g. Scottsdale, AZ",
          required: true,
        },
        {
          id: "serviceArea",
          label: "Cities and areas you serve",
          help: "List them all. Each one can become a page riders find on Google.",
          type: "textarea",
          required: true,
        },
        {
          id: "topAreas",
          label: "The 3 to 5 areas most of your bookings come from today",
          help: "We build the pages for these first.",
          type: "textarea",
          required: true,
        },
        {
          id: "hours",
          label: "Your hours",
          type: "choice",
          options: [
            "24/7",
            "Set hours, after hours by request",
            "By appointment",
          ],
          required: true,
        },
        {
          id: "phone",
          label: "Phone number for bookings",
          type: "tel",
          required: true,
        },
        {
          id: "bookingEmail",
          label: "Email for booking requests",
          type: "email",
          required: true,
        },
      ],
    },
    {
      id: "story",
      title: "Your story",
      intro:
        "This becomes your About page and the heart of your homepage. A few honest sentences beat polished ones.",
      questions: [
        {
          id: "founder",
          label: "Who started the business, and why?",
          type: "textarea",
          placeholder:
            "e.g. I drove for a large company for 8 years and knew riders deserved better…",
          required: true,
        },
        {
          id: "different",
          label: "What do you do better than anyone else in your market?",
          type: "textarea",
          required: true,
        },
        {
          id: "ridersSay",
          label: "What do riders tell you after a great ride?",
          help: "Their words, as close as you remember them.",
          type: "textarea",
        },
      ],
    },
    {
      id: "rides",
      title: "Your rides",
      intro: "What you drive, where, and what you want more of.",
      questions: [
        {
          id: "services",
          label: "The rides you offer",
          type: "multi",
          options: [
            "Airport transfers",
            "Corporate travel",
            "Weddings",
            "Proms and formals",
            "Wine and day tours",
            "Games and concerts",
            "Hourly charters",
            "Long distance",
            "Medical appointments",
          ],
          required: true,
        },
        {
          id: "airportsServed",
          label: "Airports you serve",
          type: "text",
          placeholder: "e.g. Sky Harbor (PHX), Mesa Gateway (AZA)",
        },
        {
          id: "topServices",
          label: "Describe your 2 or 3 most important services",
          help: "What's included, who books it, and what makes yours better. Each one gets its own page.",
          type: "textarea",
          required: true,
        },
        {
          id: "moreOf",
          label: "Which rides do you want more of?",
          help: "These get the most pages and the strongest calls to book.",
          type: "textarea",
          required: true,
        },
        {
          id: "phoneQuestions",
          label: "What questions do riders keep asking you on the phone?",
          help: "List as many as you can. They become your FAQ and the articles that bring riders in from Google.",
          type: "textarea",
          required: true,
        },
      ],
    },
    {
      id: "fleet",
      title: "Your fleet",
      intro: "The vehicles riders can book.",
      questions: [
        {
          id: "vehicles",
          label: "Your vehicles, with how many passengers each seats",
          help: "One per line.",
          type: "textarea",
          placeholder:
            "2 × Cadillac Escalade, 6 passengers\n1 × Mercedes S-Class, 3 passengers",
          required: true,
        },
        {
          id: "largestGroup",
          label: "Largest group in one vehicle",
          type: "text",
          placeholder: "e.g. 14 in the Sprinter",
        },
        {
          id: "luggage",
          label: "How much luggage fits in each vehicle?",
          type: "textarea",
          placeholder: "e.g. Escalade: 6 large suitcases. S-Class: 3.",
        },
        {
          id: "amenities",
          label: "What riders get",
          type: "multi",
          options: [
            "Water and mints",
            "Wi-Fi",
            "Phone chargers",
            "Car seats on request",
            "Meet and greet with a sign",
            "Flight tracking",
          ],
        },
      ],
    },
    {
      id: "policies",
      title: "Prices and policies",
      intro:
        "What riders want to know before they book. Whatever format you have is fine.",
      questions: [
        {
          id: "rates",
          label: "Your rates",
          help: "Paste your price list, flat rates and hourly minimums.",
          type: "textarea",
          placeholder:
            "e.g. 2-hour minimum on hourly; $95 flat from Scottsdale to Sky Harbor.",
          required: true,
        },
        {
          id: "gratuity",
          label: "Gratuity",
          type: "choice",
          options: [
            "Included in the fare",
            "Added automatically",
            "Up to the rider",
          ],
        },
        {
          id: "cancellation",
          label: "Your cancellation policy",
          type: "textarea",
          placeholder: "e.g. Free up to 24 hours before pickup, 50% after that.",
          required: true,
        },
        {
          id: "waitTime",
          label: "How long you wait at a pickup before it's a no-show",
          type: "text",
          placeholder: "e.g. 15 minutes; 60 minutes after an airport landing",
        },
        {
          id: "extras",
          label: "Do you offer any of these?",
          type: "multi",
          options: [
            "Child seats",
            "Pets welcome",
            "Wheelchair-accessible vehicle",
          ],
        },
        {
          id: "permit",
          label: "Permit or license number to show on your site",
          type: "text",
          placeholder: "e.g. TCP 12345",
        },
      ],
    },
    {
      id: "proof",
      title: "Reviews and proof",
      intro: "What makes a rider trust you before they've met you.",
      questions: [
        {
          id: "reviews",
          label: "Where are your reviews, and about how many on each?",
          type: "textarea",
          placeholder: "e.g. Google: 85 reviews, 4.9 stars. Yelp: 20.",
          required: true,
        },
        {
          id: "testimonials",
          label: "3 to 5 reviews or testimonials we can put on your site",
          help: "With the rider's first name and city, if you have their OK.",
          type: "textarea",
        },
        {
          id: "awards",
          label: "Awards, memberships or press",
          type: "textarea",
          placeholder: "e.g. NLA member, Best of Scottsdale 2025",
        },
        {
          id: "notableClients",
          label: "Notable clients, hotels, venues or events you've driven for",
          help: "General is fine, like \"a Fortune 500 tech company\".",
          type: "textarea",
        },
      ],
    },
    {
      id: "brand",
      title: "Your brand",
      intro: "How the site should look, sound and feel.",
      questions: [
        {
          id: "words",
          label: "Three words for how you want to come across",
          type: "multi",
          options: [
            "Luxury",
            "Professional",
            "Discreet",
            "Friendly",
            "Modern",
            "Classic",
            "Local",
            "Reliable",
          ],
          required: true,
        },
        {
          id: "tagline",
          label: "A tagline or slogan you already use",
          type: "text",
        },
        {
          id: "colors",
          label: "Colors you use or like",
          type: "text",
          placeholder: "e.g. Black and copper",
        },
        {
          id: "sitesYouLike",
          label: "Websites you like, and why",
          help: "From any industry.",
          type: "textarea",
        },
        {
          id: "competitors",
          label: "Competitors you want to outrank",
          type: "textarea",
        },
        {
          id: "avoid",
          label: "Anything you don't want on your site",
          help: "Words, photos or claims to stay away from.",
          type: "textarea",
        },
      ],
    },
    {
      id: "booking",
      title: plan === "FULL_PLATFORM" ? "Booking and payments" : "Booking",
      intro:
        plan === "FULL_PLATFORM"
          ? "How your booking system should take payments."
          : "Where your Book now buttons should go.",
      questions: booking[plan],
    },
    {
      id: "accounts",
      title: "Your current site and accounts",
      intro: "So nothing you've built up on Google is lost when we launch.",
      questions: [
        {
          id: "currentSite",
          label: "Your current website, if you have one",
          type: "url",
          placeholder: "https://",
        },
        {
          id: "bestPages",
          label: "Pages on your current site that bring in bookings",
          help: "We'll make sure they redirect to the new site, so you keep their place on Google.",
          type: "textarea",
        },
        {
          id: "domain",
          label: "Your domain name",
          type: "text",
          placeholder: "e.g. yourcompany.com",
          required: true,
        },
        {
          id: "registrar",
          label: "Where it's registered",
          type: "choice",
          options: [
            "GoDaddy",
            "Namecheap",
            "Squarespace",
            "Cloudflare",
            "Not sure",
          ],
        },
        {
          id: "googleProfile",
          label: "Do you have a Google Business Profile?",
          type: "choice",
          options: ["Yes", "No", "Not sure"],
          required: true,
        },
        {
          id: "social",
          label: "Your social pages and review sites",
          type: "textarea",
        },
      ],
    },
    {
      id: "goals",
      title: "Goals",
      intro: "Last one.",
      questions: [
        {
          id: "mainGoal",
          label: "Your number one goal for the new site",
          type: "choice",
          options: [
            "More direct bookings",
            "More corporate accounts",
            "Show up on Google",
            "Look more professional",
            "Stop paying booking fees",
          ],
          required: true,
        },
        {
          id: "timing",
          label: "When would you like it live?",
          type: "choice",
          options: [
            "As soon as possible",
            "Within a month",
            "Within 2 to 3 months",
            "No rush",
          ],
        },
        {
          id: "anythingElse",
          label: "Anything else we should know?",
          type: "textarea",
        },
      ],
    },
  ];
}

export const isAnswered = (value: Answers[string] | undefined) =>
  Array.isArray(value) ? value.length > 0 : Boolean(value?.trim());
