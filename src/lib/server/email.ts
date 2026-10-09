// Sending email, through Resend's API. Server only.
//
// Outside the live site (development, Vercel previews) nothing reaches a
// real client: emails are printed to the server log, or, with
// EMAIL_REDIRECT_TO set, all sent to that one address instead.

import { STUDIO, url } from "./config";

/** True on the live site only: not in development, not on a preview. */
export const IS_LIVE =
  process.env.VERCEL_ENV === "production" || process.env.FNF_LIVE === "true";

export type Mail = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: { filename: string; content: Uint8Array }[];
  /** A one-click unsubscribe link, added as the List-Unsubscribe header. */
  unsubscribe?: string;
};

export async function sendEmail(mail: Mail) {
  const to = [mail.to].flat().filter(Boolean);
  if (!to.length) return { ok: false as const, error: "No one to send to." };

  const redirect = process.env.EMAIL_REDIRECT_TO;
  const key = process.env.RESEND_API_KEY;
  if (!IS_LIVE && !redirect) {
    console.log(
      `\n[email] To: ${to.join(", ")}\n[email] Subject: ${mail.subject}\n${mail.text}\n[email] end\n`,
    );
    return { ok: true as const, id: "logged" };
  }
  if (!key) {
    console.error(
      `[email] RESEND_API_KEY isn't set: "${mail.subject}" not sent.`,
    );
    return { ok: false as const, error: "Email isn't set up." };
  }

  const subject =
    !IS_LIVE && redirect
      ? `[for ${to.join(", ")}] ${mail.subject}`
      : mail.subject;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: STUDIO.from,
        to: !IS_LIVE && redirect ? [redirect] : to,
        subject,
        html: mail.html,
        text: mail.text,
        reply_to: mail.replyTo ?? STUDIO.replyTo,
        ...(mail.attachments?.length
          ? {
              attachments: mail.attachments.map((a) => ({
                filename: a.filename,
                content: Buffer.from(a.content).toString("base64"),
              })),
            }
          : {}),
        ...(mail.unsubscribe
          ? {
              headers: {
                "List-Unsubscribe": `<${mail.unsubscribe}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }
          : {}),
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };
    if (!res.ok) {
      console.error(
        `[email] Resend refused "${mail.subject}": ${body.message ?? res.status}`,
      );
      return { ok: false as const, error: body.message ?? "Email failed." };
    }
    return { ok: true as const, id: body.id };
  } catch (error) {
    console.error(`[email] Couldn't send "${mail.subject}":`, error);
    return { ok: false as const, error: "Email failed." };
  }
}

/* ── The template ── */

export const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export type EmailContent = {
  /** The grey line inboxes show after the subject. */
  preheader?: string;
  eyebrow?: string;
  heading: string;
  paragraphs: string[];
  /** Something they or we wrote, shown as a quote. */
  quote?: { text: string; by?: string };
  details?: [label: string, value: string][];
  button?: { label: string; href: string };
  /** Paragraphs after the button. */
  after?: string[];
  /** Rich rows of our own (the morning leads email), after the paragraphs. */
  blocks?: { html: string; text: string };
  /** Why they get this email, and where to change it. */
  reason?: string;
  manage?: string;
  unsubscribe?: string;
};

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const MONO = "'IBM Plex Mono',Menlo,Consolas,monospace";

const para = (text: string) =>
  `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3d3d40;">${esc(text).replace(/\n/g, "<br>")}</p>`;

export function render(c: EmailContent) {
  const details = c.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;border-collapse:separate;background:#f4f4f4;border-radius:16px;">${c.details
        .map(
          ([label, value], i) =>
            `<tr><td style="padding:${i ? 0 : 16}px 20px 12px;font-family:${MONO};font-size:14px;text-transform:uppercase;color:#6b6b70;white-space:nowrap;vertical-align:top;">${esc(label)}</td><td style="padding:${i ? 0 : 16}px 20px 12px 0;font-size:16px;color:#0d0d0e;text-align:right;">${esc(value)}</td></tr>`,
        )
        .join("")}</table>`
    : "";

  const quote = c.quote
    ? `<div style="margin:8px 0 24px;padding:18px 20px;border-radius:16px;background:#f4f4f4;"><p style="margin:0;font-size:16px;line-height:1.6;color:#0d0d0e;">${esc(c.quote.text).replace(/\n/g, "<br>")}</p>${c.quote.by ? `<p style="margin:10px 0 0;font-family:${MONO};font-size:14px;text-transform:uppercase;color:#6b6b70;">${esc(c.quote.by)}</p>` : ""}</div>`
    : "";

  const button = c.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="border-radius:999px;background:#0d0d0e;"><a href="${esc(c.button.href)}" style="display:inline-block;padding:16px 28px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${esc(c.button.label)} &rarr;</a></td></tr></table>`
    : "";

  const foot = [
    c.reason ? esc(c.reason) : "",
    c.manage
      ? `<a href="${esc(c.manage)}" style="color:#6b6b70;text-decoration:underline;">Choose which emails you get</a>`
      : "",
    c.unsubscribe
      ? `<a href="${esc(c.unsubscribe)}" style="color:#6b6b70;text-decoration:underline;">Unsubscribe</a>`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.heading)}</title></head>
<body style="margin:0;padding:0;background:#ebebeb;font-family:${FONT};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;">${esc(c.preheader ?? c.paragraphs[0] ?? "")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ebebeb;padding:32px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
<tr><td style="padding:0 8px 16px;font-size:18px;font-weight:800;letter-spacing:-0.3px;color:#0d0d0e;">Fonts &amp; Footers</td></tr>
<tr><td style="background:#ffffff;border-radius:28px;padding:36px 32px 20px;">
${c.eyebrow ? `<p style="margin:0 0 14px;font-family:${MONO};font-size:14px;text-transform:uppercase;letter-spacing:0.2px;color:#0d0d0e;">&#9679; ${esc(c.eyebrow)}</p>` : ""}
<h1 style="margin:0 0 18px;font-size:26px;line-height:1.25;letter-spacing:-0.5px;color:#0d0d0e;">${esc(c.heading)}</h1>
${c.paragraphs.map(para).join("")}${c.blocks?.html ?? ""}${quote}${details}${button}${(c.after ?? []).map(para).join("")}
</td></tr>
<tr><td style="padding:20px 8px 0;font-size:14px;line-height:1.6;color:#6b6b70;">
${foot ? `<p style="margin:0 0 8px;">${foot}</p>` : ""}<p style="margin:0;">${esc(STUDIO.name)} · ${esc(STUDIO.address)}</p>
</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    c.heading,
    "",
    ...c.paragraphs.flatMap((p) => [p, ""]),
    ...(c.blocks ? [c.blocks.text, ""] : []),
    ...(c.quote
      ? [`"${c.quote.text}"${c.quote.by ? ` (${c.quote.by})` : ""}`, ""]
      : []),
    ...(c.details ?? []).map(([l, v]) => `${l}: ${v}`),
    ...(c.details?.length ? [""] : []),
    ...(c.button ? [`${c.button.label}: ${c.button.href}`, ""] : []),
    ...(c.after ?? []).flatMap((p) => [p, ""]),
    "--",
    ...(c.reason ? [c.reason] : []),
    ...(c.manage ? [`Choose which emails you get: ${c.manage}`] : []),
    ...(c.unsubscribe ? [`Unsubscribe: ${c.unsubscribe}`] : []),
    `${STUDIO.name} · ${STUDIO.address}`,
  ].join("\n");

  return { html, text };
}

/** Where clients choose their emails. */
export const MANAGE_EMAILS = url("/dashboard/profile#emails");
