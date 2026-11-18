// What a preview tells us as it happens (fnf-demos posts to
// /api/previews/alert): the prospect opened it, came back, signed in,
// made an account or booked a test ride. Each becomes an email (Settings →
// Notifications → "A prospect uses their preview"), a text for the first
// open, and a line on the prospect's activity.

import { fmtAgo, fmtTime } from "@/lib/dashboard/format";
import { pageName } from "./preview";

export type PreviewAlert = {
  demoId: string;
  /** The prospect's id. */
  ref: string;
  business: string;
  contactName: string;
  phone: string;
  url: string;
  kind: "open" | "return" | "login" | "booking" | "signup";
  detail: string;
  lastSeenAt: string | null;
  at: string;
};

const KINDS = ["open", "return", "login", "booking", "signup"];

/** The posted body, checked; null if it isn't one. */
export function readAlert(body: unknown): PreviewAlert | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const str = (k: string, max = 300) => (typeof b[k] === "string" ? (b[k] as string).slice(0, max) : "");
  const kind = str("kind");
  if (!KINDS.includes(kind) || !str("demoId") || !str("business")) return null;
  const at = new Date(str("at"));
  return {
    demoId: str("demoId", 64),
    ref: str("ref", 100),
    business: str("business", 200),
    contactName: str("contactName", 200),
    phone: str("phone", 40),
    url: str("url", 300),
    kind: kind as PreviewAlert["kind"],
    detail: str("detail"),
    lastSeenAt: str("lastSeenAt") || null,
    at: Number.isNaN(at.getTime()) ? new Date().toISOString() : at.toISOString(),
  };
}

const SIGN_INS: Record<string, string> = {
  admin: "signed in to the admin",
  driver: "signed in to the driver app",
  rider: "signed in as a rider",
  corporate: "signed in to the corporate portal",
};

/** The email, the text (first open only) and the activity line. */
export function alertMessage(a: PreviewAlert) {
  const who = a.contactName.split(/\s+/)[0] || a.business;
  const callLine = a.phone ? `${a.contactName || "They"}: ${a.phone}.` : "";
  const time = fmtTime(a.at);

  switch (a.kind) {
    case "open":
      return {
        subject: `${a.business} just opened their preview`,
        eyebrow: "Preview opened",
        heading: `${who} just opened the preview`,
        paragraphs: [
          `${a.business} opened ${a.url.replace(/^https?:\/\//, "")} for the first time at ${time}, starting on ${pageName(a.detail)}.`,
          `A good moment to call while it's in front of them. ${callLine}`.trim(),
        ],
        sms: `${a.business} just opened their preview. ${a.phone ? `Call ${a.phone}` : ""}`.trim(),
        activity: "Opened their preview for the first time",
      };
    case "return": {
      const away = a.lastSeenAt ? fmtAgo(a.lastSeenAt, a.at).toLowerCase() : "a while ago";
      return {
        subject: `${a.business} is back in their preview`,
        eyebrow: "Back in their preview",
        heading: `${who} came back to the preview`,
        paragraphs: [
          `${a.business} opened their preview again at ${time}, on ${pageName(a.detail)}. Their last visit was ${away}.`,
          callLine,
        ].filter(Boolean),
        activity: `Came back to their preview (last visit ${away})`,
      };
    }
    case "login": {
      const did = SIGN_INS[a.detail] ?? "signed in";
      return {
        subject: `${a.business} ${did}`,
        eyebrow: "Signed in",
        heading: `${who} ${did}`,
        paragraphs: [
          `In ${a.business}'s preview at ${time}, with the logins you gave them: past the website and into the software.`,
          callLine,
        ].filter(Boolean),
        activity: `${did[0].toUpperCase()}${did.slice(1)} in their preview`,
      };
    }
    case "signup":
      return {
        subject: `${a.business} made a rider account in their preview`,
        eyebrow: "New rider account",
        heading: `${who} made a rider account`,
        paragraphs: [`On ${a.business}'s preview at ${time}, as their riders would.`, callLine].filter(Boolean),
        activity: "Made a rider account in their preview",
      };
    case "booking":
      return {
        subject: `${a.business} booked a test ride`,
        eyebrow: "Test booking",
        heading: `${who} booked a test ride`,
        paragraphs: [
          `On ${a.business}'s preview at ${time}${a.detail ? `: ${a.detail}` : ""}.`,
          callLine,
        ].filter(Boolean),
        activity: `Booked a test ride in their preview${a.detail ? ` (${a.detail})` : ""}`,
      };
  }
}
