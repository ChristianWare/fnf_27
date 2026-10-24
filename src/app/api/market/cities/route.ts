// GET /api/market/cities?q=pho&session=<uuid>: US cities matching what's
// been typed, for "Leads in your city" on the leads page. From Google,
// through our key, so the key never leaves the server. The session token
// ties the suggestions to the lookup that follows, the way Google bills.

import {
  addressOf,
  allow,
  isSessionToken,
  suggestCities,
} from "@/lib/market/peek";
import { flushUsage } from "@/lib/leads/usage";
import { AREA_MILES, boxAround, openAreas } from "@/lib/leads/workspace";

const answer = (status: number, body: object) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = (params.get("q") ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const session = params.get("session");
  // The Leads Tool's city fields: only cities in that area.
  const areaId = params.get("area");
  if (q.length < 2) return answer(200, { cities: [] });
  if (!allow(`cities:${addressOf(request)}`, 40))
    return answer(429, { error: "Slow down a little and try again." });
  try {
    const area = areaId
      ? (await openAreas()).find((a) => a.id === areaId)
      : undefined;
    if (areaId && !area) return answer(200, { cities: [] });
    const cities = await suggestCities(
      q,
      isSessionToken(session) ? session! : undefined,
      area ? boxAround(area, AREA_MILES) : undefined,
    );
    return answer(200, { cities });
  } catch (error) {
    console.error("[market] city suggestions failed:", error);
    return answer(503, { error: "City suggestions are taking a break." });
  } finally {
    await flushUsage();
  }
}
