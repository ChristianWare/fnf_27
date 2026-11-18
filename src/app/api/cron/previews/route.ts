// GET /api/cron/previews: 7am Arizona time (see vercel.json). Emails each
// admin who wants it (Settings → Notifications → "A morning previews
// summary") what prospects did in their previews since yesterday, the
// previews ending in the next 3 days, unopened ones and ones that ended.
//
// Vercel calls it with "Authorization: Bearer <CRON_SECRET>".

import { alertAdmins } from "@/lib/server/notify";
import { listPlatformDemos, platformReady } from "@/lib/demos/platform";
import { previewsSummary } from "@/lib/demos/summary";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!platformReady()) return Response.json({ ok: true, skipped: "The demo platform isn't connected." });

  const now = new Date();
  const demos = await listPlatformDemos(new Date(now.getTime() - 86_400_000));
  const summary = previewsSummary(demos, now);
  if (!summary) return Response.json({ ok: true, sent: false });

  await alertAdmins("previews", summary.subject, summary.content);
  return Response.json({ ok: true, sent: true, ...summary.counts });
}
