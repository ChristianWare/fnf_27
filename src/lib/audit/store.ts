// Reading and writing audits. Each check is saved as it finishes, merged
// into the row, so the report page can show them coming in and one check
// failing never loses the others. Server only.

import { and, desc, eq, gte, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { createId } from "@/lib/server/ids";
import { CHECK_IDS, RULES_VERSION, type CheckId } from "./kinds";
import type { CheckResult, Steps } from "./types";

export type AuditRow = typeof schema.audits.$inferSelect;
type NewAudit = typeof schema.audits.$inferInsert;

const a = schema.audits;
const DAY = 24 * 60 * 60 * 1000;

export async function createAudit(values: Omit<NewAudit, "id">) {
  const id = createId();
  await db.insert(a).values({ ...values, id, rules: RULES_VERSION });
  return id;
}

export async function getAudit(id: string) {
  if (!/^c[0-9a-z]{24}$/.test(id)) return undefined;
  const [row] = await db.select().from(a).where(eq(a.id, id)).limit(1);
  return row;
}

export async function updateAudit(id: string, values: Partial<NewAudit>) {
  await db
    .update(a)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(a.id, id));
}

/** Claims a queued audit to run it: false if it's already running or done. */
export async function claimAudit(id: string) {
  const steps = Object.fromEntries(
    CHECK_IDS.map((c) => [c, "running"]),
  ) as Steps;
  const rows = await db
    .update(a)
    .set({
      status: "RUNNING",
      startedAt: new Date(),
      steps,
      updatedAt: new Date(),
    })
    .where(and(eq(a.id, id), eq(a.status, "QUEUED")))
    .returning();
  return rows[0];
}

/** One check's result, merged in, and its step marked done. */
export async function saveCheck(id: string, check: CheckResult) {
  await db
    .update(a)
    .set({
      checks: sql`${a.checks} || ${JSON.stringify({ [check.id]: check })}::jsonb`,
      steps: sql`${a.steps} || ${JSON.stringify({ [check.id]: "done" })}::jsonb`,
      updatedAt: new Date(),
    })
    .where(eq(a.id, id));
}

/** The fixes the AI wrote, merged into each check. */
export async function saveFixes(
  id: string,
  fixes: Partial<Record<CheckId, string>>,
) {
  const row = await getAudit(id);
  if (!row) return;
  const checks = { ...row.checks };
  for (const [check, fix] of Object.entries(fixes) as [CheckId, string][]) {
    const result = checks[check];
    if (result && result.score !== null && result.score < 100)
      checks[check] = { ...result, fix };
  }
  await updateAudit(id, { checks });
}

/**
 * A finished run from the last day of the same site with the same Google
 * listing (or the same lack of either), to copy instead of running again.
 * Only a complete run under today's rules: one with a check that couldn't
 * run is run again.
 */
export async function recentRun(where: {
  domain?: string | null;
  placeId?: string | null;
  /** Without a listing, the searches are for the city they gave. */
  city?: string;
}) {
  if (!where.domain && !where.placeId) return undefined;
  const since = new Date(Date.now() - DAY);
  const [row] = await db
    .select()
    .from(a)
    .where(
      and(
        where.domain ? eq(a.domain, where.domain) : isNull(a.domain),
        where.placeId ? eq(a.placeId, where.placeId) : isNull(a.placeId),
        where.city ? eq(a.city, where.city) : undefined,
        eq(a.status, "DONE"),
        eq(a.rules, RULES_VERSION),
        gte(a.finishedAt, since),
        isNull(a.googleClearedAt),
        // Never a copy of a copy, so Google's details never outlive their day.
        isNull(a.reusedFrom),
        sql`not jsonb_path_exists(${a.checks}, '$.*.skipped')`,
      ),
    )
    .orderBy(desc(a.finishedAt))
    .limit(1);
  return row;
}

/** Copies a recent run's results into a new audit, so it's done at once. */
export async function copyRun(targetId: string, from: AuditRow) {
  await updateAudit(targetId, {
    status: "DONE",
    url: from.url,
    domain: from.domain,
    business: from.business,
    city: from.city,
    state: from.state,
    placeId: from.placeId,
    listing: from.listing,
    noListing: from.noListing,
    candidates: null,
    steps: from.steps,
    checks: from.checks,
    searches: from.searches,
    rivals: from.rivals,
    facts: from.facts,
    phoneShot: from.phoneShot,
    score: from.score,
    rules: from.rules,
    reusedFrom: from.id,
    startedAt: new Date(),
    finishedAt: new Date(),
  });
}

