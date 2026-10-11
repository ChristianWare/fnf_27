// Structured data (schema.org) the pages share, so Google and AI search
// read the company, the plans and their prices, and who writes the
// Journal. Rendered with components/shared/JsonLd. Keep the prices here
// in step with the pricing pages.

import { APP_URL } from "@/lib/server/config";

const SITE = APP_URL;
const ORG_ID = `${SITE}/#organization`;
export const AUTHOR_PATH = "/about/chris-ware";
const AUTHOR_ID = `${SITE}${AUTHOR_PATH}#person`;

const abs = (path: string) => `${SITE}${path === "/" ? "" : path}`;

/** The company, on every page (from the root layout). */
export const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORG_ID,
  name: "Fonts & Footers",
  url: SITE,
  logo: `${SITE}/icon.png`,
  email: "hello@fontsandfooters.com",
  description:
    "Websites, booking and dispatch software, and leads tools built only for black car and limo operators.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Phoenix",
    addressRegion: "AZ",
    addressCountry: "US",
  },
  areaServed: { "@type": "Country", name: "United States" },
  founder: {
    "@type": "Person",
    "@id": AUTHOR_ID,
    name: "Chris Ware",
    url: abs(AUTHOR_PATH),
  },
  sameAs: [
    "https://www.linkedin.com/company/fontsandfooters",
    "https://www.instagram.com/fontsandfooters",
    "https://www.facebook.com/fontsandfooters",
  ],
};

/** Chris, who writes the Journal. */
export const author = {
  "@type": "Person",
  "@id": AUTHOR_ID,
  name: "Chris Ware",
  url: abs(AUTHOR_PATH),
  jobTitle: "Founder",
  worksFor: { "@id": ORG_ID },
};

export const authorPage = { "@context": "https://schema.org", ...author };

type Price = { price: number; per?: "month"; note?: string };

function offer(name: string, { price, per, note }: Price) {
  return {
    "@type": "Offer",
    name,
    price: String(price),
    priceCurrency: "USD",
    ...(per
      ? {
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: String(price),
            priceCurrency: "USD",
            unitText: "MONTH",
            referenceQuantity: {
              "@type": "QuantitativeValue",
              value: 1,
              unitCode: "MON",
            },
          },
        }
      : {}),
    ...(note ? { description: note } : {}),
    url: abs("/pricing"),
  };
}

/** The booking software (the Full Platform). */
export const bookingSoftware = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Fonts & Footers Full Platform",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Limo booking and dispatch software",
  operatingSystem: "Web",
  url: abs("/services/booking-software"),
  description:
    "Booking, dispatch, driver and admin portals, flight tracking and payments for black car and limo operators, built into a custom website, with the leads tool included and no per-booking fees.",
  provider: { "@id": ORG_ID },
  offers: [
    offer("Full Platform", {
      price: 499,
      per: "month",
      note: "Month to month. No per-booking fees.",
    }),
    offer("Full Platform setup", {
      price: 500,
      note: "One time, to build the site and set up booking.",
    }),
  ],
};

/** The leads tool. */
export const leadsTool = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Fonts & Footers Leads Tool",
  applicationCategory: "BusinessApplication",
  applicationSubCategory: "Lead generation for limo companies",
  operatingSystem: "Web",
  url: abs("/services/leads"),
  description:
    "Finds the hotels, venues, corporate travel managers, funeral homes and upcoming events in a limo operator's market, with the decision-maker's contact and an outreach script for each.",
  provider: { "@id": ORG_ID },
  offers: [
    offer("Leads tool", {
      price: 125,
      per: "month",
      note: "Free for the first 30 days, no card. Included with the Full Platform.",
    }),
  ],
};

/** The website service. */
export const websiteService = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Limo website design",
  serviceType: "Website design for black car and limo companies",
  url: abs("/services/websites"),
  description:
    "A custom website for a black car or limo company, with a page for every airport, route and city it serves, hosting and edits included.",
  provider: { "@id": ORG_ID },
  areaServed: { "@type": "Country", name: "United States" },
  offers: [
    offer("Website Only", { price: 199, per: "month" }),
    offer("Website setup", { price: 500, note: "One time." }),
  ],
};

/** The trail from the home page, for Google's breadcrumbs. */
export function breadcrumbs(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map(
      (crumb, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: crumb.name,
        item: abs(crumb.path),
      }),
    ),
  };
}

/** A Journal post. */
export function article(post: {
  title: string;
  excerpt: string;
  date: string;
  image: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    image: abs(post.image),
    url: abs(post.path),
    mainEntityOfPage: abs(post.path),
    author,
    publisher: { "@id": ORG_ID },
  };
}
