// Running an audit, start to finish, in about a minute: the site is read
// once, then three strands run side by side and save their checks as they
// finish. Searches → Google visibility and the Business Profile. PageSpeed
// → speed and online booking. The AI reader → AI readability and the pages
// riders search for. Then the AI writes the fixes, the score is worked out
// and the studio hears about it. A check that fails or runs out of time is
// saved as "couldn't check"; the rest still count. Server only.

import { after } from "next/server";
import { pageSpeed, type Speed } from "./apis/pagespeed";
import { findListings, listingById, placesReady } from "./apis/places";
import {
  readFirstScreen,
  readSite as readWithAi,
  writeFixes,
  type Service,
  type SiteReading,
} from "./ai";
import { bookingCheck } from "./checks/booking";
import { pagesCheck } from "./checks/pages";
import { profileCheck } from "./checks/profile";
import { readableCheck } from "./checks/readable";
import { skipped } from "./checks/parts";
import { speedCheck } from "./checks/speed";
import { visibilityCheck } from "./checks/visibility";
import { Cost } from "./cost";
import { CHECK_IDS, CHECKS, type CheckId } from "./kinds";
import { alertAuditRun } from "./emails";
import { totalScore } from "./score";
import {
  cityVolumes,
  hostOf,
  pickSearches,
  rivalsFrom,
  runSearches,
  type SearchRun,
} from "./searches";
import { digits, isOwnSite, readSite, type SiteRead } from "./site";
import {
  claimAudit,
  getAudit,
  saveCheck,
  saveFixes,
  updateAudit,
} from "./store";
import type { CheckResult, Rival, SiteFacts } from "./types";

/** Each strand's limit; the whole run stays inside the function's 300 seconds. */
const LIMITS = {
  site: 40_000,
  searches: 90_000,
  speed: 110_000,
  reader: 75_000,
  fixes: 35_000,
};

function within<T>(work: Promise<T>, ms: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        console.warn("[audit]", error instanceof Error ? error.message : error);
        resolve(undefined);
      },
    );
  });
}

/** The kinds of ride a site mentions, before the AI has read it. */
function servicesIn(site: SiteRead | undefined): Service[] {
  if (!site) return [];
  const words = [site.home, ...site.pages]
    .map((p) => `${p.title} ${p.text}`)
    .join(" ")
    .toLowerCase();
  const out: Service[] = [];
  if (/airport/.test(words)) out.push("airport");
  if (/corporate|business travel/.test(words)) out.push("corporate");
  if (/wedding/.test(words)) out.push("wedding");
  if (/\bprom\b/.test(words)) out.push("prom");
  if (/special event|concert|night out|bachelor/.test(words))
    out.push("events");
  if (/hourly|as directed|by the hour/.test(words)) out.push("hourly");
  if (/\btours?\b|wine tour/.test(words)) out.push("tours");
  if (/party bus/.test(words)) out.push("party_bus");
  return out;
}

/** Schedules a queued audit to run after the response goes out. */
export function runLater(id: string) {
  after(() => runAudit(id));
}

