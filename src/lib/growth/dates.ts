// Calendar days as "YYYY-MM-DD" strings: adding, comparing, weeks and
// months, and how they read. No time zones once a day is a day, so the
// server and the browser always agree. Pure functions, safe anywhere.

const DAY = 86_400_000;

const ms = (day: string) =>
  Date.UTC(
    Number(day.slice(0, 4)),
    Number(day.slice(5, 7)) - 1,
    Number(day.slice(8, 10)),
  );
const fromMs = (value: number) => new Date(value).toISOString().slice(0, 10);

/** True for a real "YYYY-MM-DD". */
export const isDay = (value: unknown): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  fromMs(ms(value)) === value;

export const addDays = (day: string, n: number) => fromMs(ms(day) + n * DAY);

/** Days from `from` to `to`: 0 for the same day. */
export const daysFrom = (from: string, to: string) =>
  Math.round((ms(to) - ms(from)) / DAY);

export const minDay = (a: string, b: string) => (a < b ? a : b);
export const maxDay = (a: string, b: string) => (a > b ? a : b);

/** Every day from `from` to `to`, both included. */
export function eachDay(from: string, to: string) {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** "2026-10". */
export const monthOf = (day: string) => day.slice(0, 7);
/** The 1st of the month a day is in. */
export const startOfMonth = (day: string) => `${day.slice(0, 7)}-01`;

export function daysInMonth(day: string) {
  return new Date(
    Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)), 0),
  ).getUTCDate();
}

export const endOfMonth = (day: string) =>
  `${day.slice(0, 7)}-${String(daysInMonth(day)).padStart(2, "0")}`;

/** The 1st of the month `n` months from the one `day` is in. */
export function addMonths(day: string, n: number) {
  const d = new Date(
    Date.UTC(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1 + n, 1),
  );
  return fromMs(d.getTime());
}

/** 0 for Sunday … 6 for Saturday. */
export const weekday = (day: string) => new Date(ms(day)).getUTCDay();

/** The Monday a week starts on. */
export const mondayOf = (day: string) =>
  addDays(day, -((weekday(day) + 6) % 7));

/** Today in a time zone, e.g. Search Console's (Pacific). */
export function todayIn(timeZone: string, now: Date | string = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(
    typeof now === "string" ? new Date(now) : now,
  );
}

/** Today in Arizona, the day everything on the dashboard goes by. */
export const todayAz = (now?: Date | string) => todayIn("America/Phoenix", now);

/** Search Console's days are Pacific time. */
export const todayPacific = (now?: Date | string) =>
  todayIn("America/Los_Angeles", now);

const format = (options: Intl.DateTimeFormatOptions) => {
  const f = new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" });
  return (day: string) => f.format(new Date(ms(day)));
};

/** "Oct 6" */
export const fmtDayShort = format({ month: "short", day: "numeric" });
/** "Oct 6, 2026" */
export const fmtDayLong = format({
  month: "short",
  day: "numeric",
  year: "numeric",
});
/** "Oct" */
export const fmtMonthShort = format({ month: "short" });
/** "October" */
export const fmtMonthName = format({ month: "long" });
/** "October 2026" */
export const fmtMonthYear = format({ month: "long", year: "numeric" });
/** "Oct 2026" */
export const fmtMonthYearShort = format({ month: "short", year: "numeric" });
/** "Tue" */
export const fmtWeekdayShort = format({ weekday: "short" });

/** "Oct 6 – 12", "Sep 29 – Oct 5", "Dec 28, 2026 – Jan 3, 2027". */
export function fmtSpan(from: string, to: string) {
  if (from === to) return fmtDayLong(from);
  if (from.slice(0, 4) !== to.slice(0, 4))
    return `${fmtDayLong(from)} – ${fmtDayLong(to)}`;
  if (from.slice(0, 7) === to.slice(0, 7))
    return `${fmtDayShort(from)} – ${Number(to.slice(8, 10))}, ${to.slice(0, 4)}`;
  return `${fmtDayShort(from)} – ${fmtDayShort(to)}, ${to.slice(0, 4)}`;
}
