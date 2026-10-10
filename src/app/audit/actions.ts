"use server";

// Asking for the free website audit: the request is emailed to the studio
// inbox with the operator as reply-to, and we send the audit back by hand
// (see lib/audit.ts). Bots are turned away the same way as on the contact
// form: Cloudflare's box, the trap field, the stamp that says how long the
// form was open, and a limit per address.

import { tooMany } from "@/lib/auth/accounts";
import { AUDIT_CHECKS, cleanUrl, hostOf, TURNAROUND } from "@/lib/audit";
import { STUDIO } from "@/lib/server/config";
import { render, sendEmail } from "@/lib/server/email";
import {
  botReason,
  botText,
  clientIp,
  countUrls,
  STAMP_FIELD,
  TRAP_FIELD,
} from "@/lib/server/spam";
import { humanCheck } from "@/lib/server/turnstile";

export type AuditField = "name" | "website" | "email";

export type AuditRequestResult =
  { ok: true } | { ok: false; field?: AuditField; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestAudit(
  formData: FormData,
): Promise<AuditRequestResult> {
  const get = (key: string) =>
    String(formData.get(key) ?? "")
      .replace(/\s+/g, " ")
      .trim();
  const name = get("name").slice(0, 120);
  const website = cleanUrl(get("website"));
  const email = get("email").toLowerCase().slice(0, 200);
  const note = String(formData.get("note") ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, 2000);

  if (name.length < 2)
    return { ok: false, field: "name", error: "Enter your name." };
  if (!website)
    return {
      ok: false,
      field: "website",
      error: "Enter your website, like www.yourcompany.com.",
    };
  if (!EMAIL_RE.test(email))
    return {
      ok: false,
      field: "email",
      error: "Enter the email address to send the audit to.",
    };

  // A bot in the trap is told "sent", with nothing sent. The note isn't
  // held to the contact form's link rules: a link to a Google listing is
  // a fair thing to put there. A pile of them isn't.
  const bot = botReason({
    trap: get(TRAP_FIELD),
    stamp: get(STAMP_FIELD) || undefined,
    names: [name],
    message: "",
  });
  if (bot === "trap") {
    console.warn(`[audit] bot turned away: ${email}`);
    return { ok: true };
  }
  if (bot) return { ok: false, error: botText(bot) };
  if (countUrls(note) >= 3) return { ok: false, error: botText("links") };

  const ip = await clientIp();
  if (await tooMany(`audit-ip:${ip}`, 5, 60))
    return {
      ok: false,
      error: `That's a few requests in a row. Give it an hour, or email ${STUDIO.inbox} directly.`,
    };
  const human = await humanCheck(get("cf-turnstile-response"), ip);
  if (!human)
    return {
      ok: false,
      error: "Please tick the box to show you're not a robot.",
    };

  const first = name.split(" ")[0];
  const host = hostOf(website);
  const { html, text } = render({
    eyebrow: "Audit request",
    heading: `${name} asked for an audit of ${host}`,
    preheader: `They were told within ${TURNAROUND}.`,
    paragraphs: [
      `${first} asked for the free website audit from the audit page. They were told it comes back by email within ${TURNAROUND}.`,
    ],
    ...(note ? { quote: { text: note, by: name } } : {}),
    details: [
      ["Name", name],
      ["Email", email],
      ["Website", website],
    ],
    button: { label: `Open ${host}`, href: website },
    after: [
      `The six checks: ${AUDIT_CHECKS.join(", ")}.`,
      `Replying to this email goes straight to ${first}.`,
    ],
  });
  const sent = await sendEmail({
    to: STUDIO.inbox,
    subject: `Audit request: ${host} (${name})`,
    html,
    text,
    replyTo: `${name} <${email}>`,
  });
  if (!sent.ok) {
    console.error(`[audit] couldn't send ${email}'s request: ${sent.error}`);
    return {
      ok: false,
      error: `We couldn't send that just now. Email ${STUDIO.inbox} with your website and we'll take it from there.`,
    };
  }
  return { ok: true };
}
