// What the tool works out about each lead: how far it is, why it's worth
// a look, the order to show them in, the brief, and the scripts. Pure
// functions, safe in server and client components.
//
// The brief is written from the notes in catalog.ts plus what we read on
// the business's website (research.ts). Saving a lead has the AI write
// the scripts for that client (scripts.ts); writeScripts here is what it
// falls back to.

import { CATEGORIES, EVENT_TYPES, FOLLOW_UP_DAYS, SOURCES } from "./catalog";
import { scoreOf } from "./score";
import type {
  EventLead,
  LeadsSettings,
  Located,
  SavedLead,
  Script,
  Target,
} from "./types";
import {
  dayKey,
  daysBetween,
  fmtAgo,
  fmtShort,
  fmtWeekday,
} from "@/lib/dashboard/format";

const DAY = 86_400_000;

/** Miles as the crow flies, rounded. */
export function milesBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.max(1, Math.round(3958.8 * 2 * Math.asin(Math.sqrt(h))));
}

export function locate<T extends Target>(
  items: T[],
  base: { lat: number; lng: number },
): Located<T>[] {
  return items.map((item) => ({ ...item, miles: milesBetween(base, item) }));
}

/** Calendar days from now until an event, in Arizona. */
export const daysUntil = (date: string, now: string) => daysBetween(now, date);

export const when = (date: string, now: string) => {
  const days = daysUntil(date, now);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
};

/** Is it close enough that the organizer is booking now? */
export const thisWeek = (event: EventLead, now: string) =>
  daysUntil(event.date, now) <= 14;

/** Does this lead fit what the client asked for, within their radius? */
export function fits(target: Located, settings: LeadsSettings) {
  if (target.miles > settings.radius) return false;
  return target.kind === "ACCOUNT"
    ? settings.categories.includes(target.category)
    : settings.eventTypes.includes(target.type);
}

/* ── Why it's worth a look ── */

export type Reason = {
  text: string;
  tone: "lime" | "yellow" | "white" | "gray";
};

const count = (n: number) => n.toLocaleString("en-US");

export function reasonsFor(target: Located, now: string): Reason[] {
  const reasons: Reason[] = [];
  if (target.kind === "ACCOUNT") {
    if (target.news) {
      reasons.push({ text: "In the news", tone: "yellow" });
    }
    if (target.carService === "NONE") {
      reasons.push({ text: "No car service yet", tone: "lime" });
    } else if (target.carService === "HAS") {
      reasons.push({ text: "Has a car service", tone: "gray" });
    }
    if (target.reviews && target.reviews >= 500) {
      reasons.push({ text: `${count(target.reviews)} reviews`, tone: "white" });
    }
  } else {
    const days = daysUntil(target.date, now);
    reasons.push({
      text: when(target.date, now),
      tone: days <= 14 ? "yellow" : "white",
    });
    if (target.guests) {
      reasons.push({
        text: `${count(target.guests)} ${target.type === "WEDDING_SHOW" ? "couples" : "guests"}`,
        tone: "white",
      });
    }
  }
  reasons.push({ text: `${target.miles} mi away`, tone: "white" });
  if (target.contact?.verified || (!target.contact && target.contactReady)) {
    reasons.push({ text: "Contact ready", tone: "lime" });
  }
  return reasons;
}

/* ── The order to show them in ── */

/**
 * Higher first: the lead score (score.ts), out of 100. Pass newSince where
 * the score is on show, so the order matches the numbers.
 */
export const rank = (target: Located, now: string, newSince?: string) =>
  scoreOf(target, now, newSince).score;

/* ── The brief ── */

export type BriefLine = { label: string; text: string };

