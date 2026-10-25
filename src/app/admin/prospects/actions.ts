"use server";

// Admin → Prospects: importing a list, logging each call (which sets up
// the next one), notes, moving a prospect along, emailing the invite link
// and running their audit.

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { getSessionUser } from "@/lib/auth/dal";
import { done, fail, type ActionResult } from "@/lib/actions";
import { runLater } from "@/lib/audit/run";
import { beginAudit, pickListing } from "@/lib/audit/start";
import { emailPerson } from "@/lib/server/notify";
import {
  CALL_OUTCOMES,
  OUTCOME_LABELS,
  PROSPECT_STAGES,
  STAGE_LABELS,
  type CallOutcome,
  type ProspectStage,
} from "@/lib/prospects/kinds";
import {
  domainOf,
  parseProspects,
  phoneDigits,
  tidy,
  type ProspectInput,
} from "@/lib/prospects/parse";
import {
  afterCall,
  getProspect,
  importProspects,
  inviteLink,
  logActivity,
  setDailyGoal,
  type ImportResult,
} from "@/lib/prospects/store";
import { formatPhone } from "@/lib/phone";

async function admin() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN")
    return { ok: false as const, error: "Only admins can do that." };
  return { ok: true as const, user };
}

const refresh = () => revalidatePath("/admin/prospects");

async function load(id: string) {
  const [row] = await db
    .select()
    .from(s.prospects)
    .where(eq(s.prospects.id, String(id)))
    .limit(1);
  return row ?? null;
}

/** Rows read in the browser (see ImportProspects), checked again here. */
export async function importList(input: {
  rows: ProspectInput[];
  list: string;
}): Promise<ActionResult<ImportResult>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const list = String(input.list ?? "").trim().slice(0, 60);
  const rows = (Array.isArray(input.rows) ? input.rows : [])
    .slice(0, 2000)
    .map((r) =>
      tidy({
        ...r,
        business: String(r?.business ?? ""),
        tags: Array.isArray(r?.tags) ? r.tags.map(String) : [],
        rating: Number(r?.rating) || undefined,
        reviews: Number(r?.reviews) || undefined,
      }),
    )
    .filter((r): r is ProspectInput => r !== null);
  if (!rows.length) return fail("Nothing to import.");
  const result = await importProspects(rows, list, a.user.id);
  refresh();
  return done(result);
}

/** One operator, typed in. */
export async function addProspect(p: {
  business: string;
  phone?: string;
  website?: string;
  city?: string;
  state?: string;
  contactName?: string;
  email?: string;
}): Promise<ActionResult<ImportResult>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const [row] = parseProspects(
    [
      "Business,Contact,Phone,Email,Website,City,State",
      [p.business, p.contactName, p.phone, p.email, p.website, p.city, p.state]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    ].join("\n"),
  );
  if (!row) return fail("Add the business name.");
  const result = await importProspects([row], "Added by hand", a.user.id);
  refresh();
  if (!result.added && !result.merged)
    return fail("They're already on your list (or already a client).");
  return done(result);
}

export async function logCall(
  id: string,
  outcome: CallOutcome,
  note: string,
  /** CALLBACK or INTERESTED: when to call next, "2026-10-28T09:00". */
  when?: string,
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  if (!CALL_OUTCOMES.includes(outcome)) return fail("Pick how the call went.");
  const p = await load(id);
  if (!p) return fail("That prospect isn't there anymore.");
  const now = new Date();
  // The time picker gives Arizona time with no zone.
  const callback = when ? new Date(`${String(when).slice(0, 16)}:00-07:00`) : undefined;
  if (outcome === "CALLBACK" && (!callback || Number.isNaN(callback.getTime()) || callback < now))
    return fail("Pick when to call them back.");
  const next = afterCall(p, outcome, now, callback && !Number.isNaN(callback.getTime()) ? callback : undefined);
  await db
    .update(s.prospects)
    .set({
      stage: next.stage,
      tries: next.tries,
      nextAt: next.nextAt,
      calls: p.calls + 1,
      lastCalledAt: now,
      lastOutcome: outcome,
      updatedAt: now,
    })
    .where(eq(s.prospects.id, p.id));
  const text = String(note ?? "").trim().slice(0, 4000);
  await logActivity(
    p.id,
    "CALL",
    [OUTCOME_LABELS[outcome], text].filter(Boolean).join(". "),
    a.user.id,
    outcome,
  );
  refresh();
  return done();
}

