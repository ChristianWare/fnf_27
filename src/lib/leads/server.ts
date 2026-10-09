// The Leads Tool for the signed-in client, once per request. Server only.
//
// The Leads Tool's own data (markets, saved leads, scripts) arrives with
// its nightly jobs in the next update. Until then there's no workspace:
// clients with access see that it's being set up, and everyone else sees
// the free-trial page.

import { cache } from "react";
import { redirect } from "next/navigation";
import { getDashboard } from "@/lib/dashboard";
import type { LeadsWorkspace } from "./workspace";

const notYet = (): LeadsWorkspace | undefined => undefined;

export const getLeads = cache(async () => {
  const { client, now } = await getDashboard();
  return { client, now, workspace: notYet() };
});

/** The workspace, or back to the Leads Tool page. */
export async function requireLeads() {
  const { workspace } = await getLeads();
  if (!workspace) redirect("/dashboard/leads");
  return workspace;
}
