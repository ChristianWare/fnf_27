// Check 4, online booking: whether a rider can book without calling. The
// audit follows the site's Book and Reserve links, looks at the forms on
// those pages, and at every file PageSpeed saw load, so a booking widget a
// script adds later still counts. Then two things on a phone: a number to
// tap, and a way to book or call on the first screen. Server only.

import type { FirstScreen } from "../ai";
import type { Speed } from "../apis/pagespeed";
import { bookingSystemOf, isFormHost } from "../booking-systems";
import type { Form, Page, SiteRead } from "../site";
import type { CheckResult, Proof } from "../types";
import { list, noWebsite, part, result } from "./parts";

const RIDE_FIELDS: [string, RegExp][] = [
  [
    "pickup",
    /pick\s?up|pick-up|origin|^from\b|\bfrom (address|location)|start(ing)? (address|location)/,
  ],
  [
    "drop-off",
    /drop\s?off|drop-off|destination|^to\b|\bto (address|location)|dropoff|end(ing)? (address|location)/,
  ],
  ["date", /\bdate\b|\bday\b/],
  ["time", /\btime\b|\bhour\b/],
  ["passengers", /passenger|\bpax\b|guests|riders|people/],
  ["flight", /flight|airline/],
  ["vehicle", /vehicle|car type|fleet|service type/],
];

const CONTACT_FIELDS = /e-?mail|phone|message|comments?|name/;

/** The ride details a form asks for. */
function rideFields(form: Form) {
  const found = new Set<string>();
  for (const field of form.fields) {
    for (const [name, re] of RIDE_FIELDS) {
      if (re.test(field.words)) found.add(name);
      if (name === "date" && field.type === "date") found.add("date");
      if (name === "time" && field.type === "time") found.add("time");
      if (name === "date" && field.type === "datetime-local")
        found.add("date").add("time");
    }
  }
  return [...found];
}

const isRideForm = (fields: string[]) =>
  (fields.includes("pickup") &&
    (fields.includes("drop-off") || fields.includes("date"))) ||
  fields.length >= 3;

const PRICE_WORDS =
  /instant (quote|price|pricing)|get (a|your) (price|quote) (instantly|now|online)|see your (price|fare)|fare (estimate|calculator)|calculate (your )?(fare|price|quote)|price (estimate|calculator)/i;

export function bookingCheck(input: {
  site?: SiteRead;
  home?: Speed;
  bookingPage?: Speed;
  screen?: FirstScreen;
}): CheckResult {
  const { site } = input;
  if (!site)
    return noWebsite(
      "booking",
      "There's no website, so riders can't book you online.",
      "Riders who don't want to call need a way to book online: pickup, drop-off, date, time and vehicle, with the price shown before they confirm.",
    );

  const pages: Page[] = [site.home, ...site.pages];
  const bookingUrls = new Set(
    site.bookingLinks
      .filter((b) => b.internal)
      .map((b) => b.href.replace(/\/$/, "")),
  );
  const isBookingPage = (p: Page) =>
    bookingUrls.has(p.url.replace(/\/$/, "")) ||
    /book|reserv|quote/i.test(p.url);

  // 1. A booking system: linked, embedded, or loaded by a script.
  let system = site.bookingSystem;
  if (!system) {
    for (const speed of [input.bookingPage, input.home]) {
      if (!speed?.ok) continue;
      const hit = speed.requests.find((r) => bookingSystemOf(r.url));
      if (hit) {
        system = { name: bookingSystemOf(hit.url)!, href: undefined };
        break;
      }
    }
  }

  // 2. A form that asks for the ride: booking pages first.
  const ordered = [
    ...pages.filter(isBookingPage),
    ...pages.filter((p) => !isBookingPage(p)),
  ];
  let rideForm: { page: Page; fields: string[] } | undefined;
  let quoteForm: Page | undefined;
  for (const page of ordered) {
    for (const form of page.forms) {
      const fields = rideFields(form);
      if (isRideForm(fields)) {
        rideForm ??= { page, fields };
      } else if (
        !quoteForm &&
        isBookingPage(page) &&
        form.fields.some((f) => CONTACT_FIELDS.test(f.words))
      ) {
        quoteForm = page;
      }
    }
  }
  // A form on a form builder's site, linked from a Book or Quote link.
  const elsewhere = site.bookingLinks.find(
    (b) => !b.internal && isFormHost(b.href),
  );

  const proof: Proof[] = [];
  if (system?.href)
    proof.push({
      label: system.href.replace(/^https?:\/\//, ""),
      href: system.href,
    });
  if (rideForm)
    proof.push({
      label: rideForm.page.url.replace(/^https?:\/\//, ""),
      href: rideForm.page.url,
    });
  else if (quoteForm)
    proof.push({
      label: quoteForm.url.replace(/^https?:\/\//, ""),
      href: quoteForm.url,
    });
  else if (elsewhere)
    proof.push({
      label: elsewhere.href.replace(/^https?:\/\//, ""),
      href: elsewhere.href,
    });

  const books = Boolean(system || rideForm);
  const asks = Boolean(quoteForm || elsewhere);
  const bookFix =
    "Add online booking riders can finish without calling: pickup, drop-off, date, time and vehicle, with the price shown before they confirm.";

  const parts = [
    part({
      id: "book",
      label: "Booking online",
      max: 60,
      primary: true,
      state: books ? "good" : asks ? "partial" : "missing",
      points: 25,
      found: system
        ? `Riders can book online through ${system.name}.`
        : rideForm
          ? `Riders can book online: your booking form asks for the ${list(rideForm.fields)}.`
          : asks
            ? "Riders can send a quote request, but they can't book a ride online."
            : "We didn't find a way to book online, so riders have to call or email.",
      proof,
      fix: bookFix,
    }),
  ];

  // 3. A number to tap.
  const tels = site.home.tels;
  const shown = site.home.phones;
  parts.push(
    part({
      id: "tel",
      label: "A number to tap on a phone",
      max: 15,
      state: tels.length ? "good" : shown.length ? "partial" : "missing",
      points: 8,
      found: tels.length
        ? "Your phone number is a tap-to-call link."
        : shown.length
          ? "Your number is on the homepage, but tapping it on a phone doesn't call."
          : "We didn't find a phone number on your homepage.",
      fix: "Make your phone number a tap-to-call link at the top of every page.",
    }),
  );

  // 4. The first screen on a phone.
  const screen = input.screen;
  parts.push(
    part({
      id: "screen",
      label: "Book or call from the first screen",
      max: 25,
      state: !screen
        ? "unknown"
        : screen.book && screen.phone
          ? "good"
          : screen.book || screen.phone
            ? "partial"
            : "missing",
      points: 15,
      found: !screen
        ? "We couldn't look at your first screen on a phone."
        : screen.book && screen.phone
          ? "On a phone, riders see a way to book and a way to call before they scroll."
          : screen.book
            ? "On a phone, riders see a way to book on the first screen, but not your number."
            : screen.phone
              ? "On a phone, riders see your number on the first screen, but no way to book."
              : "On a phone, the first screen has no way to book or call.",
      fix: 'Put a "Book now" button and your number on the first screen on phones, above the photos.',
    }),
  );

  const notes: string[] = [];
  const priceText = pages
    .filter(isBookingPage)
    .some((p) => PRICE_WORDS.test(p.text));
  if (books && priceText)
    notes.push("Your booking page offers riders a price online.");
  if (screen?.seen)
    notes.push(`First thing a rider sees on a phone: ${screen.seen}`);

  return result("booking", parts, { found: parts[0].found, notes });
}
