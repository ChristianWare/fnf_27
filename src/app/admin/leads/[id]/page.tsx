import type { Metadata } from "next";
import Lead from "@/components/Dashboard/Leads/Lead";
import { STUDIO_ID } from "@/lib/leads/kinds";
import { requireStudioLeads, targetIn } from "@/lib/leads/server";
import { leadExtras } from "@/lib/leads/workspace";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const workspace = await requireStudioLeads();
  return {
    title: targetIn(workspace, decodeURIComponent((await params).id)).name,
  };
}

export default async function StudioLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const workspace = await requireStudioLeads();
  const target = targetIn(workspace, decodeURIComponent((await params).id));
  const extras = await leadExtras(STUDIO_ID, target, workspace.settings.base);
  return <Lead id={target.id} extras={extras} />;
}
