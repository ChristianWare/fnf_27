// The one place pages ask "who is signed in?". The proxy only reads the
// cookie to redirect early; this checks the signature and that the account
// still exists, close to the data, on every page.

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "./session";
import { getUserById } from "./users";

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
