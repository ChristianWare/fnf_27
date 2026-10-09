import type { ReactNode } from "react";
import { LeadsProvider } from "@/components/Dashboard/Leads/Store";
import { getLeads } from "@/lib/leads/server";

// Every leads page shares one store, so a lead saved on Find is on Today
// and in the Pipeline straight away.
export default async function LeadsLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { workspace } = await getLeads();
  if (!workspace) return children;
  return <LeadsProvider workspace={workspace}>{children}</LeadsProvider>;
}
