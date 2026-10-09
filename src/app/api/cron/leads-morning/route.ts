// GET /api/cron/leads-morning: 6 AM Arizona time (see vercel.json). Ends
// trials that ran out without a card, sends the trial reminders (three
// days before, and on the day), the morning leads email, and clears out
// what's past keeping.
//
// Vercel calls it with "Authorization: Bearer <CRON_SECRET>".

import { endLapsedTrials } from "@/lib/billing/leads";
import {
  clearOldLeads,
  sendMorningEmails,
  sendTrialReminders,
} from "@/lib/leads/digest";
import { tidyGoogleData } from "@/lib/leads/runs";

export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const now = new Date();
  const report: Record<string, number> = {};
  report.trialsEnded = await endLapsedTrials(now);
  report.reminders = await sendTrialReminders(now);
  report.morningEmails = await sendMorningEmails(now);
  report.cleared = await clearOldLeads(now);
  await tidyGoogleData();
  return Response.json({ ok: true, ...report });
}
