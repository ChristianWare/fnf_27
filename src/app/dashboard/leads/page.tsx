import type { Metadata } from "next";
import LeadsTool from "@/components/Dashboard/LeadsTool/LeadsTool";
import Today from "@/components/Dashboard/Leads/Today";
import { LEADS } from "@/lib/dashboard/plans";
import { getLeads } from "@/lib/leads/server";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage() {
  const { client, now, workspace } = await getLeads();
  if (!workspace) {
    return (
      <LeadsTool
        trialDays={LEADS.trialDays}
        monthly={LEADS.monthly}
        now={now}
      />
    );
  }
  return <Today firstName={client.contact.name.split(" ")[0]} />;
}
