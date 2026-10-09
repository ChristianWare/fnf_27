// Who hears about what. Admins choose their alerts on Settings; clients
// choose theirs on Profile. Account emails (verify, reset, billing) always
// go. Nothing here ever throws: a failed email must not undo a save.

import { wants } from "@/lib/auth/users";
import { admins, clientPeople } from "@/lib/data/write";
import { url } from "./config";
import { render, sendEmail, MANAGE_EMAILS, type EmailContent } from "./email";
import { sign } from "./ids";

/** The admin alerts, as listed on Settings → Notifications. */
export type AdminAlert =
  | "signup"
  | "payment"
  | "failed"
  | "message"
  | "change"
  | "document"
  | "blueprint"
  | "digest";

/** What clients can turn off on Profile. */
export type ClientEmail = "replies" | "changes" | "invoices" | "digest";

export function unsubscribeLink(userId: string, kind: string) {
  const value = `${userId}.${kind}`;
  return url(`/unsubscribe?u=${userId}&k=${kind}&s=${sign(value)}`);
}

export const oneClickLink = (userId: string, kind: string) =>
  url(`/api/unsubscribe?u=${userId}&k=${kind}&s=${sign(`${userId}.${kind}`)}`);

/** Emails every admin who wants this alert, and texts the studio phone. */
export async function alertAdmins(
  kind: AdminAlert,
  subject: string,
  content: EmailContent,
  sms?: string,
) {
  try {
    const team = await admins();
    const { html, text } = render({
      ...content,
      reason: "An alert from your Fonts & Footers admin.",
      manage: url("/admin/settings#notifications"),
    });
    await Promise.all(
      team
        .filter((a) => a.passwordHash && wants({ notify: a.notify }, kind))
        .map((a) => sendEmail({ to: a.email, subject, html, text })),
    );
    const gateway = process.env.ADMIN_SMS_GATEWAY;
    if (sms && gateway) {
      await sendEmail({
        to: gateway,
        subject: "F&F",
        text: sms.slice(0, 150),
        html: sms.slice(0, 150),
      });
    }
  } catch (error) {
    console.error(`[notify] admin alert "${subject}" failed:`, error);
  }
}

/**
 * Emails everyone at a business. With `kind`, only the people who still
 * want that kind of email, with a one-click unsubscribe.
 */
export async function emailClient(
  clientId: string,
  subject: string,
  content: EmailContent,
  options: {
    kind?: ClientEmail;
    attachments?: { filename: string; content: Uint8Array }[];
    /** Only the first person who signed up, not the whole team. */
    firstOnly?: boolean;
  } = {},
) {
  try {
    let people = await clientPeople(clientId);
    if (options.firstOnly) people = people.slice(0, 1);
    const sent = await Promise.all(
      people
        .filter(
          (p) => !options.kind || wants({ notify: p.notify }, options.kind),
        )
        .map((p) => {
          const { html, text } = render({
            ...content,
            reason:
              content.reason ??
              "You're getting this because you have a Fonts & Footers account.",
            manage: options.kind ? MANAGE_EMAILS : undefined,
            unsubscribe: options.kind
              ? unsubscribeLink(p.id, options.kind)
              : undefined,
          });
          return sendEmail({
            to: p.email,
            subject,
            html,
            text,
            attachments: options.attachments,
            unsubscribe: options.kind
              ? oneClickLink(p.id, options.kind)
              : undefined,
          });
        }),
    );
    return sent.some((r) => r.ok);
  } catch (error) {
    console.error(`[notify] client email "${subject}" failed:`, error);
    return false;
  }
}

/** One email to one address: account emails (verify, reset, invite). */
export async function emailPerson(
  to: string,
  subject: string,
  content: EmailContent,
) {
  const { html, text } = render({
    ...content,
    reason:
      content.reason ??
      "You're getting this because of your Fonts & Footers account.",
  });
  return sendEmail({ to, subject, html, text });
}
