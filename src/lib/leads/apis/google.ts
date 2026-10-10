// Google: finding places (IDs only, which is free), their details (kept
// at most 30 days), photos, drive times and cities. Server only.
//
// Uses GOOGLE_MAPS_SERVER_KEY with the Places API (New) and the Routes API
// turned on.

import { ApiError, call, callJson } from "./http";
import { track, type Who } from "../usage";

const PLACES = "https://places.googleapis.com/v1";

const key = () => process.env.GOOGLE_MAPS_SERVER_KEY ?? "";
export const googleReady = () => Boolean(key());

function headers(fields: string) {
  if (!key())
    throw new ApiError("Google", 0, "GOOGLE_MAPS_SERVER_KEY isn't set.");
  return {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": key(),
    "X-Goog-FieldMask": fields,
  };
}

export type Box = { south: number; west: number; north: number; east: number };

/**
 * Place IDs for a search in a box, up to `pages` pages of 20. `full` says
 * every page came back full, so there are probably more: search smaller.
 */
export async function searchIds(
  query: { text: string; type?: string; box: Box; pages: number },
  who: Who,
) {
  const ids: string[] = [];
  let pageToken: string | undefined;
  let pages = 0;
  let lastCount = 0;
  do {
    const body = {
      textQuery: query.text,
      ...(query.type ? { includedType: query.type } : {}),
      pageSize: 20,
      locationRestriction: {
        rectangle: {
          low: { latitude: query.box.south, longitude: query.box.west },
          high: { latitude: query.box.north, longitude: query.box.east },
        },
      },
      ...(pageToken ? { pageToken } : {}),
    };
    const res = await callJson<{
      places?: { id: string }[];
      nextPageToken?: string;
    }>("Google search", `${PLACES}/places:searchText`, {
      method: "POST",
      headers: headers("places.id,nextPageToken"),
      body: JSON.stringify(body),
    });
    track("places_search", who);
    const found = res.places ?? [];
    lastCount = found.length;
    ids.push(...found.map((p) => p.id));
    pageToken = res.nextPageToken;
    pages++;
  } while (pageToken && pages < query.pages);
  return {
    ids,
    full: pages === query.pages && lastCount === 20 && !!pageToken,
  };
}

/** The first place matching some text, near a point (free: IDs only). */
export async function findPlaceId(
  text: string,
  near: { lat: number; lng: number } | undefined,
  who: Who,
) {
  const res = await callJson<{ places?: { id: string }[] }>(
    "Google search",
    `${PLACES}/places:searchText`,
    {
      method: "POST",
      headers: headers("places.id"),
      body: JSON.stringify({
        textQuery: text,
        pageSize: 1,
        ...(near
          ? {
              locationBias: {
                circle: {
                  center: { latitude: near.lat, longitude: near.lng },
                  radius: 50_000,
                },
              },
            }
          : {}),
      }),
    },
  );
  track("places_search", who);
  return res.places?.[0]?.id;
}

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
  photos?: { name?: string }[];
};

export type PlaceDetails = {
  id: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  rating?: number;
  reviews?: number;
  phone?: string;
  website?: string;
  types: string[];
  closed: boolean;
  /** How many photos Google has of it (up to 10). */
  photoCount: number;
};

function cityOf(place: GooglePlace) {
  const parts = place.addressComponents ?? [];
  const pick = (type: string) =>
    parts.find((p) => p.types?.includes(type))?.longText;
  return (
    pick("locality") ??
    pick("postal_town") ??
    pick("sublocality") ??
    pick("administrative_area_level_3") ??
    ""
  );
}

const shortAddress = (address = "") =>
  address.replace(/,\s*(USA|United States)$/i, "").trim();

/** A place's details: undefined when Google no longer has it. */
export async function placeDetails(
  id: string,
  who: Who,
): Promise<PlaceDetails | undefined> {
  // "photos" is in the free IDs-only tier, so asking for it here costs
  // nothing more: it tells us how many photos there are.
  const fields =
    "id,displayName,formattedAddress,addressComponents,location,types,primaryType,businessStatus,rating,userRatingCount,nationalPhoneNumber,websiteUri,photos";
  try {
    const p = await callJson<GooglePlace>(
      "Google details",
      `${PLACES}/places/${encodeURIComponent(id)}`,
      { headers: headers(fields) },
    );
    track("places_details", who);
    if (!p.location) return undefined;
    return {
      id: p.id ?? id,
      name: p.displayName?.text ?? "",
      address: shortAddress(p.formattedAddress),
      city: cityOf(p),
      lat: p.location.latitude,
      lng: p.location.longitude,
      rating: p.rating,
      reviews: p.userRatingCount,
      phone: p.nationalPhoneNumber,
      website: p.websiteUri,
      types: [
        ...new Set([p.primaryType, ...(p.types ?? [])].filter(Boolean)),
      ] as string[],
      closed: p.businessStatus === "CLOSED_PERMANENTLY",
      photoCount: p.photos?.length ?? 0,
    };
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 400)
    )
      return undefined;
    throw error;
  }
}

/**
 * A venue: where it is, its rating, its phone and how many photos it has
 * (Enterprise, $20/1,000, looked up once a month per event). Undefined when
 * Google no longer has the place.
 */
