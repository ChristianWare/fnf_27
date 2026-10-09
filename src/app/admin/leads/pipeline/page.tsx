import type { Metadata } from "next";
import Pipeline from "@/components/Dashboard/Leads/Pipeline";
import { requireStudioLeads } from "@/lib/leads/server";

export const metadata: Metadata = { title: "Pipeline" };

export default async function StudioPipelinePage() {
  await requireStudioLeads();
  return <Pipeline />;
}
