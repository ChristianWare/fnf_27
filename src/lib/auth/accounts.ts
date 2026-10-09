// Accounts in the database: looking people up, passwords, the links we
// email (verify, reset, invite) and slowing down guessing. Server only.

import bcrypt from "bcryptjs";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { createId, hashToken, newToken } from "@/lib/server/ids";
import type { User } from "./users";

const { users, authTokens, authAttempts, clients } = schema;

export type UserRow = typeof users.$inferSelect;

export const toUser = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  clientId: row.clientId ?? undefined,
  owner: row.isOwner,
  phone: row.phone ?? undefined,
  title: row.title ?? undefined,
  notify: row.notify ?? {},
});

export const normalEmail = (email: string) => email.trim().toLowerCase();

export async function findUserByEmail(email: string) {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalEmail(email)))
    .limit(1);
  return row;
}

export async function findUserById(id: string) {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}

/** The account and whether its business is archived (closed). */
export async function accountForSignIn(email: string) {
  const [row] = await db
    .select({ user: users, archivedAt: clients.archivedAt })
    .from(users)
    .leftJoin(clients, eq(clients.id, users.clientId))
    .where(eq(users.email, normalEmail(email)))
    .limit(1);
  return row;
}

/* ── Passwords ── */

export const MIN_PASSWORD = 8;

export function passwordProblem(password: string) {
  if (password.length < MIN_PASSWORD)
    return `Use at least ${MIN_PASSWORD} characters.`;
  if (password.length > 200) return "That password is too long.";
  return undefined;
}

export const hashPassword = (password: string) => bcrypt.hash(password, 12);

// A real hash of nothing, so a missing account takes as long as a wrong
// password.
const DUMMY = "$2b$12$tSbsdBBkzZkORJqW61MbN..qBIdYMG/R/0L79dtlXjFUwjI3j.eX6";

export async function checkPassword(
  hash: string | null | undefined,
  password: string,
) {
  if (!hash) {
    await bcrypt.compare(password, DUMMY).catch(() => false);
    return false;
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/* ── Emailed links ── */

export type TokenKind = "VERIFY" | "RESET" | "INVITE";

const LIFETIME_HOURS: Record<TokenKind, number> = {
  VERIFY: 48,
  RESET: 1,
  INVITE: 24 * 7,
};

/** A new link token for this person. Older unused ones of the kind stop working. */
export async function createToken(userId: string, kind: TokenKind) {
  const token = newToken();
  await db.transaction(async (tx) => {
    await tx
      .update(authTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(authTokens.userId, userId),
          eq(authTokens.kind, kind),
          isNull(authTokens.usedAt),
        ),
      );
    await tx.insert(authTokens).values({
      id: createId(),
      userId,
      kind,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + LIFETIME_HOURS[kind] * 3_600_000),
    });
  });
  return token;
}

/** Who this token belongs to, if it's valid. Doesn't use it up. */
export async function peekToken(token: string, kinds: TokenKind[]) {
  if (!token) return undefined;
  const [row] = await db
    .select({ userId: authTokens.userId, kind: authTokens.kind })
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, hashToken(token)),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row && kinds.includes(row.kind) ? row : undefined;
}

/** Uses the token up and returns who it belongs to, or undefined. */
export async function consumeToken(token: string, kinds: TokenKind[]) {
  if (!token) return undefined;
  const [row] = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(authTokens.tokenHash, hashToken(token)),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .returning({ userId: authTokens.userId, kind: authTokens.kind });
  return row && kinds.includes(row.kind) ? row : undefined;
}

/* ── Slowing down guessing ── */

/**
 * Counts one more attempt for this key (an email or an IP) and says
 * whether it's over the limit for the window.
 */
export async function tooMany(key: string, limit: number, minutes: number) {
  const [row] = await db
    .insert(authAttempts)
    .values({ key, count: 1, windowStart: new Date() })
    .onConflictDoUpdate({
      target: authAttempts.key,
      set: {
        count: sql`case when ${authAttempts.windowStart} < now() - make_interval(mins => ${minutes}) then 1 else ${authAttempts.count} + 1 end`,
        windowStart: sql`case when ${authAttempts.windowStart} < now() - make_interval(mins => ${minutes}) then now() else ${authAttempts.windowStart} end`,
      },
    })
    .returning({ count: authAttempts.count });
  return (row?.count ?? 0) > limit;
}

export async function clearAttempts(key: string) {
  await db.delete(authAttempts).where(eq(authAttempts.key, key));
}

/* ── Housekeeping ── */

/** Sign-ups that never confirmed their email, after two weeks. */
export async function dropAbandonedSignUps(olderThanDays = 14) {
  const cutoff = new Date(Date.now() - olderThanDays * 86_400_000);
  const stale = await db
    .select({
      userId: users.id,
      clientId: users.clientId,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(clients, eq(clients.id, users.clientId))
    .where(
      and(
        isNull(users.emailVerifiedAt),
        isNull(clients.approvedAt),
        eq(clients.leadsStatus, "NONE"),
      ),
    );
  let dropped = 0;
  for (const row of stale) {
    if (row.createdAt > cutoff || !row.clientId) continue;
    await db.delete(users).where(eq(users.id, row.userId));
    await db.delete(clients).where(eq(clients.id, row.clientId));
    dropped++;
  }
  return dropped;
}
