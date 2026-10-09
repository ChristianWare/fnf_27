import type { Metadata } from "next";
import Settings from "@/components/Dashboard/Leads/Settings";
import { requireLeads } from "@/lib/leads/server";

export const metadata: Metadata = { title: "Lead settings" };

export default async function LeadSettingsPage() {
  await requireLeads();
  return <Settings />;
}
