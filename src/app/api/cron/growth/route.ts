// GET /api/cron/growth: once a night, at midnight Arizona time (see
// vercel.json). Each live site's visitors from Google (Search Console) and
// its rating and reviews (Google Maps), for their Growth page.
//
// Vercel calls it with "Authorization: Bearer <CRON_SECRET>".

import { nightlyGrowth } from "@/lib/growth/sync";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const report = await nightlyGrowth(240_000);
  return Response.json({ ok: true, ...report });
}
