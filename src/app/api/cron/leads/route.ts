// GET /api/cron/leads: the nightly runs, called by Vercel every hour from
// 1 to 5 AM Arizona time (see vercel.json). Each call works on every
// market with someone using it for up to four minutes, and
// picks up where the last call stopped.
//
// Vercel calls it with "Authorization: Bearer <CRON_SECRET>".

import { nightlyTick } from "@/lib/leads/runs";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const budget = Number(process.env.LEADS_RUN_BUDGET_MS) || 240_000;
  const reports = await nightlyTick(Math.min(budget, 270_000));
  return Response.json({ ok: true, markets: reports });
}
