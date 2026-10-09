// The one place pages ask "who is signed in?". The proxy only reads the
// cookie to redirect early; this checks the signature, that the account
// still exists and what it may see, close to the data, on every page.

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "./session";
import { getUserById, homeFor } from "./users";

/** The signed-in user, or null. Runs once per request. */
export const getSessionUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return null;
  return getUserById(session.sub) ?? null;
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
// an effect for a signed-in admin.
export const VIEW_AS_COOKIE = "fnf_view_as";

export async function getViewAs() {
  return (await cookies()).get(VIEW_AS_COOKIE)?.value;
}
