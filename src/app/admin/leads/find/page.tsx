import type { Metadata } from "next";
import Find from "@/components/Dashboard/Leads/Find";
import { requireStudioLeads } from "@/lib/leads/server";

export const metadata: Metadata = { title: "Find leads" };

export default async function StudioFindPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  await requireStudioLeads();
  const { tab } = await searchParams;
  return <Find initialTab={tab === "events" ? "events" : "accounts"} />;
}
