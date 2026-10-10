// GET /api/growth/searches?from=YYYY-MM-DD&to=YYYY-MM-DD: the searches
// that brought a client the most visitors between two days, and how each
// moved against the same number of days before. For their Growth page, so
// changing the dates there never waits on anything else.
//
// Only for the signed-in client's own site (or the client an admin is
// viewing as).

import { getSessionUser, getViewAs } from "@/lib/auth/dal";
import { daysFrom, isDay } from "@/lib/growth/dates";
import { topSearches } from "@/lib/growth/load";

const answer = (status: number, body: object) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return answer(401, { error: "Sign in again." });
  const clientId =
    user.role === "ADMIN" ? await getViewAs() : (user.clientId ?? undefined);
  if (!clientId) return answer(404, { error: "No business to show." });

  const params = new URL(request.url).searchParams;
  const from = params.get("from");
  const to = params.get("to");
  if (!isDay(from) || !isDay(to) || from > to || daysFrom(from, to) > 800)
    return answer(400, { error: "Pick two days, the first one first." });

  try {
    return answer(200, { searches: await topSearches(clientId, from, to) });
  } catch (error) {
    console.error("[growth] searches failed:", error);
    return answer(500, { error: "The searches didn't load. Try again." });
  }
}
