// How billing works, in one place:
//
// - Website plans: the setup fee is charged when the client pays it. The
//   monthly fee is charged on the 1st of every month, starting the 1st
//   after the setup fee. The days in between are free.
// - Leads Tool: a 30-day free trial with no card. If they keep it, the
//   first charge covers the rest of the month the trial ends in (prorated),
//   then the full price on the 1st of every month.
//
// "The 1st" is midnight Arizona time (UTC-7 all year). Pure functions, safe
// to use anywhere: Stripe billing and the admin's forecasts build on them.

const DAY = 86_400_000;
const AZ = 7 * 3_600_000;

/** Midnight Arizona time on the 1st of a month, `offset` months away. */
export function firstOfMonth(date: string | Date, offset = 0) {
  const local = new Date(new Date(date).getTime() - AZ);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + offset, 1) + AZ,
  ).toISOString();
}

/** The last day of the month that `first` starts. */
export const lastDayOf = (first: string) =>
  new Date(new Date(firstOfMonth(first, 1)).getTime() - DAY).toISOString();

/** The next 1st after `now`. */
export const nextFirst = (now: string | Date) => firstOfMonth(now, 1);

/**
 * The prorated charge for the rest of a month, from `from` (a trial's end,
 * say) to the next 1st. Worked out to the second, the way Stripe does it,
 * so what we quote is what the card is charged.
 */
export function prorate(monthly: number, from: string) {
  const start = new Date(from).getTime();
  const begin = new Date(firstOfMonth(from)).getTime();
  const end = new Date(firstOfMonth(from, 1)).getTime();
  return Math.round((monthly * 100 * (end - start)) / (end - begin)) / 100;
}

/**
 * The old site started subscriptions at midnight UTC on the 1st, which is
 * 5pm the day before in Arizona. Those dates are shown and stored as the
 * 1st at midnight Arizona time, like everything billed since.
 */
export function asBillingDay(date: Date) {
  return date.getUTCDate() === 1 && date.getUTCHours() < 7
    ? new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 7))
    : date;
}
