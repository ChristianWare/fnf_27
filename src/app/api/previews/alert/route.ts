// POST /api/previews/alert: a preview (fnf-demos) telling us what the
// prospect just did. Emails the admins who want it (Settings →
// Notifications), texts the studio phone on a first open, and adds a line
// to the prospect's activity.
//
// fnf-demos calls it with "Authorization: Bearer <DEMO_PLATFORM_SECRET>".

import { timingSafeEqual } from "node:crypto";
import { alertAdmins } from "@/lib/server/notify";
import { url } from "@/lib/server/config";
import { logActivity } from "@/lib/prospects/store";
import { alertMessage, readAlert } from "@/lib/demos/alerts";
import { secret as platformSecret } from "@/lib/demos/platform";

function authorized(request: Request) {
  const secret = platformSecret();
  if (secret.length < 16) return false;
  const given = Buffer.from((request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim());
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  const alert = readAlert(await request.json().catch(() => null));
  if (!alert) return Response.json({ error: "Not an alert." }, { status: 400 });

  const message = alertMessage(alert);
  const page = alert.ref ? url(`/admin/prospects/${alert.ref}`) : url("/admin/demos");

  await alertAdmins(
    "preview",
    message.subject,
    {
      eyebrow: message.eyebrow,
      heading: message.heading,
      paragraphs: message.paragraphs,
      button: { label: alert.ref ? "Open their page" : "Open Previews", href: page },
    },
    message.sms,
  );

  if (alert.ref) {
    await logActivity(alert.ref, "NOTE", message.activity).catch(() => {
      // The prospect was deleted: the email is enough.
    });
  }
  return Response.json({ ok: true });
}
