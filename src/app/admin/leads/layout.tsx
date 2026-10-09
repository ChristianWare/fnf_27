import type { ReactNode } from "react";
import { LeadsProvider } from "@/components/Dashboard/Leads/Store";
import { getStudioLeads } from "@/lib/leads/server";

// Saving a lead finds the decision-maker and writes the scripts.
export const maxDuration = 60;

// The studio's own Leads Tool: the same pages clients see, on the studio's
// own market and saved leads. Free for admins.
export default async function StudioLeadsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { page } = await getStudioLeads();
  return (
    <LeadsProvider
      workspace={page.workspace}
      base='/admin/leads'
      where='studio'
    >
      {children}
    </LeadsProvider>
  );
}
