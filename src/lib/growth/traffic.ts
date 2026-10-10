// Visitors, worked out for whatever dates someone picks: the totals, the
// bars (by day, week or month), the plan line, and how this month is
// pacing. Everything starts from one row a day since launch, so every view
// adds up the same way. Pure functions, safe anywhere.

import type { ChannelKey } from "./channels";
import {
  addDays,
  addMonths,
  daysFrom,
  daysInMonth,
  endOfMonth,
  fmtDayShort,
  fmtMonthShort,
  fmtMonthYear,
  fmtWeekdayShort,
  maxDay,
  minDay,
  mondayOf,
  monthOf,
  startOfMonth,
} from "./dates";

/** The days a series covers: from launch (or its first numbers) on. */
export type Days = {
  /** Launch day, or later: nothing from before they had the site with us. */
  start: string;
  /** The last day with final numbers. */
  through: string;
};

/**
 * What the Growth page counts, a value a day: everyone who visited, from
 * Plausible, split by where they came from; or, before Plausible is
 * connected, visitors from Google search.
 */
export type DailySeries = Days & {
  total: number[];
  /** The same visitors by where they came from, when that's known. */
  parts?: Partial<Record<ChannelKey, number[]>>;
};

/** Everyone who visited, from Plausible, a value a day. */
export type VisitSeries = Days & {
  /** People, counted once a day (as Plausible counts them). */
  visitors: number[];
  visits: number[];
  pageviews: number[];
  /** Visitors by where they came from. */
  channels: Partial<Record<ChannelKey, number[]>>;
};

/** Visitors from Google search (Search Console), a value a day. */
export type TrafficSeries = Days & {
  clicks: number[];
  impressions: number[];
  /** Average position in the results each day; 0 when it never showed. */
  position: number[];
};

export const fromVisits = (v: VisitSeries): DailySeries => ({
  start: v.start,
  through: v.through,
  total: v.visitors,
  parts: v.channels,
});

export const fromGoogle = (g: TrafficSeries): DailySeries => ({
  start: g.start,
  through: g.through,
  total: g.clicks,
});

/** A month of the 12-month plan: "2026-10" and its target. */
export type PlanMonth = { month: string; target: number };

export type RangeKey = "day" | "week" | "month" | "ytd" | "all" | "custom";
export type Grain = "day" | "week" | "month";
export type Range = { key: RangeKey; from: string; to: string; grain: Grain };