export function briefFor(target: Target, now: string): BriefLine[] {
  if (target.kind === "ACCOUNT") {
    const angle = CATEGORIES[target.category];
    const service =
      target.carService === "NONE"
        ? `${target.carServiceNote ? `${target.carServiceNote}. ` : ""}Nothing on their website about a car service partner, so you'd be the first.`
        : target.carService === "HAS"
          ? `${target.carServiceNote}. Pitch yourself as the backup for busy weekends and the trips they can't cover.`
          : target.website
            ? "Their website doesn't say. Ask who they call today, and offer to be the backup."
            : "We couldn't check: they don't list a website. Ask who they call today.";
    return [
      {
        label: "Why they need you",
        text: `${angle.why}${target.note ? ` ${target.note}` : ""}`,
      },
      ...(target.news
        ? [
            {
              label: "In the news",
              text: `${target.news.title}. A new opening or a move is the best time to introduce yourself.`,
            },
          ]
        : []),
      { label: "Who they use now", text: service },
      { label: "Busy season", text: angle.season },
      {
        label: "Who to ask for",
        text: target.contact
          ? `${target.contact.name}, ${target.contact.title}. If they're out, ask for ${angle.who}.`
          : `Ask for ${angle.who}${target.phone ? `. Their main line is ${target.phone}` : ""}.`,
      },
      { label: "The angle", text: `Lead with ${angle.offer}.` },
    ];
  }

  const angle = EVENT_TYPES[target.type];
  const organizer = target.organizer || "the organizer";
  const days = daysUntil(target.date, now);
  const timing =
    days <= 7
      ? "It's close. Most transportation is booked by now, so call instead of emailing and offer to cover whatever's still open."
      : days <= 21
        ? "Organizers are locking in their vendors now. Reach out this week."
        : days <= 60
          ? "The right time: far enough out that transportation usually isn't booked yet."
          : "Early. Introduce yourself now, then follow up about a month before.";
  return [
    {
      label: "Why they need you",
      text: `${angle.why}${target.note ? ` ${target.note}` : ""}`,
    },
    { label: "Timing", text: timing },
    {
      label: "Who to ask for",
      text: target.contact
        ? `${target.contact.name}, ${target.contact.title}${target.organizer ? ` at ${target.organizer}` : ""}.`
        : `Ask ${organizer} for ${angle.who}${target.phone ? ` at ${target.phone}` : ""}.`,
    },
    { label: "The angle", text: `Lead with ${angle.offer}.` },
    {
      label: "Where we found it",
      text: `${SOURCES[target.source].label}: ${SOURCES[target.source].text}`,
    },
  ];
}

/* ── The scripts ── */

const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The event's dates, e.g. "Oct 17" or "Oct 31 – Nov 2". */
export const eventDates = (event: EventLead) =>
  event.endDate && fmtShort(event.endDate) !== fmtShort(event.date)
    ? `${fmtShort(event.date)} – ${fmtShort(event.endDate)}`
    : fmtShort(event.date);

/** Email, text and a call opener, written for this lead and this operator. */
export function writeScripts(target: Target, settings: LeadsSettings): Script {
  const op = settings.operator;
  const me = op.name.split(" ")[0];
  const first = target.contact?.name.split(" ")[0];
  const hi = first ? `Hi ${first},` : "Hi there,";
  const where = settings.base.city;
  const sign = [
    me,
    [op.company, op.phone, op.website].filter(Boolean).join(" · "),
  ].join("\n");

  if (target.kind === "ACCOUNT") {
    const angle = CATEGORIES[target.category];
    const backup =
      target.carService === "HAS"
        ? " I know you already have someone for short trips; we'd love to be the call when they're booked or the trip is longer."
        : "";
    return {
      email: {
        subject: angle.subject,
        body: `${hi}

I run ${op.company}, a black car service in ${where}. ${sentence(angle.hook)}.${backup}

For ${target.name}, I'd like to offer ${angle.offer}. We run ${op.fleet}, and we're at our best with ${op.strength}.

Would you have 10 minutes this week? Or I can just send over our rates.

${sign}`,
      },
      text: `${first ? `Hi ${first}` : "Hi"}, it's ${me} from ${op.company}. We drive for ${angle.audience} around ${where}, mostly ${op.strength}. Could I send you our rates for ${target.name}?`,
      call: `"Hi${first ? `, is this ${first}` : ""}? This is ${me} with ${op.company}, a black car service in ${where}. I'll be quick: ${angle.hook}. Who takes care of that for ${target.name} today?"

If they already have someone: "That makes sense. Could we be your backup for busy weekends? I'll send our rates so you have them."

If they're interested: "Great. What's the best email for our rates? And is there a day this week I could drop by?"`,
    };
  }

  const angle = EVENT_TYPES[target.type];
  const day = fmtWeekday(target.date);
  const at = target.venue ? ` at ${target.venue}` : "";
  return {
    email: {
      subject: angle.subject.replace("{event}", target.name),
      body: `${hi}

I saw ${target.name} is coming up on ${day}${at}. ${sentence(angle.hook)}.

I run ${op.company}, a black car service in ${where}, and I'd like to offer ${angle.offer}. We run ${op.fleet}, and we're at our best with ${op.strength}.

Do you have transportation sorted yet? If not, I can put together a quote this week.

${sign}`,
    },
    text: `${first ? `Hi ${first}` : "Hi"}, it's ${me} from ${op.company}. I saw ${target.name} is on ${day}. We can handle ${angle.offer.split(":")[0]}. Want me to send a quote?`,
    call: `"Hi${first ? ` ${first}` : ""}, this is ${me} with ${op.company}, a black car service in ${where}. I'm calling about ${target.name} on ${day}. ${sentence(angle.hook)}. Have you sorted out transportation yet?"

If it's handled: "Great to hear. Can I send our rates in case anything changes? Something always comes up the week of."

If it's open: "I can have a quote to you today. How many guests are you expecting to move?"`,
  };
}

