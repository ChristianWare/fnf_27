"use server";

// Everything saved from the Leads Tool: a client's own (from the
// dashboard) or the studio's (from the admin). Each action works out whose
// leads they are from the session, checks they can use the tool right now,
// and only ever touches that business's leads.

import { and, count, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSessionUser } from "@/lib/auth/dal";
import type { User } from "@/lib/auth/users";
import { done, fail, VIEW_ONLY, type ActionResult } from "@/lib/actions";
import { createId } from "@/lib/server/ids";
import { dayKey, money } from "@/lib/dashboard/format";
import { followUpAfter } from "@/lib/leads/advice";
import { stageOf } from "@/lib/leads/catalog";
import {
  ACCOUNT_CATEGORIES,
  EVENT_KINDS,
  LEAD_STAGES,
  STUDIO_ID,
} from "@/lib/leads/kinds";
import { leadsAccount } from "@/lib/leads/access";
import { findContact } from "@/lib/leads/research";
import { scriptsFor } from "@/lib/leads/scripts";
import { flushUsage } from "@/lib/leads/usage";
import {
  ensureStudio,
  findTarget,
  locateCity,
  marketFor,
  researchTarget,
  savedLeads,
  settingsFor,
  toSettings,
  type SettingsRow,
} from "@/lib/leads/workspace";
import type {
  ActivityKind,
  Contact,
  LeadActivity,
  LeadStage,
  LeadsSettings,
  SavedLead,
  Script,
} from "@/lib/leads/types";

const s = schema;

/** "client": the signed-in client's own. "studio": the admins'. */
export type LeadsWhere = "client" | "studio";

type Actor =
  | { ok: false; error: string }
  | { ok: true; user: User; clientId: string; studio: boolean };

async function actor(where: LeadsWhere): Promise<Actor> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Your session ended. Sign in again." };
  if (where === "studio") {
    if (user.role !== "ADMIN")
      return { ok: false, error: "That's only for the studio." };
    await ensureStudio();
    return { ok: true, user, clientId: STUDIO_ID, studio: true };
  }
  if (user.role === "ADMIN") return { ok: false, error: VIEW_ONLY };
  if (!user.clientId)
    return { ok: false, error: "We couldn't find your business." };
  const account = await leadsAccount(user.clientId);
  if (!account || account.access === "NONE")
    return {
      ok: false,
      error: "Your Leads Tool is off. Turn it back on from Billing.",
    };
  if (!account.usable)
    return { ok: false, error: "Your Leads Tool is still being set up." };
  return { ok: true, user, clientId: user.clientId, studio: false };
}

const DAILY_SAVES = 60;
/** What saving and rewriting can cost a day, per business. */
const AI_A_DAY = 200;
const EMAIL_LOOKUPS_A_DAY = 60;

/**
 * The paid calls made for this business today. Removing a lead doesn't
 * take them back, so saving it again still counts.
 */
async function paidCallsToday(clientId: string) {
  const rows = await db
    .select({
      api: s.leadsUsage.api,
      n: sql<number>`sum(${s.leadsUsage.calls})::int`,
    })
    .from(s.leadsUsage)
    .where(
      and(
        eq(s.leadsUsage.clientId, clientId),
        eq(s.leadsUsage.day, dayKey(new Date())),
        inArray(s.leadsUsage.api, ["ai", "apollo_match"]),
      ),
    )
    .groupBy(s.leadsUsage.api);
  const of = (api: string) => rows.find((r) => r.api === api)?.n ?? 0;
  return { ai: of("ai"), emails: of("apollo_match") };
}

const clean = (text: unknown, max: number) =>
  typeof text === "string"
    ? text.trim().replace(/\s+/g, " ").slice(0, max)
    : "";

const cleanBlock = (text: unknown, max: number) =>
  typeof text === "string" ? text.trim().slice(0, max) : "";

/** Start of today in Arizona. */
const todayStart = (now = new Date()) => {
  const local = new Date(now.getTime() - 7 * 3_600_000);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) +
      7 * 3_600_000,
  );
};

async function addEntry(
  clientId: string,
  targetId: string,
  kind: ActivityKind,
  text: string,
  at = new Date(),
): Promise<LeadActivity> {
  const id = createId();
  await db
    .insert(s.leadsActivity)
    .values({ id, clientId, targetId, kind, text, at });
  return { id, at: at.toISOString(), kind, text };
}

async function savedRow(clientId: string, targetId: string) {
  const [row] = await db
    .select()
    .from(s.leadsSaved)
    .where(
      and(
        eq(s.leadsSaved.clientId, clientId),
        eq(s.leadsSaved.targetId, targetId),
      ),
    )
    .limit(1);
  return row;
}

