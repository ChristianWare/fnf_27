// GET /api/cron/leads: the nightly runs, called by Vercel every hour from
// 1 to 5 AM Arizona time (see vercel.json). Each call works on every
// market with someone using it for up to four minutes; a market that
// isn't done carries on in rounds of its own (see lib/leads/kick).
//
// Vercel calls it with "Authorization: Bearer <CRON_SECRET>".

import { kickMarket } from "@/lib/leads/kick";
import { nightlyTick } from "@/lib/leads/runs";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const budget = Number(process.env.LEADS_RUN_BUDGET_MS) || 240_000;
  const reports = await nightlyTick(Math.min(budget, 270_000));
  // A market that ran out of time carries on in rounds of its own, rather
  // than waiting for the next hour's call.
  for (const report of reports)
    if (report.status === "RUNNING") await kickMarket(report.marketId);
  return Response.json({ ok: true, markets: reports });
}
