// Check 2, the Google Business Profile: the listing riders see in the map
// results. Reviews against the operators near them count the most, then
// the rating, photos, hours, and whether the listing and the website agree
// on the address and phone number. A street address showing is noted, not
// scored: it may be an office riders can visit. Server only.

import { digits, isOwnSite, type SiteRead } from "../site";
import { hostOf } from "../searches";
import type { CheckResult, Listing, Part, Rival } from "../types";
import { list, num, part, plural, result, words } from "./parts";

const CREATE_FIX =
  'Claim your free Google Business Profile at business.google.com. Pick a category like "Limousine service" or "Chauffeur service", and add your service areas, hours, phone number, website and real photos of your vehicles.';

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return undefined;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function profileCheck(input: {
  listing?: Listing;
  /** They said they're not on Google, or we found nothing. */
  missing?: "said" | "searched";
  rivals: Rival[];
  site?: SiteRead;
  business: string;
}): CheckResult {
  const { listing, rivals, site } = input;

  if (!listing) {
    const found =
      input.missing === "said"
        ? "You're not on Google Maps yet, so riders searching nearby can't find you there."
        : `We couldn't find a Google Business Profile for ${input.business}.`;
    return result(
      "profile",
      [
        part({
          id: "listing",
          label: "A Google listing",
          max: 100,
          state: "missing",
          found,
          fix: CREATE_FIX,
        }),
      ],
      { found, fix: CREATE_FIX },
    );
  }

  const closed =
    listing.status === "CLOSED_PERMANENTLY" ||
    listing.status === "CLOSED_TEMPORARILY";
  const parts: Part[] = [];

  if (closed) {
    parts.push(
      part({
        id: "open",
        label: "Shown as open",
        max: 40,
        primary: true,
        state: "missing",
        found: `Google shows your listing as ${
          listing.status === "CLOSED_PERMANENTLY"
            ? "permanently"
            : "temporarily"
        } closed.`,
        fix: "Open your Business Profile and mark the business as open again; riders skip a listing that says closed.",
      }),
    );
  }

  // Reviews, against the top operators near them.
  const theirs = rivals
    .map((r) => r.reviews)
    .filter((n): n is number => typeof n === "number");
  const bar = median(theirs);
  const ratio = bar ? listing.reviews / bar : undefined;
  const reviewPoints =
    ratio !== undefined
      ? ratio >= 1
        ? 40
        : ratio >= 0.5
          ? 26
          : ratio >= 0.2
            ? 14
            : listing.reviews > 0
              ? 6
              : 0
      : listing.reviews >= 100
        ? 40
        : listing.reviews >= 40
          ? 26
          : listing.reviews >= 10
            ? 14
            : listing.reviews > 0
              ? 6
              : 0;
  const rivalText = theirs.length
    ? ` The top ${theirs.length === 1 ? "operator" : `${words(theirs.length)} operators`} near you ${theirs.length === 1 ? "has" : "have"} ${list(theirs.map(num))}.`
    : "";
  parts.push(
    part({
      id: "reviews",
      label: "Reviews, against the operators near you",
      max: 40,
      primary: true,
      state:
        reviewPoints >= 40 ? "good" : reviewPoints > 0 ? "partial" : "missing",
      points: reviewPoints,
      found: `You have ${num(listing.reviews)} Google ${plural(listing.reviews, "review")}.${rivalText}`,
      proof: rivals.map((r) => ({
        label: `${r.name}: ${r.reviews !== undefined ? `${num(r.reviews)} ${plural(r.reviews, "review")}` : "no review count"}${r.rating ? `, ${r.rating.toFixed(1)}★` : ""}`,
      })),
      fix: "Ask every rider for a Google review after the ride: a short text with your review link, the same day.",
    }),
  );

  const rating = listing.rating;
  parts.push(
    part({
      id: "rating",
      label: "Your rating",
      max: 15,
      state: !rating ? "missing" : rating >= 4.7 ? "good" : "partial",
      points: !rating ? 0 : rating >= 4.4 ? 10 : rating >= 4 ? 6 : 2,
      found: rating
        ? `Your rating is ${rating.toFixed(1)} out of 5.`
        : "Your listing has no rating yet.",
      fix: "Reply to every review, good or bad, and ask your regulars for one; a steady stream of new five-star reviews lifts your average.",
    }),
  );

  parts.push(
    part({
      id: "photos",
      label: "Photos",
      max: 10,
      state:
        listing.photos >= 10
          ? "good"
          : listing.photos > 0
            ? "partial"
            : "missing",
      points: listing.photos >= 5 ? 6 : 3,
      found:
        listing.photos >= 10
          ? "Your listing has 10 or more photos."
          : listing.photos
            ? `Your listing has ${listing.photos} ${plural(listing.photos, "photo")}.`
            : "Your listing has no photos.",
      fix: "Add at least ten real photos: your vehicles inside and out, and your chauffeurs.",
    }),
  );

  parts.push(
    part({
      id: "hours",
      label: "Hours",
      max: 10,
      state: listing.hours ? "good" : "missing",
      found: listing.hours
        ? "Your hours are on your listing."
        : "Your listing has no hours, so Google can't show you as open.",
      fix: "Add your hours (24 hours if you take bookings around the clock), so Google shows you as open when riders search.",
    }),
  );

  // The listing and the website should point at each other.
  const siteHost = site ? hostOf(site.url) : undefined;
  const listedHost = listing.website ? hostOf(listing.website) : undefined;
  const own = isOwnSite(listing.website);
  parts.push(
    part({
      id: "website",
      label: "Links to your website",
      max: 15,
      state: !listedHost
        ? "missing"
        : own && (!siteHost || listedHost === siteHost)
          ? "good"
          : "partial",
      points: 5,
      found: !listedHost
        ? "Your listing doesn't link to a website."
        : !own
          ? `Your listing links to ${listedHost}, not a website of your own.`
          : !siteHost || listedHost === siteHost
            ? "Your listing links to your website."
            : `Your listing links to ${listedHost}, not ${siteHost}.`,
      fix: "Link your listing to your own website's homepage, not a booking page or a social profile.",
    }),
  );

  const sitePhones = site
    ? [...new Set([site.home, ...site.pages].flatMap((p) => p.phones))]
    : [];
  const listedPhone = listing.phone ? digits(listing.phone) : undefined;
  parts.push(
    part({
      id: "phone",
      label: site ? "The same phone number" : "A phone number",
      max: 10,
      state: !listedPhone
        ? "missing"
        : !site || sitePhones.includes(listedPhone)
          ? "good"
          : "partial",
      points: 3,
      found: !listedPhone
        ? "Your listing has no phone number."
        : !site
          ? `Your listing shows your phone number, ${listing.phone}.`
          : sitePhones.includes(listedPhone)
            ? `Your listing's number, ${listing.phone}, is the one on your website.`
            : `Your listing's number, ${listing.phone}, isn't on your website.`,
      fix: site
        ? "Use the same phone number on your listing and your website, so Google and riders can tell they're the same business."
        : "Add your phone number to your listing, so riders can call you straight from the map results.",
    }),
  );

  const notes: string[] = [];
  const street = listing.address && /^\d+\s+\S/.test(listing.address);
  if (listing.serviceArea === false && street)
    notes.push(
      `Your listing shows a street address (${listing.address}). If that's your home rather than an office riders can visit, Google's guidelines say to hide it and show your service areas instead.`,
    );

  const headline = closed
    ? parts[0].found
    : `${listing.name} has ${num(listing.reviews)} ${plural(listing.reviews, "review")}${
        rating ? ` and a ${rating.toFixed(1)} rating` : ""
      }${theirs.length ? `; the top operators near you have ${list(theirs.map(num))}` : ""}.`;
  return result("profile", parts, { found: headline, notes });
}
