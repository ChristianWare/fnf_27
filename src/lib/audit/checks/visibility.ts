// Check 1, Google visibility: where the operator shows up for the searches
// riders make in their city, in the map results and on page one, weighted
// by how often each search is made. Plus two basics that decide whether
// Google can show the site at all: the homepage title, and nothing telling
// Google to stay out. Server only.

import type { SearchRun } from "../searches";
import { blocksSite, type SiteRead } from "../site";
import type { CheckResult, Part } from "../types";
import { list, num, part, plural, result, skipped, words } from "./parts";

const SERVICE_WORDS =
  /limo|limousine|car service|black car|chauffeur|transportation|sedan|suv|party bus|shuttle|airport/i;

/** How much a place in the results is worth, from 0 to 1. */
const mapsValue = (rank?: number) =>
  !rank ? 0 : rank <= 3 ? 1 : rank <= 10 ? 0.5 : rank <= 20 ? 0.2 : 0;
const organicValue = (rank?: number) =>
  !rank ? 0 : rank <= 3 ? 1 : rank <= 10 ? 0.6 : 0;

export function visibilityCheck(input: {
  searches?: SearchRun;
  site?: SiteRead;
  city?: string;
  business: string;
}): CheckResult {
  const { searches, site, city } = input;
  if (!city)
    return skipped(
      "google",
      "We couldn't tell which city you're in, so we couldn't run the searches.",
    );
  const results = searches?.results ?? [];
  if (!results.length)
    return skipped(
      "google",
      "The searches couldn't be run this time, so Google visibility isn't scored.",
    );

  const weight = (volume?: number) => (volume && volume > 0 ? volume : 1);
  const total = results.reduce((sum, r) => sum + weight(r.volume), 0);
  const mapsShare =
    results.reduce((sum, r) => sum + weight(r.volume) * mapsValue(r.maps), 0) /
    total;
  const organicShare =
    results.reduce(
      (sum, r) => sum + weight(r.volume) * organicValue(r.organic),
      0,
    ) / total;

  const inPack = results.filter((r) => r.maps && r.maps <= 3);
  const inMaps = results.filter((r) => r.maps);
  const onPageOne = results.filter((r) => r.organic);
  const searchProof = results.map((r) => ({
    label: `"${r.keyword}"${r.volume ? ` (${num(r.volume)} a month)` : ""}: ${
      r.maps ? `map result #${r.maps}` : "not in the map results"
    }, ${r.organic ? `#${r.organic} on Google` : "not on page one"}`,
  }));

  const n = results.length;
  const parts: Part[] = [
    part({
      id: "maps",
      label: "The map results",
      max: 50,
      primary: true,
      state: mapsShare >= 0.9 ? "good" : mapsShare > 0 ? "partial" : "missing",
      points: Math.round(mapsShare * 50),
      found: inPack.length
        ? `You're in the top three map results for ${inPack.length === n ? `all ${words(n)}` : `${words(inPack.length)} of the ${words(n)}`} searches.`
        : inMaps.length
          ? `You show up in the map results for ${words(inMaps.length)} of the ${words(n)} searches, but not in the top three, where most riders stop.`
          : `You don't show up in the map results for any of the ${words(n)} searches.`,
      proof: searchProof,
      fix: "Work on your Google Business Profile first (reviews, photos, hours and service areas): it's what moves you up the map results for these searches.",
    }),
    part({
      id: "organic",
      label: "Page one of Google",
      max: 30,
      primary: true,
      state: !site
        ? "missing"
        : organicShare >= 0.9
          ? "good"
          : organicShare > 0
            ? "partial"
            : "missing",
      points: Math.round(organicShare * 30),
      found: !site
        ? "With no website, you can't show up in Google's results under the map."
        : onPageOne.length
          ? `Your site is on page one of Google for ${onPageOne.length === n ? `all ${words(n)}` : `${words(onPageOne.length)} of the ${words(n)}`} searches.`
          : `Your site isn't on page one of Google for any of the ${words(n)} searches.`,
      fix: site
        ? "Give each of these searches its own page on your site (airport rides, each city you serve, each kind of ride), with the city in the page title, so Google has a page to show for each one."
        : "A website with a page for each of these searches is how you show up under the map results.",
    }),
  ];

  if (site) {
    const title = site.home.title;
    const hasCity = city
      ? title.toLowerCase().includes(city.toLowerCase())
      : false;
    const hasService = SERVICE_WORDS.test(title);
    parts.push(
      part({
        id: "title",
        label: "Your homepage title",
        max: 10,
        state:
          hasCity && hasService
            ? "good"
            : hasCity || hasService
              ? "partial"
              : "missing",
        found: !title
          ? "Your homepage has no title, the line Google shows as the link."
          : hasCity && hasService
            ? `Your homepage title names your city and what you do: "${title}".`
            : `Your homepage title, "${title}", doesn't say ${
                !hasCity && !hasService
                  ? `what you do or that you're in ${city}`
                  : !hasCity
                    ? `that you're in ${city}`
                    : "what you do"
              }.`,
        fix: `Put your main service and your city in your homepage title, like "Black Car & Limo Service in ${city} | ${input.business}".`,
      }),
    );

    const noindex = site.home.noindex;
    const blocked = site.robots.found && blocksSite(site.robots, "googlebot");
    const sitemap = site.sitemap.length > 0;
    parts.push(
      part({
        id: "indexable",
        label: "Google can list your site",
        max: 10,
        state: noindex || blocked ? "missing" : sitemap ? "good" : "partial",
        points: 6,
        found: noindex
          ? 'Your homepage tells Google not to list it (a "noindex" tag), so Google won\'t show it.'
          : blocked
            ? "Your robots.txt keeps Google out of your whole site."
            : sitemap
              ? `Nothing keeps Google out, and your sitemap lists ${num(site.sitemap.length)} ${plural(site.sitemap.length, "page")}.`
              : "Nothing keeps Google out, but we didn't find a sitemap listing your pages.",
        fix: noindex
          ? 'Remove the "noindex" tag from your homepage (in WordPress it\'s often Settings → Reading → "Discourage search engines").'
          : blocked
            ? 'Remove the "Disallow: /" line from your robots.txt so Google can read your site.'
            : "Add a sitemap (most site builders make one at /sitemap.xml) and submit it in Google Search Console.",
      }),
    );
  }

  const missed = results
    .filter((r) => !(r.maps && r.maps <= 3) && !r.organic)
    .reduce((sum, r) => sum + (r.volume ?? 0), 0);
  const notes: string[] = [];
  if (missed > 0)
    notes.push(
      `About ${num(missed)} searches a month in ${city} where you're not in the top three map results or on page one (Google's estimate).`,
    );
  if (searches?.failed)
    notes.push(
      `${words(searches.failed).replace(/^./, (c) => c.toUpperCase())} ${plural(searches.failed, "search", "searches")} couldn't be run this time.`,
    );

  const lead = inPack.length
    ? `You're in the top three map results for ${inPack.length === n ? `all ${words(n)}` : `${words(inPack.length)} of the ${words(n)}`} searches riders make in ${city}`
    : `Riders searching in ${city} don't see you in the top three map results for any of the ${words(n)} searches we ran`;
  const second = site
    ? onPageOne.length
      ? `, and on page one of Google for ${onPageOne.length === n ? "all of them" : words(onPageOne.length)}.`
      : ", or on page one of Google."
    : ".";
  return result("google", parts, {
    found: `${lead}${second}`,
    notes: notes.length ? notes : undefined,
  });
}

/** The searches, for the report: which ones, how often, where they were. */
export const searchList = (run?: SearchRun) =>
  list((run?.results ?? []).map((r) => `"${r.keyword}"`));
