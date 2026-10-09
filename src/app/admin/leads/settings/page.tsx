import type { Metadata } from "next";
import Settings from "@/components/Dashboard/Leads/Settings";
import { requireStudioLeads } from "@/lib/leads/server";

export const metadata: Metadata = { title: "Lead settings" };

export default async function StudioLeadSettingsPage() {
  await requireStudioLeads();
  return <Settings />;
}
