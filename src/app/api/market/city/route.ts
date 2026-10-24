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
  if (!isPlaceId(place)) return answer(400, { error: "Pick a city from the list." });
  if (!allow(`city:${addressOf(request)}`, 20))
    return answer(429, { error: "Slow down a little and try again." });
  try {
    const found = await cityDetails(
      place!,
      isSessionToken(session) ? session! : undefined,
    );
    if (!found?.name)
      return answer(404, { error: "We couldn't find that city. Pick another." });
    return answer(200, {
      city: {
        name: found.name,
        state: found.state,
        text: found.state ? `${found.name}, ${found.state}` : found.name,
        lat: found.lat,
        lng: found.lng,
      },
    });
  } catch (error) {
    console.error("[market] city lookup failed:", error);
    return answer(503, { error: "City lookups are taking a break. Try again in a minute." });
  } finally {
    await flushUsage();
  }
}
