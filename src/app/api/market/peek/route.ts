// GET /api/market/peek?place=<placeId>&session=<uuid>: what the Leads Tool
// would find around a city, for "Leads in your city" on the leads page.
// The place ID comes from the city suggestions, so only a real city gets
// this far.

import {
  addressOf,
  allow,
  isPlaceId,
  isSessionToken,
  peekCity,
} from "@/lib/market/peek";
import { ApiError } from "@/lib/leads/apis/http";
import { flushUsage } from "@/lib/leads/usage";

export const maxDuration = 60;

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
  if (!allow(`peek:${addressOf(request)}`, 8))
    return answer(429, { error: "Slow down a little and try again." });
  try {
    return answer(200, {
      market: await peekCity(
        place!,
        isSessionToken(session) ? session! : undefined,
      ),
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404)
      return answer(404, { error: "Pick a city from the list." });
    console.error("[market] city lookup failed:", error);
    return answer(503, {
      error: "The city check is taking a break. Try again in a minute.",
    });
  } finally {
    await flushUsage();
  }
}