export async function addNote(id: string, note: string): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const text = String(note ?? "").trim().slice(0, 4000);
  if (!text) return fail("Write the note first.");
  const p = await load(id);
  if (!p) return fail("That prospect isn't there anymore.");
  await logActivity(p.id, "NOTE", text, a.user.id);
  refresh();
  return done();
}

export async function setStage(
  id: string,
  stage: ProspectStage,
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  if (!PROSPECT_STAGES.includes(stage)) return fail("Pick a stage.");
  const p = await load(id);
  if (!p) return fail("That prospect isn't there anymore.");
  if (p.stage === stage) return done();
  const closed = ["WON", "PARKED", "DO_NOT_CALL"].includes(stage);
  await db
    .update(s.prospects)
    .set({
      stage,
      tries: stage === "NEW" ? 0 : p.tries,
      nextAt: closed ? null : stage === "NEW" ? null : p.nextAt,
      updatedAt: new Date(),
    })
    .where(eq(s.prospects.id, p.id));
  await logActivity(
    p.id,
    "STAGE",
    `${STAGE_LABELS[p.stage]} → ${STAGE_LABELS[stage]}`,
    a.user.id,
  );
  refresh();
  return done();
}

/** When they come up again. Empty: off the queue until you set one. */
export async function setFollowUpAt(
  id: string,
  when: string,
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const at = when ? new Date(`${String(when).slice(0, 16)}:00-07:00`) : null;
  if (at && Number.isNaN(at.getTime())) return fail("That date doesn't look right.");
  await db
    .update(s.prospects)
    .set({ nextAt: at, updatedAt: new Date() })
    .where(eq(s.prospects.id, String(id)));
  refresh();
  return done();
}

export async function saveProspect(
  id: string,
  v: {
    business: string;
    contactName: string;
    phone: string;
    email: string;
    website: string;
    mapsUrl: string;
    city: string;
    state: string;
    notes: string;
    tags: string;
  },
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const business = String(v.business ?? "").trim().slice(0, 160);
  if (business.length < 2) return fail("Add the business name.");
  const email = String(v.email ?? "").trim().toLowerCase().slice(0, 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return fail("That email doesn't look right.");
  const phone = String(v.phone ?? "").trim();
  const website = String(v.website ?? "").trim().slice(0, 300);
  const state = String(v.state ?? "").trim().toUpperCase();
  await db
    .update(s.prospects)
    .set({
      business,
      contactName: String(v.contactName ?? "").trim().slice(0, 120) || null,
      phone: phone ? (phoneDigits(phone) ? formatPhone(phone) : phone.slice(0, 40)) : null,
      phoneDigits: phoneDigits(phone),
      email: email || null,
      website: website || null,
      domain: domainOf(website),
      mapsUrl: /^https?:\/\//i.test(String(v.mapsUrl ?? "")) ? String(v.mapsUrl).slice(0, 600) : null,
      city: String(v.city ?? "").trim().slice(0, 80) || null,
      state: /^[A-Z]{2}$/.test(state) ? state : null,
      notes: String(v.notes ?? "").slice(0, 4000),
      tags: [
        ...new Set(
          String(v.tags ?? "")
            .split(/[,;]/)
            .map((t) => t.trim())
            .filter(Boolean),
        ),
      ].slice(0, 12),
      updatedAt: new Date(),
    })
    .where(eq(s.prospects.id, String(id)));
  refresh();
  return done();
}

export async function deleteProspect(id: string): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  await db.delete(s.prospects).where(eq(s.prospects.id, String(id)));
  refresh();
  return done();
}

