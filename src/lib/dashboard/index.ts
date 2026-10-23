// Everything a dashboard page needs: who is signed in, their business, and
// the things worked out from it (the build steps, what needs them next).

import { cache } from "react";
import { redirect } from "next/navigation";
import { getViewAs, requireUser } from "@/lib/auth/dal";
import { loadClient } from "@/lib/data/clients";
import { awaitingApproval, buildUnlocked, leadsOffered } from "./helpers";

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

/**
 * The account pages (Billing, Support, Profile) open once we approve a
 * website sign-up; until then they go back to the home page.
 */
export async function requireApproved() {
  const dashboard = await getDashboard();
  if (awaitingApproval(dashboard.client)) redirect("/dashboard");
  return dashboard;
}

/** The Leads Tool's pages, for clients it's offered to. */
export async function requireLeadsOffered() {
  const dashboard = await getDashboard();
  if (!leadsOffered(dashboard.client)) redirect("/dashboard");
  return dashboard;
}

/**
 * The build pages (Questionnaire, Brand assets, Blueprint, Design), once
 * the agreement is signed and billing is set up; until then, Project
 * status, which shows what to do first.
 */
export async function requireBuildUnlocked() {
  const dashboard = await getDashboard();
  if (dashboard.client.website && !buildUnlocked(dashboard.client))
    redirect("/dashboard/website");
  return dashboard;
}
