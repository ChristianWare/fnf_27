"use server";

// The free website audit, from the public page: starting one (a website or
// a business name), answering "is this your Google listing?", and asking
// for the full report by email. Each start costs real money (Google and
// DataForSEO), so bots are turned away the same way as on the contact
// form (Cloudflare's box, the trap field, the stamp that says how long the
// form was open), with limits per address and a daily cap for the whole
// site. The run itself happens after the response, in lib/audit/run.

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { tooMany } from "@/lib/auth/accounts";
import { alertAuditRun, alertFullReport, sendReport } from "@/lib/audit/emails";
import { runLater } from "@/lib/audit/run";
import { beginAudit, pickListing, type Candidate } from "@/lib/audit/start";
import {
  countEmail,
  getAudit,
  noticeOnce,
  startedToday,
  unlockAudit,
  updateAudit,
} from "@/lib/audit/store";
import { STUDIO, url } from "@/lib/server/config";
import { alertAdmins, emailPerson } from "@/lib/server/notify";
import { addAuditRequest } from "@/lib/prospects/store";
import { formatPhone } from "@/lib/phone";
import {
  botReason,
  botText,
  clientIp,
  STAMP_FIELD,
  TRAP_FIELD,
} from "@/lib/server/spam";
import { humanCheck } from "@/lib/server/turnstile";

export type StartField = "site" | "city";

export type StartResult =
  | { ok: true; id: string; next: "report" }
  | {
      ok: true;
      id: string;
      next: "pick";
      candidates: Candidate[];
      askCity: boolean;
    }
  | { ok: false; field?: StartField; error: string };

/** How many audits the public page may start in a day, across everyone. */
const DAILY_CAP = Number(process.env.AUDIT_DAILY_CAP) || 150;

const get = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "")
    .replace(/\s+/g, " ")
    .trim();

export async function startAudit(formData: FormData): Promise<StartResult> {
  const site = get(formData, "site").slice(0, 200);
  const city = get(formData, "city").slice(0, 80);
  if (site.length < 3)
    return {
      ok: false,
      field: "site",
      error: "Enter your website, or your business name.",
    };

  const bot = botReason({
    trap: get(formData, TRAP_FIELD),
    stamp: get(formData, STAMP_FIELD) || undefined,
    names: [],
    message: "",
  });
  if (bot) {
    if (bot === "trap") console.warn(`[audit] bot turned away: ${site}`);
    return { ok: false, error: botText(bot) };
  }

  const ip = await clientIp();
  if (
    (await tooMany(`audit-ip:${ip}`, 6, 60)) ||
    (await tooMany(`audit-day:${ip}`, 20, 24 * 60))
  )
    return {
      ok: false,
      error: `That's a few audits in a row. Give it an hour, or email ${STUDIO.inbox} and I'll run yours.`,
    };
  if (!(await humanCheck(get(formData, "cf-turnstile-response"), ip)))
    return {
      ok: false,
      error: "Please tick the box to show you're not a robot.",
    };

  if ((await startedToday()) >= DAILY_CAP) {
    if (await noticeOnce(`audit-cap:${new Date().toISOString().slice(0, 10)}`))
      await alertAdmins(
        "audit",
        "The free audit hit its daily cap",
        {
          eyebrow: "Free audit",
          heading: `The audit page reached ${DAILY_CAP} runs today`,
          paragraphs: [
            "New runs are turned away until tomorrow, with a note to email you instead. If that's real interest rather than a bot, raise AUDIT_DAILY_CAP in Vercel.",
          ],
        },
        `Audit cap of ${DAILY_CAP} reached today`,
      );
    return {
      ok: false,
      error: `The audit is busy today. Email ${STUDIO.inbox} with your website and I'll run it for you.`,
    };
  }

  const begun = await beginAudit({
    text: site,
    city,
    source: "PAGE",
    gate: true,
  });
  if (!begun.ok) return begun;
  if (begun.next === "pick")
    return {
      ok: true,
      id: begun.id,
      next: "pick",
      candidates: begun.candidates,
      askCity: begun.askCity,
    };
  if (begun.next === "run") runLater(begun.id);
  // Copied from a run in the last day: you still hear that someone ran it.
  else after(() => alertAuditRun(begun.id));
  return { ok: true, id: begun.id, next: "report" };
}