/** Emails them their own sign-up link for the free trial. */
export async function sendInvite(
  id: string,
  email: string,
  name: string,
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const p = await load(id);
  if (!p) return fail("That prospect isn't there anymore.");
  if (p.stage === "DO_NOT_CALL") return fail("They asked not to be contacted.");
  if (p.clientId) return fail("They've already signed up.");
  const to = String(email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return fail("Add their email first.");
  const first = String(name ?? "").trim().split(/\s+/)[0] || p.contactName?.split(/\s+/)[0] || "";
  const link = inviteLink(p.id);
  const sent = await emailPerson(to, "Your free month of the Leads Tool", {
    preheader: "Hotels, venues and companies near you that book rides, every morning.",
    eyebrow: "Leads Tool",
    heading: first ? `Here's your link, ${first}` : "Here's your link",
    paragraphs: [
      `Thanks for taking my call. As promised, here's your own link to try the Leads Tool free for 30 days, no card needed.`,
      `Every morning it lists the hotels, venues, companies and events near ${p.city || "you"} that book black car rides, with who to ask for and what to say.`,
    ],
    button: { label: "Start my free month", href: link },
    after: [
      "Any questions, just reply to this email.",
      `Chris Ware\nFonts & Footers`,
    ],
    reason: `You're getting this because we spoke about ${p.business}. It's a one-time email.`,
  });
  if (!sent.ok) return fail("That email didn't send. Try again in a minute.");
  const now = new Date();
  await db
    .update(s.prospects)
    .set({
      email: p.email ?? to,
      contactName: p.contactName ?? (String(name ?? "").trim() || null),
      inviteSentAt: now,
      stage: ["NEW", "CALLING", "INTERESTED", "LOST"].includes(p.stage) ? "INVITED" : p.stage,
      nextAt: new Date(now.getTime() + 2 * 86_400_000),
      updatedAt: now,
    })
    .where(eq(s.prospects.id, p.id));
  await logActivity(p.id, "EMAIL", `Sent the trial link to ${to}`, a.user.id);
  refresh();
  return done();
}

/** Their link, to copy into a text you send yourself. */
export async function inviteLinkFor(id: string): Promise<ActionResult<string>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const p = await load(id);
  if (!p) return fail("That prospect isn't there anymore.");
  return done(inviteLink(p.id));
}

/** Runs the free audit on their site, ready to send after the call. */
export async function auditProspect(
  id: string,
): Promise<ActionResult<string>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const p = await load(id);
  if (!p) return fail("That prospect isn't there anymore.");
  const city = [p.city, p.state].filter(Boolean).join(", ");
  const begun = await beginAudit({
    text: p.website || p.business,
    city,
    source: "ADMIN",
    ranBy: a.user.id,
    gate: false,
  });
  if (!begun.ok) return fail(begun.error);
  if (begun.next === "pick") {
    const top = begun.candidates[0];
    const picked = await pickListing(
      begun.id,
      top ? { placeId: top.placeId } : city ? { city } : { notOnGoogle: true },
      { gate: false },
    );
    if (!picked.ok) return fail(picked.error);
  }
  if (begun.next !== "done") runLater(begun.id);
  await db
    .update(s.prospects)
    .set({ auditId: begun.id, updatedAt: new Date() })
    .where(eq(s.prospects.id, p.id));
  await logActivity(p.id, "NOTE", "Ran their audit", a.user.id);
  refresh();
  revalidatePath("/admin/audits");
  return done(begun.id);
}

export async function saveGoal(n: number): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const goal = Math.round(Number(n));
  if (!Number.isFinite(goal) || goal < 1 || goal > 200)
    return fail("Pick a goal between 1 and 200 calls.");
  await setDailyGoal(goal);
  refresh();
  return done();
}

export type TimelineItem = {
  id: string;
  kind: string;
  outcome: string | null;
  text: string;
  by: string | null;
  at: string;
};

/** Their timeline, newest first. */
export async function prospectTimeline(
  id: string,
): Promise<ActionResult<TimelineItem[]>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const found = await getProspect(String(id));
  if (!found) return fail("That prospect isn't there anymore.");
  return done(
    found.activity.map(({ a: x, by }) => ({
      id: x.id,
      kind: x.kind,
      outcome: x.outcome,
      text: x.text,
      by,
      at: x.at.toISOString(),
    })),
  );
}
