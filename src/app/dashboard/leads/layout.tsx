import type { ReactNode } from "react";
import { LeadsProvider } from "@/components/Dashboard/Leads/Store";
import { getLeads } from "@/lib/leads/server";

// Saving a lead finds the decision-maker and writes the scripts, which can
// take a little while.
export const maxDuration = 60;

// Every leads page shares one store, so a lead saved on Find is on Today
// and in the Pipeline straight away.
export default async function LeadsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { page, viewingAs } = await getLeads();
  if (page.state !== "READY") return children;
  return (
    <LeadsProvider
      workspace={page.workspace}
      base='/dashboard/leads'
      where='client'
      readOnly={viewingAs}
    >
      {children}
    </LeadsProvider>
  );
}