export async function venueDetails(id: string, who: Who) {
  let p: GooglePlace;
  try {
    p = await callJson<GooglePlace>(
      "Google details",
      `${PLACES}/places/${encodeURIComponent(id)}`,
      {
        headers: headers(
          "id,formattedAddress,addressComponents,location,rating,userRatingCount,nationalPhoneNumber,photos",
        ),
      },
    );
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 400)
    )
      return undefined;
    throw error;
  }
  track("places_details", who);
  if (!p.location) return undefined;
  return {
    address: shortAddress(p.formattedAddress),
    city: cityOf(p),
    lat: p.location.latitude,
    lng: p.location.longitude,
    rating: p.rating,
    reviews: p.userRatingCount,
    phone: p.nationalPhoneNumber,
    photos: p.photos?.length ?? 0,
  };
}

/* ── A client's own listing, for their Growth page ── */

export type Listing = {
  id: string;
  name: string;
  address?: string;
  rating?: number;
  reviews: number;
  mapsUrl?: string;
};

const LISTING_FIELDS =
  "id,displayName,formattedAddress,rating,userRatingCount,googleMapsUri";

const toListing = (p: GooglePlace): Listing => ({
  id: p.id,
  name: p.displayName?.text ?? "",
  address: p.formattedAddress,
  rating: p.rating,
  reviews: p.userRatingCount ?? 0,
  mapsUrl: p.googleMapsUri,
});

/** Listings matching some text, to pick a client's own (Enterprise). */
export async function findListings(text: string, who: Who) {
  const res = await callJson<{ places?: GooglePlace[] }>(
    "Google search",
    `${PLACES}/places:searchText`,
    {
      method: "POST",
      headers: headers(
        LISTING_FIELDS.split(",")
          .map((f) => `places.${f}`)
          .join(","),
      ),
      body: JSON.stringify({ textQuery: text, pageSize: 5 }),
    },
  );
  track("places_listing", who);
  return (res.places ?? []).map(toListing);
}

/**
 * A listing's rating and review count (Enterprise, $20/1,000, once a
 * night per client). Undefined when Google no longer has it.
 */
export async function listingDetails(id: string, who: Who) {
  let p: GooglePlace;
  try {
    p = await callJson<GooglePlace>(
      "Google details",
      `${PLACES}/places/${encodeURIComponent(id)}`,
      { headers: headers(LISTING_FIELDS) },
    );
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 || error.status === 400)
    )
      return undefined;
    throw error;
  }
  track("places_details", who);
  return toListing(p);
}

export type GooglePhoto = { name: string; author?: string; authorUrl?: string };

/** A place's photos (up to 10), and who took each one (free: IDs only). */
export async function placePhotos(id: string): Promise<GooglePhoto[]> {
  const p = await callJson<{
    photos?: {
      name: string;
      authorAttributions?: { displayName?: string; uri?: string }[];
    }[];
  }>("Google photos", `${PLACES}/places/${encodeURIComponent(id)}`, {
    headers: headers("photos"),
  });
  return (p.photos ?? []).map((photo) => ({
    name: photo.name,
    author: photo.authorAttributions?.[0]?.displayName,
    authorUrl: photo.authorAttributions?.[0]?.uri,
  }));
}

/** The name of a place's first photo, and who took it (free: IDs only). */
export async function firstPhoto(id: string) {
  return (await placePhotos(id))[0];
}

/** The photo itself, at most `width` pixels wide ($7 per 1,000). */
export async function photoImage(name: string, width: number, who: Who) {
  if (!key())
    throw new ApiError("Google", 0, "GOOGLE_MAPS_SERVER_KEY isn't set.");
  const res = await call(
    `${PLACES}/${name}/media?maxWidthPx=${width}&key=${encodeURIComponent(key())}`,
    { redirect: "follow", timeout: 10_000 },
  );
  track("places_photo", who);
  if (!res.ok) {
    await res.body?.cancel().catch(() => undefined);
    throw new ApiError(
      "Google photos",
      res.status,
      `Photo said ${res.status}.`,
    );
  }
  return res;
}

/** Driving time and distance between two points, without traffic. */
export async function driveTime(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
  who: Who,
) {
  const point = (p: { lat: number; lng: number }) => ({
    location: { latLng: { latitude: p.lat, longitude: p.lng } },
  });
  const res = await callJson<{
    routes?: { duration?: string; distanceMeters?: number }[];
  }>(
    "Google routes",
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: headers("routes.duration,routes.distanceMeters"),
      body: JSON.stringify({
        origin: point(from),
        destination: point(to),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
      }),
    },
  );
  track("routes", who);
  const route = res.routes?.[0];
  if (!route?.duration) return undefined;
  const seconds = parseInt(route.duration, 10);
  return {
    minutes: Math.max(1, Math.round(seconds / 60)),
    miles: Math.max(1, Math.round((route.distanceMeters ?? 0) / 1609.34)),
  };
}

/** A city by name ("Tucson, AZ"): its name and where it is. */
export async function findCity(text: string, who: Who) {
  const res = await callJson<{ places?: { id: string }[] }>(
    "Google search",
    `${PLACES}/places:searchText`,
    {
      method: "POST",
      headers: headers("places.id"),
      body: JSON.stringify({
        textQuery: text,
        includedType: "locality",
        pageSize: 1,
      }),
    },
  );
  track("places_search", who);
  const id = res.places?.[0]?.id;
  if (!id) return undefined;
  const p = await callJson<GooglePlace>(
    "Google details",
    `${PLACES}/places/${encodeURIComponent(id)}`,
    { headers: headers("id,addressComponents,location") },
  );
  track("places_basic", who);
  if (!p.location) return undefined;
  const parts = p.addressComponents ?? [];
  const state = parts.find((c) =>
    c.types?.includes("administrative_area_level_1"),
  )?.shortText;
  const city = cityOf(p) || text.split(",")[0].trim();
  return {
    city,
    state: state ?? "",
    lat: p.location.latitude,
    lng: p.location.longitude,
  };
}
