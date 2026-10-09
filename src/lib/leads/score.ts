// The lead score: 0 to 100, from things we know about each lead, with the
// points for each one so it's never a mystery. The same every time for the
// same lead (no AI), so lists sort the same way each morning. Pure
// functions, safe in server and client components.

import { daysBetween } from "@/lib/dashboard/format";
import type { Account, EventLead, Located } from "./types";

export type ScoreFactor = {
  label: string;
  points: number;
  max: number;
  /** Why it got those points, in a sentence. */
  note: string;
};

export type Score = { score: number; factors: ScoreFactor[] };

const count = (n: number) => n.toLocaleString("en-US");
const clamp = (n: number, max: number) =>
  Math.max(0, Math.min(max, Math.round(n)));

/* ── Accounts ── */

const ACCOUNT_RIDES: Record<Account["category"], [number, string]> = {
  HOTEL: [15, "Hotels book airport runs and guest rides every day."],
  CORPORATE: [15, "Offices book executives and visitors all year."],
  VENUE: [13, "Venues send couples and their guests to someone every weekend."],
  CASINO: [11, "Casinos move high rollers and their guests."],
  LAW: [10, "Firms book rides for clients, witnesses and partners."],
  GOLF: [10, "Clubs move members, guests and tournament players."],
  FUNERAL: [9, "Funeral homes need family cars for services."],
  SENIOR: [8, "Residents need rides to appointments and outings."],
  TOURS: [8, "Tour companies need extra vehicles in season."],
};

function accountScore(a: Located<Account>, newSince?: string): ScoreFactor[] {
  const service: ScoreFactor =
    a.carService === "NONE"
      ? {
          label: "Car service",
          points: 30,
          max: 30,
          note: "Nothing on their website about a car service: you'd be the first.",
        }
      : a.carService === "HAS"
        ? {
            label: "Car service",
            points: 6,
            max: 30,
            note: "They mention one already: pitch being the backup.",
          }
        : {
            label: "Car service",
            points: 15,
            max: 30,
            note: a.website
              ? "Their website doesn't say who they use."
              : "No website to check who they use.",
          };

  const reviews = a.reviews ?? 0;
  const size: ScoreFactor = {
    label: "Size",
    points: clamp(Math.log10(reviews + 1) * 4.2, 15),
    max: 15,
    note: reviews
      ? `${count(reviews)} Google reviews${reviews >= 1000 ? ": a busy place." : "."}`
      : "No Google reviews yet.",
  };

  const r = a.rating;
  const rating: ScoreFactor = {
    label: "Rating",
    points: !r
      ? 3
      : r >= 4.7
        ? 10
        : r >= 4.5
          ? 8
          : r >= 4.2
            ? 6
            : r >= 4
              ? 4
              : 2,
    max: 10,
    note: r ? `${r.toFixed(1)} stars on Google.` : "Not rated on Google yet.",
  };

  const [ridePoints, rideNote] = ACCOUNT_RIDES[a.category];
  const rides: ScoreFactor = {
    label: "Books rides",
    points: ridePoints,
    max: 15,
    note: rideNote,
  };

  const distance: ScoreFactor = {
    label: "Distance",
    points: a.miles <= 5 ? 15 : clamp(15 - (a.miles - 5) * 0.3, 15),
    max: 15,
    note: `${a.miles} ${a.miles === 1 ? "mile" : "miles"} from your base.`,
  };

  const reach: ScoreFactor = a.contact?.email
    ? {
        label: "Easy to reach",
        points: a.contact.verified ? 10 : 8,
        max: 10,
        note: `We found ${a.contact.name}${a.contact.verified ? ", with a verified email." : "."}`,
      }
    : a.contact
      ? {
          label: "Easy to reach",
          points: 7,
          max: 10,
          note: `We found ${a.contact.name}. No email yet.`,
        }
      : a.contactReady
        ? {
            label: "Easy to reach",
            points: 8,
            max: 10,
            note: "The decision-maker's email is ready when you save it.",
          }
        : a.phone
          ? {
              label: "Easy to reach",
              points: 5,
              max: 10,
              note: "Their main line is listed.",
            }
          : {
              label: "Easy to reach",
              points: a.website ? 3 : 0,
              max: 10,
              note: a.website
                ? "Only a website to start from."
                : "No phone or website listed.",
            };

  const momentum: ScoreFactor = a.news
    ? {
        label: "Timing",
        points: 5,
        max: 5,
        note: "In the news: an opening or a move is the best time to say hello.",
      }
    : newSince && a.foundAt > newSince
      ? { label: "Timing", points: 3, max: 5, note: "New this morning." }
      : { label: "Timing", points: 0, max: 5, note: "Nothing new lately." };

  return [service, size, rating, rides, distance, reach, momentum];
}

/* ── Events ── */

const EVENT_KIND: Record<EventLead["type"], [number, string]> = {
  GALA: [25, "Galas book cars for honorees, sponsors and safe rides home."],
  WEDDING_SHOW: [23, "A room full of couples planning their wedding day."],
  CONFERENCE: [22, "Speakers and guests fly in and need rides all week."],
  AUCTION: [21, "Collectors and bidders who travel in style."],
  BUSINESS: [20, "Executives and honorees who expect a proper arrival."],
  TOURNAMENT: [
    20,
    "Players, sponsors and VIPs to move between hotels and the course.",
  ],
  GRADUATION: [16, "Families celebrating, often with out-of-town guests."],
  FESTIVAL: [12, "Big crowds, though most guests drive themselves."],
  CONCERT: [9, "Mostly fans getting their own rides; some VIP packages."],
};

