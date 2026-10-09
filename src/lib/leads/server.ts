// The Leads Tool for the signed-in client, once per request. Server only.

import { cache } from "react";
import { redirect } from "next/navigation";
import { getDashboard } from "@/lib/dashboard";
import { leadsWorkspace } from "./workspace";

export const getLeads = cache(async () => {
  const { client, now } = await getDashboard();
  return { client, now, workspace: leadsWorkspace(client, now) };
});

/** The workspace, or back to the Leads Tool page to start a trial. */
export async function requireLeads() {
  const { workspace } = await getLeads();
  if (!workspace) redirect("/dashboard/leads");
  return workspace;
}
