// Keeping bots out of the public forms (contact, sign-up), on top of
// Cloudflare's "are you a person?" box: a trap field only a bot fills in,
// a signed stamp that says when the form was drawn (a bot posts in under
// a second; a person takes a while), and a look at what was typed. A bot
// in the trap is told "sent" and nothing happens, so it learns nothing.
// The other catches get a plain answer, since a person can trip them too
// (a form filled by the browser in one click, a page left open all day),
// and trying again puts it right. Server only.

import { headers } from "next/headers";
import { sign, signatureOk } from "./ids";

export { STAMP_FIELD, TRAP_FIELD } from "@/lib/forms/fields";

/** Nobody fills a form in under this (a browser's autofill comes close). */
const MIN_SECONDS = 3;
/** A form left open longer than this has to be reloaded. */
const MAX_HOURS = 24;

/** When the form was drawn, signed, for its hidden stamp field. */
export function formStamp(now = Date.now()) {
  return `${now}.${sign(String(now))}`;
}

/** How long ago a stamp was made, in ms, or undefined if it isn't ours. */
export function stampAge(stamp: string | undefined, now = Date.now()) {
  if (!stamp) return undefined;
  const [issued, signature] = stamp.split(".");
  if (!/^\d{10,16}$/.test(issued ?? "") || !signature) return undefined;
  if (!signatureOk(issued, signature)) return undefined;
  return now - Number(issued);
}

const URL_RE =
  /https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|ru|xyz|info|biz|site|online|top|shop)\b/gi;

export const countUrls = (text: string) => (text.match(URL_RE) ?? []).length;

export type Posted = {
  /** The trap field, which a person never sees. */
  trap: string;
  stamp: string | undefined;
  /** Short fields: a name, a company. A link in one is a bot. */
  names: string[];
  /** The message itself. */
  message: string;
};

/**
 * Why a submission looks like a bot's, or undefined when it looks like a
 * person's. Only "trap" is certain; the rest get an answer (botText).
 */
export function botReason(
  posted: Posted,
): "trap" | "no-stamp" | "too-fast" | "stale" | "links" | undefined {
  if (posted.trap.trim()) return "trap";
  const age = stampAge(posted.stamp);
  if (age === undefined) return "no-stamp";
  if (age < MIN_SECONDS * 1000) return "too-fast";
  if (age > MAX_HOURS * 60 * 60 * 1000) return "stale";
  if (posted.names.some((name) => countUrls(name) > 0)) return "links";
  if (countUrls(posted.message) >= 3) return "links";
  // Nothing but links and a word or two.
  const words = posted.message.replace(URL_RE, " ").trim().split(/\s+/);
  if (countUrls(posted.message) > 0 && words.filter(Boolean).length < 4)
    return "links";
  return undefined;
}

/** What to tell a person who tripped one of the checks. */
export function botText(reason: NonNullable<ReturnType<typeof botReason>>) {
  switch (reason) {
    case "too-fast":
      return "That was quick. Give it a second and try again.";
    case "stale":
      return "This page has been open a while. Reload it and try again.";
    case "links":
      return "Leave the links out for now and send it again. We'll ask for them if we need them.";
    default:
      return "Reload the page and try again.";
  }
}

/** Who's asking, for the rate limits. */
export async function clientIp() {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}