async function settingsOf(
  a: Extract<Actor, { ok: true }>,
): Promise<SettingsRow> {
  const [row] = await db
    .select()
    .from(s.leadsSettings)
    .where(eq(s.leadsSettings.clientId, a.clientId))
    .limit(1);
  if (row) return row;
  const [client] = await db
    .select()
    .from(s.clients)
    .where(eq(s.clients.id, a.clientId))
    .limit(1);
  return settingsFor(a.clientId, {
    company: client?.business ?? "",
    name: a.user.name,
    phone: a.user.phone ?? client?.phone ?? "",
    website: client?.websiteUrl ?? undefined,
    city: [client?.city, client?.state].filter(Boolean).join(", "),
  });
}

const morningKind = (a: Extract<Actor, { ok: true }>) =>
  a.studio ? "leads" : "digest";

/* ── Saving a lead ── */

export async function saveLead(
  where: LeadsWhere,
  targetId: string,
  from: string,
): Promise<ActionResult<{ lead: SavedLead; contact?: Contact }>> {
  const a = await actor(where);
  if (!a.ok) return fail(a.error);
  if (typeof targetId !== "string" || targetId.length > 300)
    return fail("That lead isn't available anymore.");

  const existing = await savedRow(a.clientId, targetId);
  if (existing) {
    const lead = (await savedLeads(a.clientId)).find(
      (l) => l.targetId === targetId,
    );
    return lead ? done({ lead }) : fail("That lead isn't available anymore.");
  }

  if (!a.studio) {
    const [{ n }] = await db
      .select({ n: count() })
      .from(s.leadsActivity)
      .where(
        and(
          eq(s.leadsActivity.clientId, a.clientId),
          eq(s.leadsActivity.kind, "SAVED"),
          gte(s.leadsActivity.at, todayStart()),
        ),
      );
    if (n >= DAILY_SAVES)
      return fail(`That's ${DAILY_SAVES} saved today. Save more tomorrow.`);
    // Removing leads and saving them again doesn't get around it.
    const used = await paidCallsToday(a.clientId);
    if (used.ai >= AI_A_DAY || used.emails >= EMAIL_LOOKUPS_A_DAY)
      return fail("That's a lot of saving for one day. Save more tomorrow.");
  }

  const target = await findTarget(a.clientId, targetId);
  if (!target) return fail("That lead isn't available anymore.");
  const now = new Date();
  const [row] = await db
    .insert(s.leadsSaved)
    .values({
      clientId: a.clientId,
      targetId,
      kind: target.kind,
      stage: "NEW",
      savedAt: now,
    })
    .onConflictDoNothing()
    .returning();
  if (!row) return saveLead(where, targetId, from);

  const place = ["Find", "Today", "its page", "the Pipeline"].includes(from)
    ? from
    : "Find";
  const saved = await addEntry(
    a.clientId,
    targetId,
    "SAVED",
    `Saved from ${place}`,
    now,
  );
  const who = { clientId: a.clientId };

  // The decision-maker: shared with every client who saves this business.
  const { key, website } = await researchTarget(targetId);
  const contact = key
    ? await findContact(
        {
          key,
          website,
          kind: target.kind === "ACCOUNT" ? target.category : target.type,
          isEvent: target.kind === "EVENT",
        },
        who,
      ).catch(() => undefined)
    : undefined;
  const found = await addEntry(
    a.clientId,
    targetId,
    "FOUND",
    contact
      ? `Found ${contact.name}, ${contact.title}${contact.email && !contact.verified ? " (email not verified)" : contact.email ? "" : " (no email yet)"}`
      : "No one found yet. Call the main line and ask who handles transportation.",
    new Date(now.getTime() + 1),
  );

  // The scripts, written for this client.
  const settings = toSettings(await settingsOf(a), true);
  const plainContact = contact
    ? {
        name: contact.name,
        title: contact.title,
        email: contact.email,
        phone: contact.phone,
        verified: contact.verified,
      }
    : undefined;
  const scripts = await scriptsFor(
    { ...target, contact: plainContact },
    settings,
    now.toISOString(),
    who,
  );
  await db
    .update(s.leadsSaved)
    .set({ scripts, scriptsAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(s.leadsSaved.clientId, a.clientId),
        eq(s.leadsSaved.targetId, targetId),
      ),
    );
  await flushUsage();

  return done({
    lead: {
      targetId,
      stage: "NEW",
      savedAt: now.toISOString(),
      scripts,
      activity: [found, saved],
    },
    contact: plainContact,
  });
}

export async function removeLead(
  where: LeadsWhere,
  targetId: string,
): Promise<ActionResult> {
  const a = await actor(where);
  if (!a.ok) return fail(a.error);
  await db
    .delete(s.leadsSaved)
    .where(
      and(
        eq(s.leadsSaved.clientId, a.clientId),
        eq(s.leadsSaved.targetId, targetId),
      ),
    );
  await db
    .delete(s.leadsActivity)
    .where(
      and(
        eq(s.leadsActivity.clientId, a.clientId),
        eq(s.leadsActivity.targetId, targetId),
      ),
    );
  return done();
}

