// Dates and money, the same on the server and in the browser: every date
// is shown in Arizona time, so a page never renders two different days.

const TZ = "America/Phoenix";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: TZ,
});
const shortFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: TZ,
});
const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: TZ,
});
const monthFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: TZ,
});
const monthLongFmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: TZ,
});
const dayFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: TZ,
});
const hourFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: TZ,
});
const keyFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });

type DateLike = string | Date;
const toDate = (value: DateLike) =>
  typeof value === "string" ? new Date(value) : value;

/** "Oct 8, 2026" */
export const fmtDate = (value: DateLike) => dateFmt.format(toDate(value));
/** "Oct 8" */
export const fmtShort = (value: DateLike) => shortFmt.format(toDate(value));
/** "9:41 AM" (with a plain space, the same in every browser) */
export const fmtTime = (value: DateLike) =>
  timeFmt.format(toDate(value)).replace(/\s/g, " ");
/** "Oct" */
export const fmtMonth = (value: DateLike) => monthFmt.format(toDate(value));
/** "October 2026" */
export const fmtMonthLong = (value: DateLike) =>
  monthLongFmt.format(toDate(value));
/** "Thursday, October 8" */
export const fmtDay = (value: DateLike) => dayFmt.format(toDate(value));

/** The calendar day in Arizona, e.g. "2026-10-08". */
export const dayKey = (value: DateLike) => keyFmt.format(toDate(value));

/** Whole calendar days from one date to another, in Arizona. */
export function daysBetween(from: DateLike, to: DateLike) {
  const a = new Date(dayKey(from)).getTime();
  const b = new Date(dayKey(to)).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** "Just now", "3 hours ago", "Yesterday", "4 days ago", "Sep 12" */
export function fmtAgo(value: DateLike, now: DateLike) {
  const then = toDate(value);
  const minutes = Math.round((toDate(now).getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const days = daysBetween(then, now);
  if (days === 0) {
    const hours = Math.round(minutes / 60);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return fmtShort(then);
}

/** "Good morning", from the hour in Arizona. */
export function greeting(now: DateLike) {
  const hour = Number(hourFmt.format(toDate(now)));
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** "$499", "$1,250", or "$8.30" when there are cents. */
export const money = (amount: number) =>
  `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

/** "Dana's", or "Red Rock Rides'" for a name ending in s. */
export const possessive = (name: string) =>
  /s$/i.test(name) ? `${name}’` : `${name}’s`;

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