export type PickResult =
  { ok: true } | { ok: false; field?: "city"; error: string };

export async function pickAudit(
  id: string,
  choice: { placeId?: string; city?: string; notOnGoogle?: boolean },
): Promise<PickResult> {
  const ip = await clientIp();
  if (await tooMany(`audit-pick:${ip}`, 20, 60))
    return { ok: false, error: "That's a lot of tries. Give it an hour." };
  const picked = await pickListing(
    String(id),
    {
      placeId: typeof choice.placeId === "string" ? choice.placeId : undefined,
      city:
        typeof choice.city === "string" ? choice.city.slice(0, 80) : undefined,
      notOnGoogle: Boolean(choice.notOnGoogle),
    },
    { gate: true },
  );
  if (!picked.ok) return picked;
  if (picked.next === "run") runLater(String(id));
  else after(() => alertAuditRun(String(id)));
  return { ok: true };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Throwaway inboxes: the report should go somewhere real. */
const THROWAWAY = [
  "mailinator.com",
  "guerrillamail.com",
  "tempmail.com",
  "yopmail.com",
  "sharklasers.com",
  "trashmail.com",
  "maildrop.cc",
  "dispostable.com",
  "10minutemail.com",
];

export type EmailResult =
  { ok: true } | { ok: false; field?: "name" | "email"; error: string };

export async function emailFullReport(
  id: string,
  formData: FormData,
): Promise<EmailResult> {
  const name = get(formData, "name").slice(0, 120);
  const email = get(formData, "email").toLowerCase().slice(0, 200);
  if (name.length < 2)
    return { ok: false, field: "name", error: "Enter your name." };
  if (!EMAIL_RE.test(email))
    return {
      ok: false,
      field: "email",
      error: "Enter the email address to send the report to.",
    };
  if (THROWAWAY.includes(email.split("@")[1] ?? ""))
    return {
      ok: false,
      field: "email",
      error: "Use an address you'll check: the report goes there.",
    };

  const bot = botReason({
    trap: get(formData, TRAP_FIELD),
    stamp: get(formData, STAMP_FIELD) || undefined,
    names: [name],
    message: "",
  });
  if (bot === "trap") return { ok: true };
  if (bot) return { ok: false, error: botText(bot) };

  const ip = await clientIp();
  if (await tooMany(`audit-email:${ip}`, 5, 60))
    return {
      ok: false,
      error: `That's a few in a row. Give it an hour, or email ${STUDIO.inbox}.`,
    };

  const row = await getAudit(String(id));
  if (!row || row.status !== "DONE")
    return { ok: false, error: "This audit isn't finished yet." };
  if (!(await countEmail(row.id)))
    return {
      ok: false,
      error: `The report has been sent a few times already. Email ${STUDIO.inbox} if it hasn't arrived.`,
    };

  const first = await unlockAudit(row.id);
  await updateAudit(row.id, { name, email });
  const updated = {
    ...row,
    name,
    email,
    unlockedAt: row.unlockedAt ?? new Date(),
  };
  const sent = await sendReport(updated, email, name);
  if (first) await alertFullReport(updated);
  revalidatePath(`/audit/report/${row.id}`);
  if (!sent.ok)
    return {
      ok: false,
      error: `Your full report is open below, but the email didn't go out. Try again, or write to ${STUDIO.inbox}.`,
    };
  return { ok: true };
}

/* ── Asking for an audit ──
 *
 * The page no longer runs audits itself: an operator asks for one, and
 * Chris runs it and sends it within 24–48 hours. The request lands in
 * Admin → Prospects (marked Interested, at the top of today's list) and
 * as an alert; the operator gets an email saying it's coming. */

export type RequestField =
  "name" | "email" | "business" | "site" | "city";

export type RequestResult =
  { ok: true } | { ok: false; field?: RequestField; error: string };

export async function requestAudit(
  formData: FormData,
): Promise<RequestResult> {
  const name = get(formData, "name").slice(0, 120);
  const email = get(formData, "email").toLowerCase().slice(0, 200);
  const phone = get(formData, "phone").slice(0, 40);
  const business = get(formData, "business").slice(0, 160);
  const site = get(formData, "site").slice(0, 300);
  const city = get(formData, "city").slice(0, 80);
  const note = String(formData.get("note") ?? "").trim().slice(0, 1500);

  if (name.length < 2)
    return { ok: false, field: "name", error: "Add your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, field: "email", error: "That email doesn't look right." };
  if (business.length < 2)
    return { ok: false, field: "business", error: "Add your business name." };
  if (!site && city.length < 2)
    return {
      ok: false,
      field: "city",
      error: "No website? Add your city, so I can find your Google listing.",
    };

  const bot = botReason({
    trap: get(formData, TRAP_FIELD),
    stamp: get(formData, STAMP_FIELD) || undefined,
    names: [name, business],
    message: note,
  });
  if (bot) {
    if (bot === "trap") console.warn(`[audit] bot request turned away: ${email}`);
    return { ok: false, error: botText(bot) };
  }

  const ip = await clientIp();
  if (
    (await tooMany(`audit-request-ip:${ip}`, 5, 60)) ||
    (await tooMany(`audit-request:${email}`, 3, 24 * 60))
  )
    return {
      ok: false,
      error: `Got it already. Your audit is on its way; email ${STUDIO.inbox} if you need anything.`,
    };
  if (!(await humanCheck(get(formData, "cf-turnstile-response"), ip)))
    return {
      ok: false,
      error: "Please tick the box to show you're not a robot.",
    };

  // "Phoenix, AZ" → city and state.
  const [cityName, stateCode] = city.split(",").map((p) => p.trim());
  await addAuditRequest({
    name,
    email,
    phone: phone ? formatPhone(phone) : undefined,
    business,
    website: site || undefined,
    city: cityName || undefined,
    state: /^[A-Za-z]{2}$/.test(stateCode ?? "") ? stateCode.toUpperCase() : undefined,
    note: note || undefined,
  });

  after(async () => {
    await alertAdmins(
      "audit",
      `Audit request: ${business}`,
      {
        eyebrow: "Audit request",
        heading: `${business} asked for an audit`,
        preheader: `${name} · ${site || city}`,
        paragraphs: [
          "They're in Prospects, marked Interested and at the top of today's list. You said 24–48 hours.",
        ],
        details: [
          ["Name", name],
          ["Email", email],
          ...(phone ? ([["Phone", phone]] as [string, string][]) : []),
          ["Website", site || "None"],
          ...(city ? ([["City", city]] as [string, string][]) : []),
        ],
        ...(note ? { quote: { text: note, by: name } } : {}),
        button: { label: "Open Prospects", href: url("/admin/prospects") },
      },
      `Audit request: ${business} (${email})`,
    );
    await emailPerson(email, "Your free audit is on its way", {
      preheader: "I'll send your report within 24–48 hours.",
      eyebrow: "Free website audit",
      heading: `Thanks, ${name.split(" ")[0]}`,
      paragraphs: [
        `I've got your request for ${business}. I'll run the audit on ${site || "your Google listing"} myself and send you the report within 24–48 hours.`,
        "It covers how you show up on Google, how your site works on a phone, whether riders can book you online, and the three things costing you the most bookings.",
      ],
      after: [
        "Anything you'd like me to look at in particular? Just reply to this email.",
        "Chris Ware\nFonts & Footers",
      ],
      reason: "You're getting this because you asked for a free audit at fontsandfooters.com.",
    });
  });
  revalidatePath("/admin/prospects");
  return { ok: true };
}
