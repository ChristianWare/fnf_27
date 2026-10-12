// Building a check's result from its parts: each part earns points out of
// its maximum, and the check's score is what it earned out of what could
// be checked. A part we couldn't tell ("unknown") counts for nothing either
// way; when a check's main part is unknown, the whole check is left out of
// the score. Safe anywhere.

import type { CheckId, CheckResult, Part, PartState } from "../types";

export function part(p: {
  id: string;
  label: string;
  max: number;
  state: PartState;
  /** For "partial"; "good" earns the max and the rest earn nothing. */
  points?: number;
  found: string;
  proof?: Part["proof"];
  quote?: string;
  primary?: boolean;
  fix?: string;
}): Part {
  const points =
    p.state === "good"
      ? p.max
      : p.state === "partial"
        ? Math.max(0, Math.min(p.max, Math.round(p.points ?? p.max / 2)))
        : 0;
  return {
    id: p.id,
    label: p.label,
    state: p.state,
    points,
    max: p.max,
    found: p.found,
    ...(p.proof?.length ? { proof: p.proof.slice(0, 12) } : {}),
    ...(p.quote ? { quote: p.quote } : {}),
    ...(p.primary ? { primary: true } : {}),
    ...(p.fix ? { fix: p.fix } : {}),
  };
}

/** Out of 100, or null when it couldn't be checked. */
export function scoreParts(parts: Part[]) {
  if (parts.some((p) => p.primary && p.state === "unknown")) return null;
  const known = parts.filter((p) => p.state !== "unknown");
  const max = known.reduce((sum, p) => sum + p.max, 0);
  if (!max) return null;
  const earned = known.reduce((sum, p) => sum + p.points, 0);
  return Math.round((earned / max) * 100);
}

/** The parts that lost the most points, biggest loss first. */
export const losses = (parts: Part[]) =>
  parts
    .filter((p) => p.state !== "unknown" && p.points < p.max)
    .sort((a, b) => b.max - b.points - (a.max - a.points));

export function result(
  id: CheckId,
  parts: Part[],
  options: { found?: string; notes?: string[]; fix?: string } = {},
): CheckResult {
  const score = scoreParts(parts);
  const lost = losses(parts);
  const fix =
    options.fix ??
    lost
      .map((p) => p.fix)
      .filter((f): f is string => Boolean(f))
      .slice(0, 2)
      .join(" ");
  return {
    id,
    score,
    found: options.found ?? lost[0]?.found ?? parts[0]?.found ?? "",
    parts,
    ...(fix && score !== null && score < 100 ? { fix } : {}),
    ...(options.notes?.length ? { notes: options.notes } : {}),
  };
}

/** A check that couldn't run, with the reason, left out of the score. */
export const skipped = (id: CheckId, reason: string): CheckResult => ({
  id,
  score: null,
  found: reason,
  parts: [],
  skipped: reason,
});

/** A website check, for a business with no website. */
export function noWebsite(
  id: CheckId,
  found: string,
  fix: string,
): CheckResult {
  return result(
    id,
    [
      part({
        id: "site",
        label: "A website",
        max: 100,
        state: "missing",
        found,
        fix,
      }),
    ],
    { found, fix },
  );
}

/** "1,240". */
export const num = (n: number) => n.toLocaleString("en-US");

/** "one", "two"… up to ten, then digits. */
export function words(n: number) {
  return (
    [
      "no",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
      "seven",
      "eight",
      "nine",
      "ten",
    ][n] ?? num(n)
  );
}

/** "a, b and c". */
export function list(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export const plural = (n: number, one: string, many = `${one}s`) =>
  n === 1 ? one : many;
