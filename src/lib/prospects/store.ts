// Prospects on the server: the list, one prospect with its timeline,
// importing, logging a call and what it sets up next, and linking a
// sign-up to the prospect it came from.

import { and, desc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { getSetting, setSetting } from "@/lib/data/write";
import { createId, sign, signatureOk } from "@/lib/server/ids";
import { url } from "@/lib/server/config";
import { domainOf, matchKeys, phoneDigits, type ProspectInput } from "./parse";
import {
  CLOSED_STAGES,
  DEFAULT_DAILY_GOAL,
  GOAL_KEY,
  LOST_DAYS,
  MAX_TRIES,
  RETRY_DAYS,
  type CallOutcome,
  type ProspectActivityKind,
  type ProspectStage,
} from "./kinds";

export type ProspectRow = typeof s.prospects.$inferSelect;
export type ProspectActivityRow = typeof s.prospectActivity.$inferSelect;

const DAY = 86_400_000;
const AZ = 7 * 3_600_000;

/** Midnight in Arizona, at the start of the day `now` is in. */
export const azDayStart = (now: Date) =>
  new Date(Math.floor((now.getTime() - AZ) / DAY) * DAY + AZ);

/** 9am Arizona time, `days` from today. */
const morning = (now: Date, days: number) =>
  new Date(azDayStart(now).getTime() + days * DAY + 9 * 3_600_000);

export async function dailyGoal() {
  const v = await getSetting<number>(GOAL_KEY);
  return typeof v === "number" && v > 0 ? v : DEFAULT_DAILY_GOAL;
}

export const setDailyGoal = (n: number) =>
  setSetting(GOAL_KEY, Math.max(1, Math.min(200, Math.round(n))));

export async function listProspects() {
  return db.select().from(s.prospects).orderBy(desc(s.prospects.createdAt));
}

export async function getProspect(id: string) {
  const [row] = await db
    .select()
    .from(s.prospects)
    .where(eq(s.prospects.id, id))
    .limit(1);
  if (!row) return null;
  const activity = await db
    .select({
      a: s.prospectActivity,
      by: s.users.name,
    })
    .from(s.prospectActivity)
    .leftJoin(s.users, eq(s.users.id, s.prospectActivity.by))
    .where(eq(s.prospectActivity.prospectId, id))
    .orderBy(desc(s.prospectActivity.at))
    .limit(200);
  return { row, activity };
}

export async function logActivity(
  prospectId: string,
  kind: ProspectActivityKind,
  text: string,
  by?: string | null,
  outcome?: CallOutcome,
) {
  await db.insert(s.prospectActivity).values({
    id: createId(),
    prospectId,
    kind,
    text: text.slice(0, 4000),
    by: by ?? null,
    outcome: outcome ?? null,
  });
}

/** Calls logged since a time, for the progress bar and the stats. */
export async function callsSince(since: Date) {
  return db
    .select({
      outcome: s.prospectActivity.outcome,
      at: s.prospectActivity.at,
    })
    .from(s.prospectActivity)
    .where(
      and(eq(s.prospectActivity.kind, "CALL"), gte(s.prospectActivity.at, since)),
    );
}

export type ImportResult = { added: number; merged: number; skipped: number };

/**
 * Adds the rows that aren't already here. A row that matches one we have
 * (same phone, site, or name in the same city) fills in what was missing
 * instead; clients' own sites and phones are skipped.
 */
export async function importProspects(
  rows: ProspectInput[],
  list: string,
  by: string,
): Promise<ImportResult> {
  const have = await db
    .select({
      id: s.prospects.id,
      business: s.prospects.business,
      city: s.prospects.city,
      phone: s.prospects.phone,
      website: s.prospects.website,
      contactName: s.prospects.contactName,
      email: s.prospects.email,
      mapsUrl: s.prospects.mapsUrl,
      tags: s.prospects.tags,
    })
    .from(s.prospects);
  const index = new Map<string, (typeof have)[number]>();
  for (const h of have) for (const k of matchKeys(h)) index.set(k, h);

  const clients = await db
    .select({ phone: s.clients.phone, site: s.clients.websiteUrl })
    .from(s.clients);
  const ours = new Set(
    clients.flatMap((c) =>
      [phoneDigits(c.phone), domainOf(c.site)]
        .filter(Boolean)
        .map((x) => String(x)),
    ),
  );

  const result: ImportResult = { added: 0, merged: 0, skipped: 0 };
  const seen = new Set<string>();
  for (const p of rows) {
    const keys = matchKeys(p);
    if (keys.some((k) => seen.has(k))) {
      result.skipped++;
      continue;
    }
    keys.forEach((k) => seen.add(k));
    const digits = phoneDigits(p.phone);
    const domain = domainOf(p.website);
    if ((digits && ours.has(digits)) || (domain && ours.has(domain))) {
      result.skipped++;
      continue;
    }
    const match = keys.map((k) => index.get(k)).find(Boolean);
    if (match) {
      const fill = {
        ...(!match.phone && p.phone ? { phone: p.phone, phoneDigits: digits } : {}),
        ...(!match.website && p.website ? { website: p.website, domain } : {}),
        ...(!match.contactName && p.contactName ? { contactName: p.contactName } : {}),
        ...(!match.email && p.email ? { email: p.email } : {}),
        ...(!match.mapsUrl && p.mapsUrl ? { mapsUrl: p.mapsUrl } : {}),
        ...(p.tags.some((t) => !match.tags.includes(t))
          ? { tags: [...new Set([...match.tags, ...p.tags])] }
          : {}),
      };
      if (Object.keys(fill).length) {
        await db
          .update(s.prospects)
          .set({ ...fill, updatedAt: new Date() })
          .where(eq(s.prospects.id, match.id));
        result.merged++;
      } else result.skipped++;
      continue;
    }
    const id = createId();
    await db.insert(s.prospects).values({
      id,
      business: p.business,
      contactName: p.contactName ?? null,
      phone: p.phone ?? null,
      phoneDigits: digits,
      email: p.email ?? null,
      website: p.website ?? null,
      domain,
      mapsUrl: p.mapsUrl ?? null,
      city: p.city ?? null,
      state: p.state ?? null,
      list: list || null,
      tags: p.tags,
      notes: p.notes ?? "",
      rating: p.rating ?? null,
      reviews: p.reviews ?? null,
    });
    await logActivity(id, "IMPORT", list ? `Imported from ${list}` : "Added", by);
    result.added++;
  }
  return result;
}

/** What a call's outcome changes, and when they come up again. */
export function afterCall(
  p: Pick<ProspectRow, "stage" | "tries">,
  outcome: CallOutcome,
  now: Date,
  callback?: Date,
): { stage: ProspectStage; tries: number; nextAt: Date | null; note: string } {
  const open = p.stage === "NEW" ? "CALLING" : p.stage;
  switch (outcome) {
    case "NO_ANSWER": {
      const tries = p.tries + 1;
      return tries >= MAX_TRIES
        ? { stage: "PARKED", tries, nextAt: null, note: `No answer ${tries} times, parked` }
        : {
            stage: open,
            tries,
            nextAt: morning(now, RETRY_DAYS.NO_ANSWER),
            note: `No answer (${tries} of ${MAX_TRIES})`,
          };
    }
    case "VOICEMAIL":
      return {
        stage: open,
        tries: p.tries + 1,
        nextAt: morning(now, RETRY_DAYS.VOICEMAIL),
        note: "Left a voicemail",
      };
    case "CALLBACK":
      return {
        stage: open,
        tries: 0,
        nextAt: callback ?? morning(now, 1),
        note: "Asked to be called back",
      };
    case "INTERESTED":
      return {
        stage: ["INVITED", "TRIAL", "PROPOSAL"].includes(p.stage) ? p.stage : "INTERESTED",
        tries: 0,
        nextAt: callback ?? morning(now, RETRY_DAYS.INTERESTED),
        note: "Interested",
      };
    case "NOT_INTERESTED":
      return {
        stage: "LOST",
        tries: 0,
        nextAt: morning(now, LOST_DAYS),
        note: "Not interested",
      };
    case "WRONG_NUMBER":
      return { stage: "PARKED", tries: p.tries, nextAt: null, note: "Wrong number" };
    case "DO_NOT_CALL":
      return { stage: "DO_NOT_CALL", tries: p.tries, nextAt: null, note: "Asked not to be called again" };
  }
}

/** Due today: callbacks and follow-ups first, then new ones. */
export function queueOf(rows: ProspectRow[], now: Date, room: number) {
  const end = new Date(azDayStart(now).getTime() + DAY);
  const open = rows.filter(
    (r) => !CLOSED_STAGES.includes(r.stage) && !(r.stage === "TRIAL" && !r.nextAt),
  );
  const due = open
    .filter((r) => r.nextAt && r.nextAt < end)
    .sort((a, b) => a.nextAt!.getTime() - b.nextAt!.getTime());
  const fresh = open
    .filter((r) => !r.nextAt && r.stage === "NEW" && r.phone)
    .sort(
      (a, b) =>
        (b.reviews ?? 0) - (a.reviews ?? 0) ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    )
    .slice(0, Math.max(0, room - due.length));
  return { due, fresh };
}

/* ── The invite link ── */

const SIG = (id: string) => `prospect.${id}`;

export const inviteToken = (id: string) => `${id}.${sign(SIG(id))}`;

export const inviteLink = (id: string) =>
  url(`/register?plan=leads&p=${encodeURIComponent(inviteToken(id))}`);

/** The prospect a link was made for, or null when it's been changed. */
export function prospectFromToken(token?: string | null) {
  if (!token) return null;
  const [id, sig] = token.split(".");
  return id && sig && signatureOk(SIG(id), sig) ? id : null;
}

/** For the sign-up form: what we know about them already. */
export async function invitePrefill(token?: string | null) {
  const id = prospectFromToken(token);
  if (!id) return null;
  const [p] = await db
    .select()
    .from(s.prospects)
    .where(eq(s.prospects.id, id))
    .limit(1);
  if (!p || p.clientId) return null;
  return {
    token: token!,
    name: p.contactName ?? "",
    business: p.business,
    email: p.email ?? "",
    phone: p.phone ?? "",
    website: p.website ?? "",
  };
}

/**
 * After a sign-up: the prospect it came from (the invite link, or the same
 * email, phone or site) is linked to the new account. Never throws.
 */
export async function linkSignup(info: {
  token?: string;
  clientId: string;
  email: string;
  phone?: string;
  website?: string | null;
  plan: string;
  planName: string;
}) {
  try {
    let id = prospectFromToken(info.token);
    if (!id) {
      const digits = phoneDigits(info.phone);
      const domain = domainOf(info.website);
      const conds = [
        eq(s.prospects.email, info.email),
        ...(digits ? [eq(s.prospects.phoneDigits, digits)] : []),
        ...(domain ? [eq(s.prospects.domain, domain)] : []),
      ];
      const [match] = await db
        .select({ id: s.prospects.id })
        .from(s.prospects)
        .where(and(isNull(s.prospects.clientId), or(...conds)))
        .limit(1);
      id = match?.id ?? null;
    }
    if (!id) return;
    await db
      .update(s.prospects)
      .set({
        clientId: info.clientId,
        stage: info.plan === "LEADS" ? "TRIAL" : "PROPOSAL",
        nextAt: info.plan === "LEADS" ? morning(new Date(), 7) : morning(new Date(), 1),
        email: sql`coalesce(${s.prospects.email}, ${info.email})`,
        updatedAt: new Date(),
      })
      .where(and(eq(s.prospects.id, id), isNull(s.prospects.clientId)));
    await logActivity(id, "SIGNUP", `Signed up for the ${info.planName}`);
  } catch (error) {
    console.error("[prospects] couldn't link a sign-up", error);
  }
}

/**
 * Prospects whose account is now paying: the Leads Tool, or a website
 * plan an admin approved. Moved to Client.
 */
export async function markWon(rows: ProspectRow[]) {
  const linked = rows.filter((r) => r.clientId && r.stage !== "WON");
  if (!linked.length) return [];
  const paying = await db
    .select({ id: s.clients.id })
    .from(s.clients)
    .where(
      and(
        inArray(
          s.clients.id,
          linked.map((r) => r.clientId!),
        ),
        or(
          inArray(s.clients.leadsStatus, ["ACTIVE", "CANCELLING", "PAST_DUE"]),
          sql`${s.clients.approvedAt} is not null`,
        ),
      ),
    );
  const ids = new Set(paying.map((p) => p.id));
  const won = linked.filter((r) => ids.has(r.clientId!));
  for (const r of won) {
    await db
      .update(s.prospects)
      .set({ stage: "WON", nextAt: null, updatedAt: new Date() })
      .where(eq(s.prospects.id, r.id));
    await logActivity(r.id, "STAGE", "Became a paying client");
    r.stage = "WON";
    r.nextAt = null;
  }
  return won;
}

/** Follow-ups and callbacks due by the end of today, for the sidebar. */
export async function countDueProspects(now = new Date()) {
  try {
    const end = new Date(azDayStart(now).getTime() + DAY);
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(s.prospects)
      .where(
        and(
          sql`${s.prospects.nextAt} < ${end.toISOString()}`,
          sql`${s.prospects.stage} not in ('WON','LOST','PARKED','DO_NOT_CALL')`,
        ),
      );
    return row?.n ?? 0;
  } catch {
    // Before the migration has run.
    return 0;
  }
}