/* ── Working a lead ── */

export async function setLeadStage(
  where: LeadsWhere,
  targetId: string,
  stage: LeadStage,
): Promise<ActionResult<{ entry: LeadActivity }>> {
  const a = await actor(where);
  if (!a.ok) return fail(a.error);
  if (!(LEAD_STAGES as readonly string[]).includes(stage) || stage === "WON")
    return fail("Pick a stage.");
  const [row] = await db
    .update(s.leadsSaved)
    .set({
      stage,
      ...(stage === "NOT_NOW" ? { remindAt: null } : {}),
      valueCents: null,
      per: null,
      wonAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(s.leadsSaved.clientId, a.clientId),
        eq(s.leadsSaved.targetId, targetId),
        sql`${s.leadsSaved.stage} <> ${stage}`,
      ),
    )
    .returning();
  if (!row) return fail("That lead is already there, or isn't saved.");
  const entry = await addEntry(
    a.clientId,
    targetId,
    "STAGE",
    `Moved to ${stageOf(stage).label}`,
  );
  return done({ entry });
}

export async function setReminder(
  where: LeadsWhere,
  targetId: string,
  at: string | null,
): Promise<ActionResult> {
  const a = await actor(where);
  if (!a.ok) return fail(a.error);
  let when: Date | null = null;
  if (at) {
    when = new Date(at);
    const days = (when.getTime() - Date.now()) / 86_400_000;
    if (Number.isNaN(when.getTime()) || days < -1 || days > 400)
      return fail("Pick a day in the next year.");
  }
  const [row] = await db
    .update(s.leadsSaved)
    .set({ remindAt: when, updatedAt: new Date() })
    .where(
      and(
        eq(s.leadsSaved.clientId, a.clientId),
        eq(s.leadsSaved.targetId, targetId),
      ),
    )
    .returning();
  if (!row) return fail("Save this lead first.");
  return done();
}

const LOGGED = {
  EMAIL: "Sent an email",
  TEXT: "Sent a text",
  CALL: "Called",
  MET: "Met in person",
} as const;

export async function logOutreach(
  where: LeadsWhere,
  targetId: string,
  how: keyof typeof LOGGED,
  note?: string,
): Promise<ActionResult<{ entry: LeadActivity; remindAt: string }>> {
  const a = await actor(where);
  if (!a.ok) return fail(a.error);
  if (!(how in LOGGED)) return fail("Pick how you reached out.");
  const text = clean(note, 500);
  const now = new Date();
  const remindAt = followUpAfter(how, now.toISOString());
  const [row] = await db
    .update(s.leadsSaved)
    .set({
      stage: sql`case when ${s.leadsSaved.stage} = 'NEW' then 'CONTACTED' else ${s.leadsSaved.stage} end`,
      remindAt: new Date(remindAt),
      updatedAt: now,
    })
    .where(
      and(
        eq(s.leadsSaved.clientId, a.clientId),
        eq(s.leadsSaved.targetId, targetId),
      ),
    )
    .returning();
  if (!row) return fail("Save this lead first.");
  const entry = await addEntry(
    a.clientId,
    targetId,
    how,
    text ? `${LOGGED[how]}: ${text}` : LOGGED[how],
    now,
  );
  return done({ entry, remindAt });
}

export async function addLeadNote(
  where: LeadsWhere,
  targetId: string,
  note: string,
): Promise<ActionResult<{ entry: LeadActivity }>> {
  const a = await actor(where);
  if (!a.ok) return fail(a.error);
  const text = cleanBlock(note, 1000);
  if (!text) return fail("Write a note first.");
  if (!(await savedRow(a.clientId, targetId)))
    return fail("Save this lead first.");
  const entry = await addEntry(a.clientId, targetId, "NOTE", text);
  return done({ entry });
}

export async function markWon(
  where: LeadsWhere,
  targetId: string,
  value: number,
  per: "MONTH" | "ONCE",
): Promise<ActionResult<{ entry: LeadActivity; wonAt: string }>> {
  const a = await actor(where);
  if (!a.ok) return fail(a.error);
  const amount = Math.round(Number(value) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000)
    return fail("Enter what it's worth, roughly.");
  if (per !== "MONTH" && per !== "ONCE") return fail("A month, or one time?");
  const now = new Date();
  const [row] = await db
    .update(s.leadsSaved)
    .set({
      stage: "WON",
      valueCents: Math.round(amount * 100),
      per,
      wonAt: now,
      remindAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(s.leadsSaved.clientId, a.clientId),
        eq(s.leadsSaved.targetId, targetId),
      ),
    )
    .returning();
  if (!row) return fail("Save this lead first.");
  const entry = await addEntry(
    a.clientId,
    targetId,
    "WON",
    `Won, about ${money(amount)}${per === "MONTH" ? " a month" : ""}.`,
    now,
  );
  return done({ entry, wonAt: now.toISOString() });
}

