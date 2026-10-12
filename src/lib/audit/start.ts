// Starting an audit: what they typed (a website or a business name), the
// homepage read once to check it's a car service and to find its name and
// number, and the Google listings that might be theirs for "is this you?".
// When the listing links back to the same website it's picked without
// asking. Once the listing is settled, a run of the same site and listing
// in the last day is copied instead of run again.
// Server only.

import { ApiError } from "@/lib/leads/apis/http";
import { cleanUrl } from "@/lib/audit";
import { findListings, placesReady } from "./apis/places";
import { isCarService } from "./ai";
import { Cost } from "./cost";
import { hostOf, stateCode } from "./searches";
import { digits, isOwnSite, readHomepage, siteCity, siteName } from "./site";
import {
  copyRun,
  createAudit,
  getAudit,
  recentRun,
  updateAudit,
} from "./store";
import type { AuditSource, Listing } from "./types";

/** What the "is this you?" step shows for each listing. */
export type Candidate = {
  placeId: string;
  name: string;
  address?: string;
  rating?: number;
  reviews: number;
  website?: string;
};

export const toCandidate = (l: Listing): Candidate => ({
  placeId: l.placeId,
  name: l.name,
  address: l.address,
  rating: l.rating,
  reviews: l.reviews,
  website: l.website ? hostOf(l.website) : undefined,
});

export type Begun =
  | { ok: true; id: string; next: "run" | "done" }
  | {
      ok: true;
      id: string;
      next: "pick";
      candidates: Candidate[];
      askCity: boolean;
    }
  | { ok: false; error: string; field?: "site" | "city" };

/** Words that say a page is a car service's. */
const CAR_SERVICE =
  /\b(limo|limos|limousines?|black car|car service|chauffeur(ed|s)?|town car|sedan service|suv service|ground transportation|airport (transfers?|transportation|car|shuttle|rides?)|executive (car|transportation)|private (driver|car)|party bus(es)?|sprinter|shuttle service|luxury transportation|livery|transportation services?|taxi)\b/i;

const LISTING_TYPES = /taxi|limo|transport|car_rental|travel/i;

const NOT_CAR_SERVICE =
  "This audit is built for black car and limo operators, and that doesn't look like one. If it is, email hello@fontsandfooters.com and I'll run it for you.";

/** "Phoenix, AZ" or "Phoenix Arizona" as a city and a state code. */
export function parsePlace(text: string | undefined) {
  if (!text) return undefined;
  const m = text.trim().match(/^(.+?)[,\s]+([A-Za-z]{2}|[A-Za-z][A-Za-z ]+)$/);
  if (m) {
    const code = stateCode(m[2]);
    if (code) return { city: m[1].trim(), state: code };
  }
  return undefined;
}

