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
// to use anywhere; the sample data and the admin both build on them.

import type { Invoice } from "./types";

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

/** Days in the month that `date` falls in, and the day of the month. */
function monthDays(date: string) {
  const local = new Date(new Date(date).getTime() - AZ);
  const days = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return { days, day: local.getUTCDate() };
}

const monthName = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "America/Phoenix",
  }).format(new Date(date));

const shortDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Phoenix",
  }).format(new Date(date));

/** The prorated charge for the rest of a month, from `from` to its end. */
export function prorate(monthly: number, from: string) {
  const { days, day } = monthDays(from);
  return Math.round(((monthly * (days - day + 1)) / days) * 100) / 100;
}

type Numbering = { prefix?: string; start: number };

/**
 * A website plan's invoices: the setup fee, then one on each 1st from the
 * 1st after the setup fee up to now. Newest first.
 */
export function websiteInvoices(options: {
  plan: string;
  setupFee: number;
  setupPaidAt: string;
  monthly: number;
  method: string;
  now: Date;
  numbering: Numbering;
  /** The latest monthly charge failed and is still due. */
  lastFailed?: boolean;
}) {
  const { plan, setupFee, setupPaidAt, monthly, method, now, numbering } =
    options;
  const prefix = numbering.prefix ?? "FNF-";
  let number = numbering.start;
  const invoices: Invoice[] = [
    {
      id: "inv-setup",
      number: `${prefix}${number++}`,
      date: setupPaidAt,
      description: `${plan} setup`,
      amount: setupFee,
      status: "PAID",
      paidAt: setupPaidAt,
      method,
    },
  ];

  let first = firstOfMonth(setupPaidAt, 1);
  while (new Date(first) <= now) {
    invoices.push({
      id: `inv-${first.slice(0, 7)}`,
      number: `${prefix}${number++}`,
      date: first,
      description: `${plan}, ${monthName(first)}`,
      period: { from: first, to: lastDayOf(first) },
      amount: monthly,
      status: "PAID",
      paidAt: first,
      method,
    });
    first = firstOfMonth(first, 1);
  }

  if (options.lastFailed && invoices.length > 1) {
    const last = invoices[invoices.length - 1];
    last.status = "DUE";
    delete last.paidAt;
  }

  return { invoices: invoices.reverse(), nextBillingAt: first };
}

/**
 * A paid Leads Tool's invoices: the prorated rest of the month its trial
 * ended in, then one on each 1st up to now. Newest first.
 */
export function leadsInvoices(options: {
  monthly: number;
  trialEndsAt: string;
  method: string;
  now: Date;
  numbering: Numbering;
}) {
  const { monthly, trialEndsAt, method, now, numbering } = options;
  const prefix = numbering.prefix ?? "FNF-";
  let number = numbering.start;
  const invoices: Invoice[] = [];

  if (new Date(trialEndsAt) <= now) {
    const end = lastDayOf(firstOfMonth(trialEndsAt));
    invoices.push({
      id: "inv-leads-first",
      number: `${prefix}${number++}`,
      date: trialEndsAt,
      description: `Leads Tool, ${shortDate(trialEndsAt)} – ${shortDate(end)} (prorated)`,
      period: { from: trialEndsAt, to: end },
      amount: prorate(monthly, trialEndsAt),
      status: "PAID",
      paidAt: trialEndsAt,
      method,
    });
  }

  let first = firstOfMonth(trialEndsAt, 1);
  while (new Date(first) <= now) {
    invoices.push({
      id: `inv-leads-${first.slice(0, 7)}`,
      number: `${prefix}${number++}`,
      date: first,
      description: `Leads Tool, ${monthName(first)}`,
      period: { from: first, to: lastDayOf(first) },
      amount: monthly,
      status: "PAID",
      paidAt: first,
      method,
    });
    first = firstOfMonth(first, 1);
  }

  return { invoices: invoices.reverse(), nextBillingAt: first };
}
