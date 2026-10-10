"use server";

// The contact form: a message from the site, emailed to the studio inbox
// with the sender as reply-to, so answering is one click. Bots are turned
// away before anything is sent: Cloudflare's box, the trap field, the
// stamp that says how long the form was open, a look at what was typed,
// and a limit per address.

import { tooMany } from "@/lib/auth/accounts";
import { STUDIO } from "@/lib/server/config";
import { render, sendEmail } from "@/lib/server/email";
import {
  botReason,
  botText,
  clientIp,
  STAMP_FIELD,
  TRAP_FIELD,
} from "@/lib/server/spam";
import { humanCheck } from "@/lib/server/turnstile";

export type InquiryResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendInquiry(formData: FormData): Promise<InquiryResult> {
  const get = (key: string) =>
    String(formData.get(key) ?? "")
      .replace(/\s+/g, " ")
      .trim();
  const name = get("name").slice(0, 120);
  const email = get("email").toLowerCase().slice(0, 200);
  const company = get("company").slice(0, 160);
  const role = get("role").slice(0, 80);
  const message = String(formData.get("message") ?? "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, 4000);

  if (name.length < 2) return { ok: false, error: "Enter your name." };
  if (!EMAIL_RE.test(email))
    return { ok: false, error: "Enter a valid email address." };
  if (message.length < 10)
    return { ok: false, error: "Tell us a little about what you need." };

  // A bot in the trap is told "sent", with nothing sent, so it learns
  // nothing. The other catches get a plain answer: a person can trip them
  // too, and trying again puts it right.
  const bot = botReason({
    trap: get(TRAP_FIELD),
    stamp: get(STAMP_FIELD) || undefined,
    names: [name, company, role],
    message,
  });
  if (bot === "trap") {
    console.warn(`[contact] bot turned away: ${email}`);
    return { ok: true };
  }
  if (bot) return { ok: false, error: botText(bot) };

  const ip = await clientIp();
  if (await tooMany(`contact-ip:${ip}`, 5, 60))
    return {
      ok: false,
      error: `That's a few messages in a row. Give it an hour, or email ${STUDIO.inbox} directly.`,
    };
  const human = await humanCheck(get("cf-turnstile-response"), ip);
  if (!human)
    return {
      ok: false,
      error: "Please tick the box to show you're not a robot.",
    };

  const first = name.split(" ")[0];
  const who = company ? `${name}, ${company}` : name;
  const { html, text } = render({
    eyebrow: "Website inquiry",
    heading: `New inquiry from ${who}`,
    preheader: message.slice(0, 120),
    paragraphs: [`${first} wrote, from the contact form:`],
    quote: { text: message, by: who },
    details: [
      ["Name", name],
      ["Email", email],
      ...(company ? [["Company", company] as [string, string]] : []),
      ...(role ? [["Role", role] as [string, string]] : []),
    ],
    button: {
      label: `Reply to ${first}`,
      href: `mailto:${email}?subject=${encodeURIComponent(`Re: your note to Fonts & Footers`)}`,
    },
    after: ["Replying to this email goes straight to them."],
  });
  const sent = await sendEmail({
    to: STUDIO.inbox,
    subject: `New inquiry from ${who}`,
    html,
    text,
    replyTo: `${name} <${email}>`,
  });
  if (!sent.ok) {
    console.error(`[contact] couldn't send ${email}'s message: ${sent.error}`);
    return {
      ok: false,
      error: `We couldn't send that just now. Email ${STUDIO.inbox} and we'll pick it up.`,
    };
  }
  return { ok: true };
}
