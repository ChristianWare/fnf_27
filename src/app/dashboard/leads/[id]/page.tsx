import type { Metadata } from "next";
import Lead from "@/components/Dashboard/Leads/Lead";
import { getLeads, requireLeads, targetIn } from "@/lib/leads/server";
import { leadExtras } from "@/lib/leads/workspace";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const workspace = await requireLeads();
  return {
    title: targetIn(workspace, decodeURIComponent((await params).id)).name,
  };
}

export default async function LeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const workspace = await requireLeads();
  const { client } = await getLeads();
  const target = targetIn(workspace, decodeURIComponent((await params).id));
  const extras = await leadExtras(client.id, target, workspace.settings.base);
  return <Lead id={target.id} extras={extras} />;
}