export async function beginAudit(input: {
  text: string;
  /** "Phoenix, AZ", for a business name or when the site doesn't say. */
  city?: string;
  source: AuditSource;
  ranBy?: string;
  /** Turn away anything that isn't a car service (the public page). */
  gate: boolean;
}): Promise<Begun> {
  const text = input.text.replace(/\s+/g, " ").trim().slice(0, 200);
  if (text.length < 3)
    return {
      ok: false,
      field: "site",
      error: "Enter your website, or your business name.",
    };
  const looksLikeSite =
    /^https?:\/\//i.test(text) || /^[^\s]+\.[a-z]{2,}(\/.*)?$/i.test(text);
  const typed = parsePlace(input.city);
  const cost = new Cost();

  /* ── A website ── */
  if (looksLikeSite) {
    const url = cleanUrl(text);
    if (!url)
      return {
        ok: false,
        field: "site",
        error: "Enter your website, like www.yourcompany.com.",
      };

    let home: Awaited<ReturnType<typeof readHomepage>>;
    try {
      home = await readHomepage(url);
    } catch (error) {
      const said =
        error instanceof ApiError && error.status
          ? ` (it answered ${error.status})`
          : "";
      return {
        ok: false,
        field: "site",
        error: `We couldn't open ${hostOf(url) ?? url}${said}. Check the address, or enter your business name instead.`,
      };
    }
    const domain = hostOf(home.url)!;
    const page = home.page;

    if (input.gate) {
      const words = `${page.title} ${page.description} ${page.h1.join(" ")} ${page.text.slice(0, 6_000)}`;
      let ok = CAR_SERVICE.test(words);
      if (!ok)
        ok = (await isCarService(words, cost).catch(() => undefined)) ?? false;
      if (!ok) return { ok: false, field: "site", error: NOT_CAR_SERVICE };
    }

    const name = siteName(page, home.host);
    const fromSite = siteCity(page);
    const place =
      typed ??
      (fromSite?.city && stateCode(fromSite.region)
        ? { city: fromSite.city, state: stateCode(fromSite.region)! }
        : undefined);

    const id = await createAudit({
      source: input.source,
      status: "CONFIRM",
      input: text,
      url: home.url,
      domain,
      business: name,
      city: place?.city,
      state: place?.state,
      ranBy: input.ranBy,
    });

    // Their Google listing: by name (and city), then by phone number.
    let candidates: Listing[] = [];
    if (placesReady()) {
      try {
        const query = [name, place?.city ?? ""].join(" ").trim();
        candidates = await findListings(query, { cost });
        const phone = page.phones[0];
        const matches = (l: Listing) =>
          l.website && hostOf(l.website) === domain;
        if (!candidates.some(matches) && phone) {
          const byPhone = await findListings(
            `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`,
            { cost, size: 3 },
          );
          candidates = [...byPhone, ...candidates].filter(
            (l, i, all) => all.findIndex((x) => x.placeId === l.placeId) === i,
          );
        }
      } catch (error) {
        console.warn(
          "[audit] listing search:",
          error instanceof Error ? error.message : error,
        );
      }
    }
    const sure = candidates.find(
      (l) =>
        (l.website && hostOf(l.website) === domain) ||
        (l.phone &&
          page.phones.includes(digits(l.phone)) &&
          candidates.length === 1),
    );
    await updateAudit(id, {
      costMicros: cost.micros,
      candidates: candidates.slice(0, 5),
    });

    if (sure) {
      if (await reuse(id, { domain, placeId: sure.placeId }))
        return { ok: true, id, next: "done" };
      await saveListing(id, sure);
      return { ok: true, id, next: "run" };
    }
    if (!candidates.length) {
      // Nothing on Google: run it without a listing, if we know the city.
      if (place) {
        if (await reuse(id, { domain, placeId: null, city: place.city }))
          return { ok: true, id, next: "done" };
        await updateAudit(id, {
          status: "QUEUED",
          candidates: null,
          noListing: "NOT_FOUND",
        });
        return { ok: true, id, next: "run" };
      }
      return { ok: true, id, next: "pick", candidates: [], askCity: true };
    }
    return {
      ok: true,
      id,
      next: "pick",
      candidates: candidates.slice(0, 5).map(toCandidate),
      askCity: !place,
    };
  }

  /* ── A business name ── */
  if (!placesReady())
    return {
      ok: false,
      field: "site",
      error: "Enter your website, like www.yourcompany.com.",
    };
  let candidates: Listing[] = [];
  try {
    candidates = await findListings(
      [text, typed ? `${typed.city}, ${typed.state}` : ""].join(" ").trim(),
      { cost },
    );
  } catch (error) {
    console.warn(
      "[audit] listing search:",
      error instanceof Error ? error.message : error,
    );
    return {
      ok: false,
      error:
        "We couldn't search Google just now. Try again in a minute, or enter your website.",
    };
  }
  if (!candidates.length)
    return {
      ok: false,
      field: "site",
      error:
        'We couldn\'t find that business on Google. Add your city (like "Better Line Limo Phoenix"), or enter your website instead.',
    };
  const id = await createAudit({
    source: input.source,
    status: "CONFIRM",
    input: text,
    business: text,
    city: typed?.city,
    state: typed?.state,
    ranBy: input.ranBy,
    candidates: candidates.slice(0, 5),
    costMicros: cost.micros,
  });
  return {
    ok: true,
    id,
    next: "pick",
    candidates: candidates.slice(0, 5).map(toCandidate),
    askCity: false,
  };
}

