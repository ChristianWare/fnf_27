// GET /api/market/areas: the areas the Leads Tool covers, with what it has
// in each right now, for "Leads in your city" on the leads page. Straight
// from our own database: no Google calls, so it costs nothing to show.

import { countsFromTool, type Peek } from "@/lib/market/peek";
import { openAreas } from "@/lib/leads/workspace";

type Area = { id: string; name: string } & Omit<Peek, "city" | "area" | "from">;

let kept: { at: number; areas: Area[] } | undefined;
const KEEP_MS = 10 * 60 * 1000;

export async function GET() {
  if (!kept || Date.now() - kept.at > KEEP_MS) {
    const areas = (await openAreas()).filter((a) => a.ready);
    kept = {
      at: Date.now(),
      areas: await Promise.all(
        areas.map(async (a) => ({
          id: a.id,
          name: a.name,
          ...(await countsFromTool(a.id)),
        })),
      ),
    };
  }
  return Response.json(
    { areas: kept.areas },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
