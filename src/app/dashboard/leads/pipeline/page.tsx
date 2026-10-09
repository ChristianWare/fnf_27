import type { Metadata } from "next";
import Pipeline from "@/components/Dashboard/Leads/Pipeline";
import { requireLeads } from "@/lib/leads/server";

export const metadata: Metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  await requireLeads();
  return <Pipeline />;
}
