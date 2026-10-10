"use server";

// The footer's newsletter sign-up. Mailchimp asks every new person to
// confirm by email, which keeps bots and pranks off the list; the trap
// field and a limit per address stop the noise before it gets that far.

import { tooMany } from "@/lib/auth/accounts";
import { STUDIO } from "@/lib/server/config";
import { joinList } from "@/lib/server/mailchimp";
import { clientIp, TRAP_FIELD } from "@/lib/server/spam";

export type NewsletterResult = {
  ok: boolean;
  /** Said under the form. */
  message: string;
  /** A new sign-up, waiting on the confirmation email. */
  joined?: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONFIRM =
  "Almost done: check your inbox and confirm, and you're on the list.";

export async function joinNewsletter(
  formData: FormData,
): Promise<NewsletterResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 200);
  if (!EMAIL_RE.test(email))
    return { ok: false, message: "Enter a valid email address." };

  // A bot in the trap is told the same as a person, and nothing happens.
  if (String(formData.get(TRAP_FIELD) ?? "").trim()) {
    console.warn(`[newsletter] bot turned away: ${email}`);
    return { ok: true, message: CONFIRM };
  }
  if (await tooMany(`newsletter-ip:${await clientIp()}`, 5, 60))
    return {
      ok: false,
      message: "That's a few in a row. Give it an hour and try again.",
    };

  const joined = await joinList(email);
  if (!joined.ok)
    return {
      ok: false,
      message: `That didn't go through. Email ${STUDIO.inbox} and we'll add you.`,
    };
  if (joined.status === "already")
    return { ok: true, message: "You're already on the list. Thanks!" };
  return { ok: true, message: CONFIRM, joined: true };
}
