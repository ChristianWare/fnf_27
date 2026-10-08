import type { Metadata } from "next";
import LeadsTool from "@/components/Dashboard/LeadsTool/LeadsTool";
import { getDashboard, leadsAccess } from "@/lib/dashboard";
import { LEADS, LEADS_TOOL_URL } from "@/lib/dashboard/plans";

export const metadata: Metadata = { title: "Leads Tool" };

export default async function LeadsPage() {
  const { client, now } = await getDashboard();
  return (
    <LeadsTool
      access={leadsAccess(client)}
      trialDays={LEADS.trialDays}
      trialEndsAt={client.leads.trialEndsAt}
      monthly={LEADS.monthly}
      toolUrl={LEADS_TOOL_URL}
      now={now}
    />
  );
}
