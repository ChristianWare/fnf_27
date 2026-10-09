import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Lead from "@/components/Dashboard/Leads/Lead";
import { requireLeads } from "@/lib/leads/server";

async function findTarget(id: string) {
  const workspace = await requireLeads();
  const target =
    workspace.accounts.find((a) => a.id === id) ??
    workspace.events.find((e) => e.id === id);
  if (!target) notFound();
  return target;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const target = await findTarget((await params).id);
  return { title: target.name };
}

export default async function LeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const target = await findTarget((await params).id);
  return <Lead id={target.id} />;
}
