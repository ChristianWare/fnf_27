// GET /api/leads/continue?market=<id>: the next round of a market's run.
// Called by the round before it (see lib/leads/kick), with the cron secret.
// It answers at once and does the round after, so the caller can finish.

import { after } from "next/server";
import { round } from "@/lib/leads/kick";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorized", { status: 401 });
  const marketId = new URL(request.url).searchParams.get("market") ?? "";
  if (!/^[a-z0-9_-]{1,64}$/i.test(marketId))
    return new Response("Which market?", { status: 400 });
  after(() => round(marketId));
  return Response.json({ ok: true }, { status: 202 });
}