export async function runAudit(id: string) {
  const row = await claimAudit(id);
  if (!row) return;
  const cost = new Cost();
  const saved = new Set<CheckId>();
  const save = async (check: CheckResult) => {
    saved.add(check.id);
    await saveCheck(id, check);
  };

  try {
    // "Run it again", or a run after Google's details were cleared: the
    // listing is looked up again by its ID.
    let listing = row.listing ?? undefined;
    if (!listing && row.placeId) {
      listing = await within(listingById(row.placeId, cost), 15_000);
      if (listing) await updateAudit(id, { listing });
    }
    const business = row.business || listing?.name || row.domain || row.input;
    const city = listing?.city ?? row.city ?? undefined;
    const state = listing?.stateCode ?? row.state ?? undefined;
    const hasSite = Boolean(row.url);

    // Started first, since they take longest: Google's speed test on the
    // homepage, and how often each search is made in their city.
    const homeSpeed: Promise<Speed | undefined> = hasSite
      ? within(pageSpeed(row.url!, cost), LIMITS.speed)
      : Promise.resolve(undefined);
    const volumes =
      city && state
        ? within(cityVolumes(city, state, cost), 30_000)
        : Promise.resolve(undefined);

    // The site, read once for every check that needs it.
    const site = hasSite
      ? await within(readSite(row.url!), LIMITS.site)
      : undefined;
    const unreadable = hasSite && !site;
    const services = servicesIn(site);
    const sitePhones = site
      ? [...new Set([site.home, ...site.pages].flatMap((p) => p.phones))]
      : [];
    const them = {
      placeId: listing?.placeId ?? row.placeId ?? undefined,
      domain:
        row.domain ??
        (isOwnSite(listing?.website) ? hostOf(listing!.website!) : undefined),
      name: business,
      phones: [
        ...sitePhones,
        ...(listing?.phone ? [digits(listing.phone)] : []),
      ],
    };

    // The booking page, if it's a page of their own, for PageSpeed too.
    const bookingPage = site?.bookingLinks.find(
      (b) =>
        b.internal && b.href.replace(/\/$/, "") !== site.url.replace(/\/$/, ""),
    )?.href;

    const bookingSpeed: Promise<Speed | undefined> = bookingPage
      ? within(pageSpeed(bookingPage, cost), LIMITS.speed)
      : Promise.resolve(undefined);

    let reading: SiteReading | undefined;
    let searchRun: SearchRun | undefined;
    let rivals: Rival[] = [];
    let phoneShot: string | undefined;

    const notRead = (check: CheckId) =>
      skipped(
        check,
        "We couldn't read your site this time, so this isn't scored.",
      );

    await Promise.all([
      // The AI reads the site → AI readability, the pages riders search for.
      (async () => {
        if (unreadable) {
          await save(notRead("ai"));
          await save(notRead("pages"));
          return;
        }
        reading = site
          ? await within(
              readWithAi([site.home, ...site.pages], cost),
              LIMITS.reader,
            )
          : undefined;
        const allServices = [
          ...new Set([...services, ...(reading?.services ?? [])]),
        ];
        await save(
          readableCheck({
            site,
            reading,
            airport: allServices.includes("airport"),
          }),
        );
        await save(
          pagesCheck({
            site,
            services: allServices,
            cities: reading?.cities ?? [],
            city,
            volumes: (await volumes)?.volumes,
          }),
        );
      })(),

      // The searches → Google visibility, then the Business Profile.
      (async () => {
        const v = await volumes;
        if (v && city) {
          const picks = pickSearches(city, services, v.volumes);
          searchRun = await within(
            runSearches(picks, v.where, them, cost),
            LIMITS.searches,
          );
        }
        await save(
          visibilityCheck({ searches: searchRun, site, city, business }),
        );
        rivals = searchRun?.rivals ?? [];
        // No map results to compare with: ask Google for the operators near them.
        if (!rivals.length && listing && placesReady() && city) {
          const near =
            listing.lat && listing.lng
              ? { lat: listing.lat, lng: listing.lng }
              : undefined;
          const found = await within(
            findListings(
              `black car service in ${city}${state ? `, ${state}` : ""}`,
              { near, size: 8, cost },
            ),
            20_000,
          );
          rivals = found ? rivalsFrom(found, them) : [];
        }
        await save(
          // Their listing is known but Google didn't send it this time.
          row.placeId && !listing
            ? skipped(
                "profile",
                "Google didn't send your listing's details this time, so your Business Profile isn't scored.",
              )
            : profileCheck({
                listing,
                missing: listing
                  ? undefined
                  : row.noListing === "SAID"
                    ? "said"
                    : "searched",
                rivals,
                site,
                business,
              }),
        );
      })(),

      // PageSpeed → speed on a phone, then online booking.
      (async () => {
        if (unreadable) {
          await save(notRead("speed"));
          await save(notRead("booking"));
          return;
        }
        const home = await homeSpeed;
        await save(speedCheck({ hasSite, speed: home }));
        phoneShot = home?.ok ? home.screenshot : undefined;
        const screen = phoneShot
          ? await within(readFirstScreen(phoneShot, cost), 20_000)
          : undefined;
        const booking = await bookingSpeed;
        await save(bookingCheck({ site, home, bookingPage: booking, screen }));
      })(),
    ]);

    // Anything that didn't finish.
    for (const check of CHECK_IDS) {
      if (!saved.has(check))
        await save(
          skipped(check, "This check ran out of time, so it isn't scored."),
        );
    }

    // The fixes, written for this site. With no website, the four website
    // checks keep the fix they have: there's nothing on a site to name.
    const done = await getAudit(id);
    const checks = done?.checks ?? {};
    const failing = CHECK_IDS.map((c) => checks[c]).filter(
      (c): c is CheckResult =>
        Boolean(c && c.score !== null && c.score < 100 && c.fix) &&
        !(c!.parts.length === 1 && c!.parts[0].id === "site"),
    );
    const facts: SiteFacts = {
      title: site?.home.title,
      description: site?.home.description,
      platform: site?.platform,
      bookingSystem: site?.bookingSystem?.name,
      bookingUrl: site?.bookingSystem?.href ?? bookingPage,
      analytics: site?.analytics ?? [],
      phones: sitePhones,
      emails: site
        ? [
            ...new Set([site.home, ...site.pages].flatMap((p) => p.emails)),
          ].slice(0, 6)
        : [],
      https: site?.https ?? false,
      pagesRead: site ? site.pages.length + 1 : 0,
      sitemapUrls: site?.sitemap.length ?? 0,
      words: site?.home.words ?? 0,
      services: [...new Set([...services, ...(reading?.services ?? [])])],
      cities: reading?.cities ?? [],
    };
    const fixes = await within(
      writeFixes(
        business,
        [
          city ? `Based in ${city}${state ? `, ${state}` : ""}.` : "",
          site ? `Website: ${site.url}` : "No website.",
          facts.platform ? `The site is built on ${facts.platform}.` : "",
          facts.bookingSystem
            ? `Bookings go through ${facts.bookingSystem}.`
            : "",
        ].filter(Boolean),
        failing.map((c) => ({
          id: c.id,
          name: CHECKS[c.id].name,
          findings: [
            ...c.parts
              .filter((p) => p.state !== "good" && p.state !== "unknown")
              .map((p) => p.found),
            ...(c.notes ?? []),
          ].slice(0, 8),
          draft: c.fix ?? "",
        })),
        cost,
      ),
      LIMITS.fixes,
    );
    if (fixes && Object.keys(fixes).length)
      await saveFixes(id, fixes as Partial<Record<CheckId, string>>);

    const final = await getAudit(id);
    const score = totalScore(final?.checks ?? {});
    await updateAudit(id, {
      status: "DONE",
      score,
      finishedAt: new Date(),
      searches: searchRun?.results ?? null,
      rivals,
      facts,
      phoneShot: phoneShot ?? null,
      costMicros: row.costMicros + cost.micros,
    });
    if (row.source === "PAGE") await alertAuditRun(id);
  } catch (error) {
    console.error(`[audit] ${id} failed:`, error);
    await updateAudit(id, {
      status: "FAILED",
      error:
        error instanceof Error
          ? error.message.slice(0, 300)
          : "The audit stopped.",
      costMicros: row.costMicros + cost.micros,
    }).catch(() => undefined);
  }
}