export const RANGES: { key: RangeKey; label: string }[] = [
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
  { key: "ytd", label: "Year to date" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom" },
];

/** The first and last places in a series' arrays for two days. */
function places(s: Days, from: string, to: string) {
  const a = Math.max(0, daysFrom(s.start, from));
  const b = Math.min(daysFrom(s.start, s.through), daysFrom(s.start, to));
  return [a, b] as const;
}

const sum = (values: number[] | undefined, a: number, b: number) => {
  let total = 0;
  for (let i = a; i <= b; i++) total += values?.[i] ?? 0;
  return total;
};

export type Parts = Partial<Record<ChannelKey, number>>;

export type Count = {
  value: number;
  parts?: Parts;
  /** Days with numbers in it. */
  days: number;
};

/** The total between two days, and its parts. */
export function countFor(s: DailySeries, from: string, to: string): Count {
  const [a, b] = places(s, from, to);
  const parts = s.parts
    ? (Object.fromEntries(
        Object.entries(s.parts).map(([key, values]) => [
          key,
          sum(values, a, b),
        ]),
      ) as Parts)
    : undefined;
  return { value: sum(s.total, a, b), parts, days: Math.max(0, b - a + 1) };
}

/** Visits and page views between two days. */
export function visitsFor(v: VisitSeries, from: string, to: string) {
  const [a, b] = places(v, from, to);
  return {
    visitors: sum(v.visitors, a, b),
    visits: sum(v.visits, a, b),
    pageviews: sum(v.pageviews, a, b),
  };
}

export type GoogleTotals = {
  clicks: number;
  impressions: number;
  /** Average position, weighted by impressions. */
  position?: number;
  days: number;
};

/** Google's numbers between two days (only the days it has). */
export function googleTotals(
  g: TrafficSeries,
  from: string,
  to: string,
): GoogleTotals {
  const [a, b] = places(g, from, to);
  let impressions = 0;
  let weighted = 0;
  for (let i = a; i <= b; i++) {
    impressions += g.impressions[i] ?? 0;
    weighted += (g.position[i] ?? 0) * (g.impressions[i] ?? 0);
  }
  return {
    clicks: sum(g.clicks, a, b),
    impressions,
    position: impressions ? weighted / impressions : undefined,
    days: Math.max(0, b - a + 1),
  };
}

/** Up to 45 days by day, up to 26 weeks by week, longer by month. */
export function grainFor(from: string, to: string): Grain {
  const days = daysFrom(from, to) + 1;
  return days <= 45 ? "day" : days <= 182 ? "week" : "month";
}

/** The plan's months, if they cover the month `day` is in. */
function planYear(plan: PlanMonth[], day: string) {
  return plan.some((p) => p.month === monthOf(day)) ? plan : undefined;
}

export function rangeFor(
  key: RangeKey,
  s: Days,
  plan: PlanMonth[],
  custom?: { from: string; to: string },
): Range {
  const to = s.through;
  const clamp = (day: string) => maxDay(s.start, minDay(day, to));
  switch (key) {
    case "day":
      return { key, from: clamp(addDays(to, -29)), to, grain: "day" };
    case "week":
      return {
        key,
        from: clamp(addDays(mondayOf(to), -7 * 11)),
        to,
        grain: "week",
      };
    case "month": {
      const year = planYear(plan, to);
      const first = year ? `${year[0].month}-01` : addMonths(to, -11);
      return { key, from: clamp(first), to, grain: "month" };
    }
    case "ytd": {
      const from = clamp(`${to.slice(0, 4)}-01-01`);
      return { key, from, to, grain: grainFor(from, to) };
    }
    case "all":
      return { key, from: s.start, to, grain: grainFor(s.start, to) };
    case "custom": {
      let from = clamp(custom?.from ?? addDays(to, -29));
      let end = clamp(custom?.to ?? to);
      if (from > end) [from, end] = [end, from];
      return { key, from, to: end, grain: grainFor(from, end) };
    }
  }
}

/** The same number of days just before a range, if the site was live. */
export function previousOf(range: Range, s: Days) {
  const days = daysFrom(range.from, range.to) + 1;
  const from = addDays(range.from, -days);
  return from >= s.start
    ? { from, to: addDays(range.from, -1), days }
    : undefined;
}

export type Bucket = {
  key: string;
  from: string;
  to: string;
  value: number;
  /** The same visitors by where they came from, when that's known. */
  parts?: Parts;
  /** Days with numbers in it: 0 for a month still to come. */
  days: number;
  /** Not a whole week or month: cut by launch day or the latest numbers. */
  partial: boolean;
  /** The week or month still under way: only part of it is in. */
  soFar: boolean;
  /** A month of the plan still to come. */
  future: boolean;
  /** The plan's target, for a month. */
  target?: number;
  /** For the month we're in: where it's heading at this rate. */
  pace?: number;
  /** Under the bar. */
  label: string;
  /** "’27", after the label where the year changes (left off on a phone). */
  year?: string;
  /** Over the numbers when you point at it. */
  title: string;
};

/** The bars for a range: a day, a week or a month each. */
export function bucketsFor(
  range: Range,
  s: DailySeries,
  plan: PlanMonth[],
): Bucket[] {
  const out: Bucket[] = [];
  const fill = (
    key: string,
    from: string,
    to: string,
    partial: boolean,
    label: string,
    title: string,
  ): Bucket => {
    const count = countFor(s, from, to);
    return {
      key,
      from,
      to,
      value: count.value,
      parts: count.parts,
      days: count.days,
      partial,
      soFar: false,
      future: false,
      label,
      title,
    };
  };

  if (range.grain === "day") {
    for (let d = range.from; d <= range.to; d = addDays(d, 1))
      out.push(
        fill(
          d,
          d,
          d,
          false,
          fmtDayShort(d),
          `${fmtWeekdayShort(d)}, ${fmtDayShort(d)}`,
        ),
      );
    return out;
  }

  if (range.grain === "week") {
    for (let w = mondayOf(range.from); w <= range.to; w = addDays(w, 7)) {
      const from = maxDay(w, range.from);
      const to = minDay(addDays(w, 6), range.to);
      const soFar = to < addDays(w, 6) && to === s.through;
      const bucket = fill(
        w,
        from,
        to,
        from > w || to < addDays(w, 6),
        fmtDayShort(w),
        soFar
          ? `Week of ${fmtDayShort(w)}, so far`
          : `Week of ${fmtDayShort(w)}`,
      );
      bucket.soFar = soFar;
      out.push(bucket);
    }
    return out;
  }

  // By month. In the Monthly view the plan's whole year shows, months to
  // come included, so the dotted line has somewhere to go.
  const year = range.key === "month" ? planYear(plan, range.to) : undefined;
  const lastMonth = year ? `${year[year.length - 1].month}-01` : range.to;
  const years = new Set([range.from.slice(0, 4), lastMonth.slice(0, 4)]);
  for (let m = startOfMonth(range.from); m <= lastMonth; m = addMonths(m, 1)) {
    const month = monthOf(m);
    const target = plan.find((p) => p.month === month)?.target;
    const label = fmtMonthShort(m);
    const year =
      years.size > 1 && (m === startOfMonth(range.from) || m.endsWith("-01-01"))
        ? `’${m.slice(2, 4)}`
        : undefined;
    if (m > range.to) {
      out.push({
        key: month,
        from: m,
        to: endOfMonth(m),
        value: 0,
        days: 0,
        partial: false,
        soFar: false,
        future: true,
        target,
        label,
        year,
        title: fmtMonthYear(m),
      });
      continue;
    }
    const from = maxDay(m, range.from);
    const to = minDay(endOfMonth(m), range.to);
    const soFar = to < endOfMonth(m) && to === s.through;
    const bucket = fill(
      month,
      from,
      to,
      from > m || to < endOfMonth(m),
      label,
      soFar ? `${fmtMonthYear(m)}, so far` : fmtMonthYear(m),
    );
    bucket.target = target;
    bucket.soFar = soFar;
    bucket.year = year;
    // Where the month we're in is heading, when it started on the 1st.
    if (soFar && from === m && bucket.days > 0)
      bucket.pace = Math.round((bucket.value / bucket.days) * daysInMonth(m));
    out.push(bucket);
  }
  return out;
}

export type MonthStatus = {
  /** "2026-10" */
  month: string;
  target?: number;
  /** Days of this month with numbers so far. */
  covered: number;
  soFar: number;
  pace?: number;
  through?: string;
  /** Last month, when there are numbers for it. */
  last?: { month: string; value: number; target?: number };
};

/** How the month we're in is going, against the plan. */
export function monthStatus(
  s: DailySeries | undefined,
  plan: PlanMonth[],
  today: string,
): MonthStatus {
  const first = startOfMonth(today);
  const month = monthOf(today);
  const target = plan.find((p) => p.month === month)?.target;
  if (!s) return { month, target, covered: 0, soFar: 0 };
  const from = maxDay(first, s.start);
  const covered =
    s.through >= from && from <= endOfMonth(first)
      ? daysFrom(from, minDay(s.through, endOfMonth(first))) + 1
      : 0;
  const soFar = covered ? countFor(s, from, s.through).value : 0;
  const daysThisMonth = daysFrom(from, endOfMonth(first)) + 1;
  const pace = covered
    ? Math.round((soFar / covered) * daysThisMonth)
    : undefined;
  const lastFirst = addMonths(first, -1);
  const lastFrom = maxDay(lastFirst, s.start);
  const last =
    s.start <= endOfMonth(lastFirst) && s.through >= lastFrom
      ? {
          month: monthOf(lastFirst),
          value: countFor(s, lastFrom, minDay(endOfMonth(lastFirst), s.through))
            .value,
          target: plan.find((p) => p.month === monthOf(lastFirst))?.target,
        }
      : undefined;
  return { month, target, covered, soFar, pace, through: s.through, last };
}

/** The last few months' visitors, oldest first, the month we're in last. */
export function recentMonths(
  s: DailySeries,
  today: string,
  count: number,
): { month: string; value: number }[] {
  const out: { month: string; value: number }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const m = addMonths(today, -i);
    if (endOfMonth(m) < s.start) continue;
    const from = maxDay(m, s.start);
    const to = minDay(endOfMonth(m), s.through);
    out.push({
      month: monthOf(m),
      value: to >= from ? countFor(s, from, to).value : 0,
    });
  }
  return out;
}

/** "+18%", "−4%", or undefined when there's nothing to compare. */
export function changeOf(now: number, before: number | undefined) {
  if (before === undefined || before === 0) return undefined;
  const pct = Math.round(((now - before) / before) * 100);
  return pct;
}

/** Each part's share of the whole, adding up to 100. */
export function sharesOf(parts: Parts | undefined) {
  const total = Object.values(parts ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  return (key: ChannelKey) => (total ? ((parts?.[key] ?? 0) / total) * 100 : 0);
}

/**
 * A tidy top for the chart's scale, with four even steps under it that
 * read well: 4, 8, 20, 100, 600, 1,000, 3,200…
 */
export function niceTop(value: number) {
  const step = value / 4;
  if (step <= 1) return 4;
  const power = 10 ** Math.floor(Math.log10(step));
  // Whole numbers on every line: 1,250 is fine, 12.5 isn't.
  for (const nice of [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8, 10]) {
    const value = nice * power;
    if (value >= step && Number.isInteger(value)) return value * 4;
  }
  return 40 * power;
}
