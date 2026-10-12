// The total: each check's score times its weight, out of the weights of the
// checks that could be scored (one that couldn't run doesn't count against
// anyone). The three things costing the most are the three checks that
// lost the most weighted points, not an AI's pick. Safe anywhere.

import { CHECK_IDS, CHECKS } from "./kinds";
import { losses } from "./checks/parts";
import type { Band, Checks, TopItem } from "./types";

export function totalScore(checks: Checks): number | null {
  let earned = 0;
  let weights = 0;
  for (const id of CHECK_IDS) {
    const score = checks[id]?.score;
    if (score === null || score === undefined) continue;
    earned += score * CHECKS[id].weight;
    weights += CHECKS[id].weight;
  }
  return weights ? Math.round(earned / weights) : null;
}

export function bandOf(score: number): Band {
  if (score < 40) return { label: "Losing bookings", tone: "red" };
  if (score < 60) return { label: "Leaking bookings", tone: "yellow" };
  if (score < 80) return { label: "Solid, with gaps", tone: "mint" };
  return { label: "Strong", tone: "lime" };
}

export function summaryOf(score: number, hasSite = true) {
  if (!hasSite)
    return "Without a website, riders who search and book online can only find your Google listing. Start with the fixes below.";
  if (score < 40)
    return "Your site and listing are costing you bookings. Start with the three fixes below.";
  if (score < 60)
    return "Riders can find parts of you, but you're losing bookings in a few places.";
  if (score < 80)
    return "A solid base, with a few gaps that cost you bookings.";
  return "In strong shape, with a few small things left to tidy.";
}

/** A check this good isn't costing anything worth a card. */
const TOP_BELOW = 90;

/** A website check scored for a business with no website. */
const noSite = (result: Checks[keyof Checks]) =>
  result?.parts.length === 1 && result.parts[0].id === "site";

/**
 * Up to three, biggest weighted loss first. With no website, four checks
 * say the same thing, so only the first of them gets a card.
 */
export function topThree(checks: Checks): TopItem[] {
  return CHECK_IDS.map((id) => ({ id, result: checks[id] }))
    .filter(
      (c) => c.result && c.result.score !== null && c.result.score < TOP_BELOW,
    )
    .map((c) => ({
      ...c,
      lost: CHECKS[c.id].weight * (100 - (c.result!.score ?? 100)),
    }))
    .filter((c) => c.lost > 0)
    .sort((a, b) => b.lost - a.lost)
    .filter(
      (c, i, all) =>
        !noSite(c.result) || all.findIndex((x) => noSite(x.result)) === i,
    )
    .slice(0, 3)
    .map(({ id, result }) => ({
      id,
      name: CHECKS[id].name,
      // The part that cost the most says it best.
      found: losses(result!.parts)[0]?.found ?? result!.found,
      why: CHECKS[id].why,
      fix: result!.fix,
    }));
}
