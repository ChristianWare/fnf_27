// GET /api/growth/visits?from=YYYY-MM-DD&to=YYYY-MM-DD: the sites and apps
// that sent a client the most visitors between two days, and the pages
// those visitors landed on. For their Growth page, so changing the dates
// there never waits on anything else.
//
// Only for the signed-in client's own site (or the client an admin is
// viewing as).

import { getSessionUser, getViewAs } from "@/lib/auth/dal";
import { daysFrom, isDay } from "@/lib/growth/dates";
import { topVisits } from "@/lib/growth/load";

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
  if (!isDay(from) || !isDay(to) || from > to || daysFrom(from, to) > 4000)
    return answer(400, { error: "Pick two days, the first one first." });

  try {
    return answer(200, await topVisits(clientId, from, to));
  } catch (error) {
    console.error("[growth] sources failed:", error);
    return answer(500, { error: "These didn't load. Try again." });
  }
}