/**
 * Counts one more email of an audit's report, at most `max` in all: false
 * when it's had them. In one statement, so sends at the same moment can't
 * all slip under the limit.
 */
export async function countEmail(id: string, max = 3) {
  const rows = await db
    .update(a)
    .set({ emailsSent: sql`${a.emailsSent} + 1`, updatedAt: new Date() })
    .where(and(eq(a.id, id), lt(a.emailsSent, max)))
    .returning({ id: a.id });
  return rows.length > 0;
}

/** Opens the full report: true only the first time. */
export async function unlockAudit(id: string) {
  const rows = await db
    .update(a)
    .set({ unlockedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(a.id, id), isNull(a.unlockedAt)))
    .returning({ id: a.id });
  return rows.length > 0;
}

/** How many audits the public page started today (Arizona time is close enough to UTC−7). */
export async function startedToday() {
  const since = new Date(Date.now() - DAY);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(a)
    .where(and(eq(a.source, "PAGE"), gte(a.createdAt, since)));
  return row?.n ?? 0;
}

export async function deleteAudit(id: string) {
  await db.delete(a).where(eq(a.id, id));
}

/** True the first time a key is used: for alerts that go out once. */
export async function noticeOnce(key: string) {
  const [row] = await db
    .insert(schema.sentNotices)
    .values({ key })
    .onConflictDoNothing()
    .returning();
  return Boolean(row);
}

/** For the admin's sidebar: audits from the page nobody has followed up yet. */
export async function countNewAudits() {
  const since = new Date(Date.now() - 30 * DAY);
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(a)
    .where(
      and(
        eq(a.source, "PAGE"),
        eq(a.status, "DONE"),
        eq(a.followUp, "NEW"),
        gte(a.createdAt, since),
      ),
    );
  return row?.n ?? 0;
}

/** For Admin → Audits: newest first, without the screenshots. */
export async function listAudits(limit = 300) {
  return db
    .select({
      id: a.id,
      source: a.source,
      status: a.status,
      input: a.input,
      url: a.url,
      domain: a.domain,
      business: a.business,
      city: a.city,
      state: a.state,
      score: a.score,
      name: a.name,
      email: a.email,
      unlockedAt: a.unlockedAt,
      followUp: a.followUp,
      listing: a.listing,
      costMicros: a.costMicros,
      createdAt: a.createdAt,
      finishedAt: a.finishedAt,
      reusedFrom: a.reusedFrom,
      error: a.error,
    })
    .from(a)
    .where(ne(a.status, "CONFIRM"))
    .orderBy(desc(a.createdAt))
    .limit(limit);
}

/**
 * The daily tidy-up: listing details and the operators near them cleared
 * within 30 days (Google's terms), abandoned "is this you?" steps dropped
 * after two days, and runs stuck for an hour marked failed.
 */
export const CLEARED_NOTE =
  "Google listing details are kept for 30 days. Run a new audit for fresh numbers.";

export async function tidyAudits(now = new Date()) {
  // The Business Profile check keeps its score; its details go.
  const redacted = JSON.stringify({
    parts: [],
    notes: [],
    found: CLEARED_NOTE,
  });
  const cleared = await db
    .update(a)
    .set({
      listing: null,
      rivals: null,
      candidates: null,
      checks: sql`case when (${a.checks} -> 'profile') is not null then jsonb_set(${a.checks}, '{profile}', (${a.checks} -> 'profile') || ${redacted}::jsonb) else ${a.checks} end`,
      googleClearedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        isNull(a.googleClearedAt),
        // At 28 days: this runs once a day, and a copied run's details can
        // be a day older than the copy.
        lt(a.createdAt, new Date(now.getTime() - 28 * DAY)),
      ),
    )
    .returning({ id: a.id });
  const dropped = await db
    .delete(a)
    .where(
      and(
        eq(a.status, "CONFIRM"),
        lt(a.createdAt, new Date(now.getTime() - 2 * DAY)),
      ),
    )
    .returning({ id: a.id });
  const stuck = await db
    .update(a)
    .set({
      status: "FAILED",
      error: "The run stopped before it finished.",
      updatedAt: now,
    })
    .where(
      and(
        inArray(a.status, ["QUEUED", "RUNNING"]),
        lt(a.updatedAt, new Date(now.getTime() - 60 * 60 * 1000)),
      ),
    )
    .returning({ id: a.id });
  return {
    cleared: cleared.length,
    dropped: dropped.length,
    stuck: stuck.length,
  };
}
