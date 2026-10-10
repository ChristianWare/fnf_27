// The footer's "One email a month" list, on Mailchimp: the same account
// and list the old site used. MAILCHIMP_API_KEY and MAILCHIMP_AUDIENCE_ID
// switch it on (MAILCHIMP_DC, like "us21", is read from the end of the key
// when it isn't set); without them the footer leaves the sign-up out.
// New people get Mailchimp's "confirm your subscription" email first, so
// nobody is put on the list by someone else, or by a bot. Server only.

import { createHash } from "node:crypto";
import { call } from "@/lib/leads/apis/http";

function settings() {
  const key = process.env.MAILCHIMP_API_KEY?.trim();
  const list = process.env.MAILCHIMP_AUDIENCE_ID?.trim();
  // A key ends in its data center: "…-us21".
  const dc =
    process.env.MAILCHIMP_DC?.trim() || key?.match(/-([a-z]+\d+)$/)?.[1];
  return key && list && dc ? { key, list, dc } : null;
}

/** True when the sign-up is set up, so the footer shows it. */
export const newsletterOn = () => settings() !== null;

export type Joined =
  /** On the list, or waiting on the confirmation email. */
  { ok: true; status: "confirm" | "already" } | { ok: false; error: string };

type Member = { status?: string; title?: string; detail?: string };

/** Adds an email to the list, or says it's already there. */
export async function joinList(email: string): Promise<Joined> {
  const s = settings();
  if (!s) return { ok: false, error: "The newsletter isn't set up." };
  const member = `https://${s.dc}.api.mailchimp.com/3.0/lists/${s.list}/members/${createHash(
    "md5",
  )
    .update(email.toLowerCase())
    .digest("hex")}`;
  const put = async (body: Record<string, string>) => {
    const res = await call(member, {
      method: "PUT",
      headers: {
        Authorization: `Basic ${Buffer.from(`fnf:${s.key}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email_address: email, ...body }),
      timeout: 10_000,
    });
    const data = (await res.json().catch(() => ({}))) as Member;
    return { res, data };
  };

  try {
    // New people start as "pending": Mailchimp sends the confirmation.
    // Anyone already there keeps the status they have.
    let { res, data } = await put({ status_if_new: "pending" });
    // Someone who unsubscribed and is back: Mailchimp has them confirm
    // again.
    if (res.ok && data.status === "unsubscribed")
      ({ res, data } = await put({ status: "pending" }));
    if (!res.ok) {
      console.error(
        `[newsletter] Mailchimp said ${res.status}: ${data.title ?? ""} ${data.detail ?? ""}`,
      );
      return { ok: false, error: data.title ?? `HTTP ${res.status}` };
    }
    return {
      ok: true,
      status: data.status === "subscribed" ? "already" : "confirm",
    };
  } catch (error) {
    console.error("[newsletter] couldn't reach Mailchimp:", error);
    return { ok: false, error: "unreachable" };
  }
}
