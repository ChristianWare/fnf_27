// GET /api/market/city?place=<id>&session=<uuid>: where a city picked from
// the suggestions is, for the Leads Tool's city fields. Ends the Google
// session the suggestions started.

import {
  addressOf,
  allow,
  cityDetails,
  isPlaceId,
  isSessionToken,
} from "@/lib/market/peek";
import { milesBetween } from "@/lib/leads/advice";
import { openAreas } from "@/lib/leads/workspace";
import { AREA_MILES } from "@/lib/leads/areas";
import { flushUsage } from "@/lib/leads/usage";

const answer = (status: number, body: object) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const place = params.get("place");
  const session = params.get("session");
  if (!isPlaceId(place))
    return answer(400, { error: "Pick a city from the list." });
  if (!allow(`city:${addressOf(request)}`, 20))
    return answer(429, { error: "Slow down a little and try again." });
  try {
    const found = await cityDetails(
      place!,
      isSessionToken(session) ? session! : undefined,
    );
    if (!found?.name)
      return answer(404, {
        error: "We couldn't find that city. Pick another.",
      });
    const city = {
      name: found.name,
      state: found.state,
      text: found.state ? `${found.name}, ${found.state}` : found.name,
      lat: found.lat,
      lng: found.lng,
    };
    // A Leads Tool field: which of our areas in that state it's in, or the
    // nearest one when it's outside them all.
    const state = (params.get("state") ?? "").toUpperCase().slice(0, 2);
    if (!state) return answer(200, { city });
    if (found.state.toUpperCase() !== state)
      return answer(422, { error: "Pick a city in that state." });
    const nearest = (await openAreas())
      .filter((a) => a.state === state)
      .map((a) => ({
        id: a.id,
        name: a.name,
        miles: Math.round(milesBetween(a, found)),
      }))
      .sort((x, y) => x.miles - y.miles)[0];
    return answer(200, {
      city: {
        ...city,
        area: nearest
          ? { ...nearest, covered: nearest.miles <= AREA_MILES }
          : undefined,
      },
    });
  } catch (error) {
    console.error("[market] city lookup failed:", error);
    return answer(503, {
      error: "City lookups are taking a break. Try again in a minute.",
    });
  } finally {
    await flushUsage();
  }
}
