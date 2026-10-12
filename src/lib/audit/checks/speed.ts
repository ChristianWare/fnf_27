// Check 3, speed on a phone: Google's own test (PageSpeed Insights) on a
// mid-range phone. The time until the main image or text shows counts the
// most, measured against Google's own line for good (2.5 seconds), then
// Google's score and how much the page downloads. Server only.

import type { Speed } from "../apis/pagespeed";
import type { CheckResult } from "../types";
import { noWebsite, part, result, skipped } from "./parts";

const seconds = (ms: number) => (ms / 1000).toFixed(1);
const megabytes = (bytes: number) =>
  bytes >= 1_000_000
    ? `${(bytes / 1_000_000).toFixed(1)} MB`
    : `${Math.round(bytes / 1000)} KB`;

const fileName = (url: string) => {
  try {
    const path = new URL(url).pathname.split("/").filter(Boolean).pop() ?? url;
    return decodeURIComponent(path).slice(0, 60);
  } catch {
    return url.slice(0, 60);
  }
};

export function speedCheck(input: {
  hasSite: boolean;
  speed?: Speed;
}): CheckResult {
  if (!input.hasSite)
    return noWebsite(
      "speed",
      "There's no website for riders to load.",
      "A fast website is part of being bookable: riders on phones leave pages that take too long to show.",
    );
  const speed = input.speed;
  if (!speed || !speed.ok || speed.lcpMs === undefined)
    return skipped(
      "speed",
      "Google's speed test couldn't load your homepage this time (some sites turn automated tests away), so speed isn't scored.",
    );

  const lcp = speed.lcpMs;
  const biggest = [...speed.requests].sort((a, b) => b.bytes - a.bytes)[0];
  const bigText =
    biggest && biggest.bytes > 300_000
      ? ` The biggest file is ${biggest.type === "Image" ? "an image" : "a file"}, ${fileName(biggest.url)}, at ${megabytes(biggest.bytes)}.`
      : "";
  const fixFile =
    biggest && biggest.bytes > 300_000
      ? ` Start with ${fileName(biggest.url)} (${megabytes(biggest.bytes)}).`
      : "";

  const parts = [
    part({
      id: "lcp",
      label: "Time until the main content shows",
      max: 60,
      primary: true,
      state: lcp <= 2_500 ? "good" : lcp <= 6_000 ? "partial" : "missing",
      points: lcp <= 4_000 ? 35 : 15,
      found:
        lcp <= 2_500
          ? `Your homepage shows its main content after ${seconds(lcp)} seconds on a mid-range phone, inside Google's 2.5-second line for good.`
          : `Your homepage shows its main content after ${seconds(lcp)} seconds on a mid-range phone. Google's line for good is 2.5 seconds.`,
      fix: `Shrink your biggest images (save them as WebP, at the size they're shown) and load the main image first.${fixFile}`,
    }),
  ];

  if (speed.score !== undefined)
    parts.push(
      part({
        id: "score",
        label: "Google's speed score",
        max: 20,
        state:
          speed.score >= 90 ? "good" : speed.score >= 1 ? "partial" : "missing",
        points: Math.round((speed.score / 100) * 20),
        found: `Google scores your homepage ${speed.score} out of 100 for speed on a phone.`,
        fix: "Cut what loads before the page shows: unused plugins, chat and review widgets, and extra fonts.",
      }),
    );

  if (speed.bytes !== undefined) {
    const b = speed.bytes;
    parts.push(
      part({
        id: "weight",
        label: "How much the page downloads",
        max: 20,
        state: b <= 2_000_000 ? "good" : b <= 8_000_000 ? "partial" : "missing",
        points: b <= 4_000_000 ? 12 : 5,
        found: `Your homepage downloads ${megabytes(b)}.${bigText}`,
        fix: `Bring the homepage under 2 MB: compress the photos and videos, and drop the ones nobody sees.${fixFile}`,
      }),
    );
  }

  const notes: string[] = [];
  if (speed.field?.lcpMs !== undefined)
    notes.push(
      `Real visitors on phones${speed.field.origin ? " across your site" : ""} see the main content after ${seconds(speed.field.lcpMs)} seconds (Google's data from Chrome users).`,
    );

  return result("speed", parts, {
    found: parts[0].found,
    notes,
  });
}