const REWRITES_A_DAY = 5;

export async function rewriteScripts(
  where: LeadsWhere,
  targetId: string,
): Promise<ActionResult<{ scripts: Script }>> {
  const a = await actor(where);
  if (!a.ok) return fail(a.error);
  const row = await savedRow(a.clientId, targetId);
  if (!row) return fail("Save this lead first.");
  const day = new Date(Date.now() - 7 * 3_600_000).toISOString().slice(0, 10);
  const used = row.rewrites?.day === day ? row.rewrites.count : 0;
  if (used >= REWRITES_A_DAY)
    return fail(
      `That's ${REWRITES_A_DAY} rewrites today for this lead. Try again tomorrow.`,
    );
  if (!a.studio && (await paidCallsToday(a.clientId)).ai >= AI_A_DAY)
    return fail("That's all the rewrites for today. Try again tomorrow.");
  const target = await findTarget(a.clientId, targetId);
  if (!target) return fail("That lead isn't available anymore.");
  const settings = toSettings(await settingsOf(a), true);
  const scripts = await scriptsFor(target, settings, new Date().toISOString(), {
    clientId: a.clientId,
  });
  await db
    .update(s.leadsSaved)
    .set({
      scripts,
      scriptsAt: new Date(),
      rewrites: { day, count: used + 1 },
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(s.leadsSaved.clientId, a.clientId),
        eq(s.leadsSaved.targetId, targetId),
      ),
    );
  await flushUsage();
  return done({ scripts });
}

/* ── Settings ── */

const RADII = [10, 25, 50, 75];

export async function saveLeadSettings(
  where: LeadsWhere,
  next: LeadsSettings,
): Promise<ActionResult<{ settings: LeadsSettings; moved: boolean }>> {
  const a = await actor(where);
  if (!a.ok) return fail(a.error);
  const current = await settingsOf(a);

  const categories = (next.categories ?? []).filter((c) =>
    (ACCOUNT_CATEGORIES as readonly string[]).includes(c),
  );
  const eventTypes = (next.eventTypes ?? []).filter((t) =>
    (EVENT_KINDS as readonly string[]).includes(t),
  );
  if (!categories.length && !eventTypes.length)
    return fail("Turn on at least one kind of account or event.");
  if (!RADII.includes(next.radius)) return fail("Pick how far you'll drive.");

  const op = next.operator ?? ({} as LeadsSettings["operator"]);
  const operator = {
    company: clean(op.company, 120),
    name: clean(op.name, 120),
    fleet: clean(op.fleet, 200),
    strength: clean(op.strength, 200),
    phone: clean(op.phone, 40),
    website: clean(op.website, 160) || undefined,
  };
  if (!operator.company || !operator.name)
    return fail("Add your company and your name: every script uses them.");

  // A new base: where it is, and which market covers it.
  const city = clean(next.base?.city, 100);
  let base = {
    city: current.baseCity,
    lat: current.baseLat,
    lng: current.baseLng,
  };
  let marketId = current.marketId;
  if (city && city.toLowerCase() !== current.baseCity.toLowerCase()) {
    const found = await locateCity(city, { clientId: a.clientId }).catch(
      () => undefined,
    );
    await flushUsage();
    if (!found) return fail(`We couldn't find ${city}. Try "City, State".`);
    base = { city: found.city, lat: found.lat, lng: found.lng };
    marketId = await marketFor(found);
  }

  await db
    .update(s.leadsSettings)
    .set({
      baseCity: base.city,
      baseLat: base.lat,
      baseLng: base.lng,
      radius: next.radius,
      categories: categories as typeof current.categories,
      eventTypes: eventTypes as typeof current.eventTypes,
      operator,
      marketId,
      updatedAt: new Date(),
    })
    .where(eq(s.leadsSettings.clientId, a.clientId));

  // The morning email is the signed-in person's own choice.
  const kind = morningKind(a);
  await db
    .update(s.users)
    .set({
      notify: sql`${s.users.notify} || jsonb_build_object(${kind}::text, ${Boolean(next.morningEmail)}::boolean)`,
      updatedAt: new Date(),
    })
    .where(eq(s.users.id, a.user.id));

  return done({
    settings: {
      base,
      radius: next.radius,
      categories: categories as LeadsSettings["categories"],
      eventTypes: eventTypes as LeadsSettings["eventTypes"],
      morningEmail: Boolean(next.morningEmail),
      operator,
    },
    moved: base.city !== current.baseCity || marketId !== current.marketId,
  });
}
