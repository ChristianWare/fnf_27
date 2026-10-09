// Small writes most actions share: the activity feed, build facts, studio
// settings, and who to email at a business. Server only.

import { and, asc, eq, sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/db";
import { createId } from "@/lib/server/ids";
import type { ActivityKind } from "@/lib/dashboard/types";

const { activity, websites, appSettings, users } = schema;

type Exec = typeof db | Tx;

/** A line in the client's activity feed: "You signed your agreement". */
export async function addActivity(
  clientId: string,
  kind: ActivityKind,
  text: string,
  href?: string,
  run: Exec = db,
) {
  await run
    .insert(activity)
    .values({ id: createId(), clientId, kind, text, href });
}

/**
 * Records that a build step happened (or un-happened, with null). Returns
 * true when this call changed it, so a retry doesn't log it twice.
 */
export async function setFact(
  clientId: string,
  key: string,
  value: string | null,
  run: Exec = db,
) {
  if (value === null) {
    const rows = await run
      .update(websites)
      .set({ facts: sql`${websites.facts} - ${key}`, updatedAt: new Date() })
      .where(
        and(eq(websites.clientId, clientId), sql`${websites.facts} ? ${key}`),
      )
      .returning({ id: websites.clientId });
    return rows.length > 0;
  }
  const rows = await run
    .update(websites)
    .set({
      facts: sql`${websites.facts} || jsonb_build_object(${key}::text, ${value}::text)`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(websites.clientId, clientId),
        sql`not (${websites.facts} ? ${key})`,
      ),
    )
    .returning({ id: websites.clientId });
  return rows.length > 0;
}

/* ── Studio settings ── */

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const [row] = await db
    .select({ value: appSettings.value })
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);
  return row?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown) {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}

/* ── People ── */

/** Everyone who signs in for a business, first sign-up first. */
export function clientPeople(clientId: string) {
  return db
    .select()
    .from(users)
    .where(and(eq(users.clientId, clientId), eq(users.role, "CLIENT")))
    .orderBy(asc(users.createdAt));
}

export function admins() {
  return db
    .select()
    .from(users)
    .where(eq(users.role, "ADMIN"))
    .orderBy(asc(users.createdAt));
}