export type Timing = {
  days: number;
  /** "Very late", "Good time", … */
  label: string;
  tone: "red" | "yellow" | "lime" | "mint" | "gray";
  /** Under a week away: call, don't email. */
  urgent: boolean;
  note: string;
  points: number;
};

/** How close an event is, and what that means for reaching out. */
export function timingOf(date: string, now: string): Timing {
  const days = daysBetween(now, date);
  if (days <= 0)
    return {
      days,
      label: "Today",
      tone: "red",
      urgent: true,
      note: "It's today: too late to plan for.",
      points: 2,
    };
  if (days < 7)
    return {
      days,
      label: "Very late",
      tone: "red",
      urgent: true,
      note: "Very late: most rides are booked by now.",
      points: 10,
    };
  if (days < 14)
    return {
      days,
      label: "Late",
      tone: "yellow",
      urgent: false,
      note: "Late: they're finalizing transport now.",
      points: 17,
    };
  if (days <= 60)
    return {
      days,
      label: "Good time",
      tone: "lime",
      urgent: false,
      note: "A good time to reach out: plans are being made.",
      points: 25,
    };
  if (days <= 120)
    return {
      days,
      label: "Early",
      tone: "mint",
      urgent: false,
      note: "Early: get on their list before anyone else.",
      points: 18,
    };
  return {
    days,
    label: "Far off",
    tone: "gray",
    urgent: false,
    note: "Months away: worth a first hello.",
    points: 10,
  };
}

function eventScore(e: Located<EventLead>, now: string): ScoreFactor[] {
  const [kindPoints, kindNote] = EVENT_KIND[e.type];
  const kind: ScoreFactor = {
    label: "Kind of event",
    points: kindPoints,
    max: 25,
    note: kindNote,
  };

  const t = timingOf(e.date, now);
  const timing: ScoreFactor = {
    label: "Timing",
    points: t.points,
    max: 25,
    note: t.note,
  };

  const size: ScoreFactor = e.guests
    ? {
        label: "Size",
        points: clamp(Math.log10(e.guests) * 5, 15),
        max: 15,
        note: `About ${count(e.guests)} ${e.type === "WEDDING_SHOW" ? "couples" : "guests"}.`,
      }
    : e.venueReviews
      ? {
          label: "Size",
          points: clamp(Math.log10(e.venueReviews + 1) * 3, 10),
          max: 15,
          note: `Not listed. The venue has ${count(e.venueReviews)} Google reviews.`,
        }
      : { label: "Size", points: 5, max: 15, note: "Not listed." };

  const top = e.priceMax;
  const tickets: ScoreFactor = {
    label: "Tickets",
    points:
      top === undefined
        ? 4
        : top >= 25_000
          ? 10
          : top >= 10_000
            ? 8
            : top >= 5_000
              ? 6
              : top > 0
                ? 4
                : 2,
    max: 10,
    note:
      top === undefined
        ? "No prices listed."
        : top === 0
          ? "Free to attend."
          : top >= 25_000
            ? `${e.price}: a crowd that books cars.`
            : `${e.price}.`,
  };

  const reach: ScoreFactor = e.contact?.email
    ? {
        label: "Easy to reach",
        points: e.contact.verified ? 15 : 12,
        max: 15,
        note: `We found ${e.contact.name}${e.contact.verified ? ", with a verified email." : "."}`,
      }
    : e.contact
      ? {
          label: "Easy to reach",
          points: 10,
          max: 15,
          note: `We found ${e.contact.name}. No email yet.`,
        }
      : e.contactReady
        ? {
            label: "Easy to reach",
            points: 12,
            max: 15,
            note: "The organizer's email is ready when you save it.",
          }
        : e.organizer && e.website
          ? {
              label: "Easy to reach",
              points: 9,
              max: 15,
              note: `${e.organizer} is listed, with the event's page.`,
            }
          : e.organizer
            ? {
                label: "Easy to reach",
                points: 7,
                max: 15,
                note: `${e.organizer} is listed.`,
              }
            : e.phone || e.venuePhone
              ? {
                  label: "Easy to reach",
                  points: 5,
                  max: 15,
                  note: "No organizer listed: the venue's line is.",
                }
              : {
                  label: "Easy to reach",
                  points: 2,
                  max: 15,
                  note: "No organizer listed.",
                };

  const distance: ScoreFactor = {
    label: "Distance",
    points: e.miles <= 5 ? 10 : clamp(10 - (e.miles - 5) * 0.2, 10),
    max: 10,
    note: `${e.miles} ${e.miles === 1 ? "mile" : "miles"} from your base.`,
  };

  return [kind, timing, size, tickets, reach, distance];
}

/** A lead's score, out of 100, and what it's made of. */
export function scoreOf(
  target: Located,
  now: string,
  newSince?: string,
): Score {
  const factors =
    target.kind === "ACCOUNT"
      ? accountScore(target as Located<Account>, newSince)
      : eventScore(target as Located<EventLead>, now);
  const score = Math.max(
    0,
    Math.min(
      100,
      factors.reduce((sum, f) => sum + f.points, 0),
    ),
  );
  return { score, factors };
}

/** How a score reads at a glance. */
export const scoreTone = (score: number) =>
  score >= 75 ? "lime" : score >= 55 ? "yellow" : "gray";
