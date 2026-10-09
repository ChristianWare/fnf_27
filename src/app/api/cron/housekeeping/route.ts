// GET /api/cron/housekeeping: once a day, at 7am Arizona time (see
// vercel.json). Emails each admin who wants it a summary of what's waiting,
// and tidies up: sign-ups that never confirmed their email, old sign-in
// counters, used links and old Stripe event ids.
//
// Vercel calls it with "Authorization: Bearer <CRON_SECRET>".

import { lt } from "drizzle-orm";
import { db, schema } from "@/db";
import { dropAbandonedSignUps } from "@/lib/auth/accounts";
import { loadClients } from "@/lib/data/clients";
import { adminQueue } from "@/lib/admin/derive";
import { alertAdmins } from "@/lib/server/notify";
import { url } from "@/lib/server/config";
import { fmtDay } from "@/lib/dashboard/format";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const now = new Date();
  const report: Record<string, number> = {};

  // What's waiting on the studio.
  const clients = await loadClients({ archived: false });
  const queue = adminQueue(clients, now.toISOString());
  report.waiting = queue.length;
  if (queue.length) {
    await alertAdmins(
      "digest",
      `${queue.length} thing${queue.length === 1 ? "" : "s"} waiting on you`,
      {
        eyebrow: fmtDay(now),
        heading: `Good morning. ${queue.length} thing${queue.length === 1 ? " needs" : "s need"} you today`,
        paragraphs: queue
          .slice(0, 12)
          .map((item) => `• ${item.title}: ${item.detail}`),
        button: { label: "Open the admin", href: url("/admin") },
        ...(queue.length > 12
          ? { after: [`And ${queue.length - 12} more.`] }
          : {}),
      },
    );
  }

  // Tidying up.
  report.droppedSignUps = await dropAbandonedSignUps(14);
  const day = 86_400_000;
  await db
    .delete(schema.authAttempts)
    .where(lt(schema.authAttempts.windowStart, new Date(now.getTime() - day)));
  await db
    .delete(schema.authTokens)
    .where(lt(schema.authTokens.expiresAt, new Date(now.getTime() - 7 * day)));
  await db
    .delete(schema.stripeEvents)
    .where(
      lt(schema.stripeEvents.receivedAt, new Date(now.getTime() - 90 * day)),
    );

  return Response.json({ ok: true, ...report });
}
