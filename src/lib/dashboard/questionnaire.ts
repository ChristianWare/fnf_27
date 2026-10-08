// The questionnaire every website client fills in before the build. The
// "booking" section changes with the plan: Website Only links to the
// booking software a client already uses; Full Platform sets up payments.

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
      id: "cancellation",
      label: "Your cancellation policy",
      type: "textarea",
      placeholder: "e.g. Free up to 24 hours before pickup, 50% after that.",
      required: true,
    },
    {
      id: "rates",
      label: "Hourly minimums and flat rates",
      help: "We set your rates up from this, then you check them before launch.",
      type: "textarea",
      placeholder:
        "e.g. 2-hour minimum on hourly; $95 flat from Scottsdale to Sky Harbor.",
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
      intro: "The basics, as riders should see them.",
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
        {
          id: "hours",
          label: "Your hours",
          type: "choice",
          options: [
            "24/7",
            "Set hours, after hours by request",
            "By appointment",
          ],
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
          ],
          required: true,
        },
        {
          id: "airports",
          label: "Airports you serve",
          type: "multi",
          options: [
            "Sky Harbor (PHX)",
            "Mesa Gateway (AZA)",
            "Scottsdale (SDL)",
            "Tucson (TUS)",
            "Flagstaff (FLG)",
          ],
        },
        {
          id: "moreOf",
          label: "Which rides do you want more of?",
          help: "These get the most pages and the strongest calls to book.",
          type: "textarea",
          required: true,
        },
        {
          id: "different",
          label: "What do riders say makes you different?",
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
          label: "Your vehicles",
          help: "One per line, with how many you have.",
          type: "textarea",
          placeholder: "2 × Cadillac Escalade\n1 × Mercedes S-Class",
          required: true,
        },
        {
          id: "largestGroup",
          label: "Largest group in one vehicle",
          type: "text",
          placeholder: "e.g. 14 in the Sprinter",
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
      id: "brand",
      title: "Your brand",
      intro: "How the site should look and feel.",
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
          id: "colors",
          label: "Colors you use or like",
          type: "text",
          placeholder: "e.g. Black and copper",
        },
        {
          id: "sitesYouLike",
          label: "Websites you like, and why",
          type: "textarea",
        },
        {
          id: "avoid",
          label: "Anything you don't want on your site",
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
      title: "Domain and accounts",
      intro: "So we can launch and connect Google.",
      questions: [
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
  ];
}

export const isAnswered = (value: Answers[string] | undefined) =>
  Array.isArray(value) ? value.length > 0 : Boolean(value?.trim());