/**
 * Copies a finished run from the last day into this audit, if there's one
 * of the same site with the same listing: true when it did. Only once the
 * listing is settled, so one visitor's pick never decides another's report.
 */
async function reuse(id: string, where: Parameters<typeof recentRun>[0]) {
  const recent = await recentRun(where);
  if (!recent) return false;
  await copyRun(id, recent);
  return true;
}

/** Saves the listing on an audit and queues it. */
async function saveListing(id: string, listing: Listing) {
  const row = await getAudit(id);
  const city = listing.city ?? row?.city ?? undefined;
  const state = listing.stateCode ?? row?.state ?? undefined;
  await updateAudit(id, {
    placeId: listing.placeId,
    listing,
    business: listing.name || row?.business,
    city,
    state,
    candidates: null,
    noListing: null,
    status: "QUEUED",
  });
}

export type Picked =
  | { ok: true; next: "run" | "done" }
  | { ok: false; error: string; field?: "city" };

/**
 * "Is this you?" answered: one of the listings, or none of them (then we
 * need their city for the searches).
 */
export async function pickListing(
  id: string,
  choice: { placeId?: string; city?: string; notOnGoogle?: boolean },
  options: { gate: boolean },
): Promise<Picked> {
  const row = await getAudit(id);
  if (!row || row.status !== "CONFIRM")
    return {
      ok: false,
      error: "This audit has already started. Reload the page.",
    };

  if (choice.placeId) {
    const listing = row.candidates?.find((c) => c.placeId === choice.placeId);
    if (!listing)
      return { ok: false, error: "Pick one of the listings shown." };

    // A business name typed in: make sure it's a car service.
    if (options.gate && !row.url) {
      const words = `${listing.name} ${listing.types.join(" ").replace(/_/g, " ")}`;
      // They picked their own listing: only a clear "no" from the AI turns it away.
      const ok =
        CAR_SERVICE.test(words) ||
        listing.types.some((t) => LISTING_TYPES.test(t)) ||
        (await isCarService(
          `${words} ${listing.address ?? ""}`,
          new Cost(),
        ).catch(() => undefined)) !== false;
      if (!ok) return { ok: false, error: NOT_CAR_SERVICE };
    }

    // A business name typed in: its website, if Google has one of its
    // own, is audited too.
    let domain = row.domain;
    if (!row.url && listing.website && isOwnSite(listing.website)) {
      try {
        const home = await readHomepage(listing.website);
        domain = hostOf(home.url) ?? hostOf(listing.website) ?? null;
        await updateAudit(id, { url: home.url, domain });
      } catch {
        // The listing's site doesn't open: audit the listing alone.
      }
    }
    if (await reuse(id, { domain, placeId: listing.placeId }))
      return { ok: true, next: "done" };
    await saveListing(id, listing);
    return { ok: true, next: "run" };
  }

  // None of them: the city has to come from somewhere.
  const place =
    parsePlace(choice.city) ??
    (row.city && row.state ? { city: row.city, state: row.state } : undefined);
  if (!place)
    return {
      ok: false,
      field: "city",
      error: 'Enter the city you\'re based in, like "Phoenix, AZ".',
    };
  if (!row.url)
    return {
      ok: false,
      error:
        "Without a Google listing or a website there's nothing to check. Enter your website instead.",
    };
  if (await reuse(id, { domain: row.domain, placeId: null, city: place.city }))
    return { ok: true, next: "done" };
  await updateAudit(id, {
    city: place.city,
    state: place.state,
    candidates: null,
    noListing: choice.notOnGoogle ? "SAID" : "NOT_FOUND",
    status: "QUEUED",
  });
  return { ok: true, next: "run" };
}
