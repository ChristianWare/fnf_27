import type { Metadata } from "next";
import Today from "@/components/Dashboard/Leads/Today";
import NotReady from "@/components/Dashboard/Leads/NotReady";
import { getStudioLeads } from "@/lib/leads/server";

export const metadata: Metadata = { title: "Leads" };

export default async function StudioLeadsPage() {
  const { user, page } = await getStudioLeads();
  if (!page.workspace.market.ready) {
    return (
      <NotReady
        state='LOADING'
        market={page.workspace.settings.base.city}
        action={{ href: "/admin/leads-tool", label: "Run the market now" }}
      />
    );
  }
  return <Today firstName={user.name.split(" ")[0] || "there"} />;
}
