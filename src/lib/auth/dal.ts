// The one place pages and actions ask "who is signed in?". The proxy only
// reads the cookie to redirect early; this checks the signature, that the
// account still exists and is open, and what it may see, on every request.

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SESSION_COOKIE, verifySession } from "./session";
import { toUser } from "./accounts";
import { homeFor } from "./users";

const { users, clients } = schema;

/** The signed-in user, or null. Runs once per request. */
export const getSessionUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return null;

  const [row] = await db
    .select({ user: users, archivedAt: clients.archivedAt })
    .from(users)
    .leftJoin(clients, eq(clients.id, users.clientId))
    .where(eq(users.id, session.sub))
    .limit(1);
  if (!row) return null;
  const { user, archivedAt } = row;

  // Signed out everywhere since (a password reset, say).
  if (
    user.sessionsValidAfter &&
    session.iat * 1000 < user.sessionsValidAfter.getTime()
  ) {
    return null;
  }
  // A closed business: its people can't sign in.
  if (user.role === "CLIENT" && archivedAt && archivedAt <= new Date()) {
    return null;
  }
  if (user.role === "CLIENT" && !user.clientId) return null;

  // When they were last here, for the team page. At most every 10 minutes.
  const seen = user.lastActiveAt?.getTime() ?? 0;
  if (Date.now() - seen > 10 * 60_000) {
    after(async () => {
      await db
        .update(users)
        .set({ lastActiveAt: new Date() })
        .where(eq(users.id, user.id))
        .catch(() => undefined);
    });
  }
  return toUser(user);
});

/** The signed-in user; anyone else goes to the login page. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** An admin; clients go back to their own dashboard. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect(homeFor(user));
  return user;
}

// "View as client": an admin looking at a client's dashboard exactly as
// the client sees it. The cookie only names the client; it only ever has
// an effect for a signed-in admin, and nothing can be changed through it.
export const VIEW_AS_COOKIE = "fnf_view_as";

export async function getViewAs() {
  return (await cookies()).get(VIEW_AS_COOKIE)?.value;
}
