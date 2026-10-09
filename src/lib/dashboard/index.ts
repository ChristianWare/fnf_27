// Everything a dashboard page needs: who is signed in, their business, and
// the things worked out from it (the build steps, what needs them next).

import { cache } from "react";
import { redirect } from "next/navigation";
import { getViewAs, requireUser } from "@/lib/auth/dal";
import { loadClient } from "@/lib/data/clients";

export * from "./helpers";

/**
 * The signed-in user, their business and "now", once per request. An admin
 * only sees a client's dashboard through "View as client"; otherwise they
 * belong in the admin.
 */
export const getDashboard = cache(async () => {
  const user = await requireUser();
  const now = new Date();
  const viewingAs = user.role === "ADMIN";
  const clientId = viewingAs ? await getViewAs() : user.clientId;
  if (viewingAs && !clientId) redirect("/admin");

  const client = clientId ? await loadClient(clientId) : undefined;
  if (!client) redirect(viewingAs ? "/admin" : "/login");
  return { user, client, now: now.toISOString(), viewingAs };
});
