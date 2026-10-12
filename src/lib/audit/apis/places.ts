// Google's Places API for the audit: finding an operator's own listing for
// "is this you?", with the details the Business Profile check needs in the
// same call, and the operators near them when DataForSEO isn't set up.
// Uses GOOGLE_MAPS_SERVER_KEY, the Leads Tool's key (Places API (New)).
// Server only.

import { callJson } from "@/lib/leads/apis/http";
import type { Listing } from "../types";
import type { Cost } from "../cost";

const PLACES = "https://places.googleapis.com/v1";

const key = () => process.env.GOOGLE_MAPS_SERVER_KEY ?? "";
export const placesReady = () => Boolean(key());

/** Everything the listing check reads. Rating, phone and hours make it Enterprise. */
const FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "addressComponents",
  "location",
  "types",
  "primaryType",
  "businessStatus",
  "rating",
  "userRatingCount",
  "nationalPhoneNumber",
  "websiteUri",
  "googleMapsUri",
  "regularOpeningHours",
  "photos",
  "pureServiceAreaBusiness",
];

type GooglePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: {
    longText?: string;
    shortText?: string;
    types?: string[];
  }[];
  location?: { latitude: number; longitude: number };
  types?: string[];
  primaryType?: string;
  businessStatus?: string;
  rating?: number;
  userRatingCount?: number;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[]; periods?: unknown[] };
  photos?: unknown[];
  pureServiceAreaBusiness?: boolean;
};

function headers(fields: string[]) {
  return {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": key(),
    "X-Goog-FieldMask": fields.map((f) => `places.${f}`).join(","),
  };
}

function toListing(p: GooglePlace): Listing {
  const parts = p.addressComponents ?? [];
  const pick = (type: string) => parts.find((c) => c.types?.includes(type));
  const city =
    pick("locality") ??
    pick("postal_town") ??
    pick("sublocality") ??
    pick("administrative_area_level_3");
  const state = pick("administrative_area_level_1");
  return {
    placeId: p.id,
    name: p.displayName?.text?.trim() ?? "",
    address: p.formattedAddress?.replace(/,\s*(USA|United States)$/i, ""),
    city: city?.longText,
    state: state?.longText,
    stateCode: state?.shortText,
    lat: p.location?.latitude,
    lng: p.location?.longitude,
    rating: p.rating,
    reviews: p.userRatingCount ?? 0,
    photos: p.photos?.length ?? 0,
    hours: Boolean(
      p.regularOpeningHours?.weekdayDescriptions?.length ||
      p.regularOpeningHours?.periods?.length,
    ),
    website: p.websiteUri,
    phone: p.nationalPhoneNumber,
    mapsUrl: p.googleMapsUri,
    serviceArea: p.pureServiceAreaBusiness,
    status: p.businessStatus,
    types: [
      ...new Set([p.primaryType, ...(p.types ?? [])].filter(Boolean)),
    ] as string[],
  };
}

/**
 * Listings matching some text (a business name, a domain, a phone number),
 * with everything the audit needs. Car services often have no storefront,
 * and Google leaves those out unless asked, so they're asked for.
 */
export async function findListings(
  text: string,
  options: { near?: { lat: number; lng: number }; size?: number; cost?: Cost },
): Promise<Listing[]> {
  if (!placesReady()) return [];
  const res = await callJson<{ places?: GooglePlace[] }>(
    "Google search",
    `${PLACES}/places:searchText`,
    {
      method: "POST",
      headers: headers(FIELDS),
      timeout: 15_000,
      body: JSON.stringify({
        textQuery: text.slice(0, 200),
        pageSize: options.size ?? 5,
        includePureServiceAreaBusinesses: true,
        ...(options.near
          ? {
              locationBias: {
                circle: {
                  center: {
                    latitude: options.near.lat,
                    longitude: options.near.lng,
                  },
                  radius: 50_000,
                },
              },
            }
          : {}),
      }),
    },
  );
  options.cost?.add("places_search");
  return (res.places ?? []).map(toListing).filter((l) => l.placeId && l.name);
}

/**
 * One listing by its place ID (Place Details Enterprise, $20 per 1,000):
 * for a re-run after Google's details were cleared. Undefined when Google
 * no longer has it.
 */
export async function listingById(placeId: string, cost?: Cost) {
  if (!placesReady()) return undefined;
  try {
    const p = await callJson<GooglePlace>(
      "Google details",
      `${PLACES}/places/${encodeURIComponent(placeId)}`,
      {
        timeout: 15_000,
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key(),
          "X-Goog-FieldMask": FIELDS.join(","),
        },
      },
    );
    cost?.addMicros(20_000);
    return p?.id ? toListing(p) : undefined;
  } catch {
    return undefined;
  }
}
