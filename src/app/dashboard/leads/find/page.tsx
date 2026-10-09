import type { Metadata } from "next";
import Find from "@/components/Dashboard/Leads/Find";
import { requireLeads } from "@/lib/leads/server";

export const metadata: Metadata = { title: "Find leads" };

export default async function FindPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  await requireLeads();
  const { tab } = await searchParams;
  return <Find initialTab={tab === "events" ? "events" : "accounts"} />;
}