/** When to follow up after reaching out a certain way. */
export function followUpAfter(how: keyof typeof FOLLOW_UP_DAYS, from: string) {
  return new Date(
    new Date(from).getTime() + FOLLOW_UP_DAYS[how] * DAY,
  ).toISOString();
}

/* ── Today ── */

export type Move<T extends Target = Target> = {
  lead: SavedLead;
  target: T;
  verb: "Reach out" | "Follow up" | "Call today";
  detail: string;
  overdue: boolean;
};

const OUTREACH = new Set(["EMAIL", "TEXT", "CALL", "MET"]);

/**
 * What to do today: saved leads nobody has contacted yet, and follow-ups
 * that are due. Overdue ones first, then events that are close.
 */
export function todaysMoves<T extends Target>(
  saved: SavedLead[],
  find: (id: string) => T | undefined,
  now: string,
): Move<T>[] {
  const today = dayKey(now);
  const moves: Move<T>[] = [];
  for (const lead of saved) {
    if (lead.stage === "WON" || lead.stage === "NOT_NOW") continue;
    const target = find(lead.targetId);
    if (!target) continue;
    const last = lead.activity.find((a) => OUTREACH.has(a.kind));
    const dueOn = lead.remindAt ? dayKey(lead.remindAt) : undefined;
    const due = dueOn !== undefined && dueOn <= today;
    if (!due && (last || lead.stage !== "NEW")) continue;
    const soon = target.kind === "EVENT" && daysUntil(target.date, now) <= 7;
    moves.push({
      lead,
      target,
      verb: last ? "Follow up" : soon ? "Call today" : "Reach out",
      detail: last
        ? `${last.text.split(":")[0]} · ${fmtAgo(last.at, now)}`
        : `Saved · ${fmtAgo(lead.savedAt, now)}`,
      overdue: dueOn !== undefined && dueOn < today,
    });
  }
  const order = (m: Move<T>) =>
    m.overdue
      ? 0
      : m.verb === "Call today"
        ? 1
        : m.verb === "Follow up"
          ? 2
          : 3;
  return moves.sort(
    (a, b) =>
      order(a) - order(b) ||
      (a.lead.remindAt ?? a.lead.savedAt).localeCompare(
        b.lead.remindAt ?? b.lead.savedAt,
      ),
  );
}

/** What won leads bring in: monthly, and one-time trips. */
export function wonValue(saved: SavedLead[]) {
  const won = saved.filter((lead) => lead.stage === "WON" && lead.value);
  return {
    count: won.length,
    monthly: won
      .filter((lead) => lead.per === "MONTH")
      .reduce((sum, lead) => sum + (lead.value ?? 0), 0),
    once: won
      .filter((lead) => lead.per === "ONCE")
      .reduce((sum, lead) => sum + (lead.value ?? 0), 0),
  };
}
