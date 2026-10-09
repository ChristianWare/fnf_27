import type { Metadata } from "next";
import LeadsTool from "@/components/Dashboard/LeadsTool/LeadsTool";
import Today from "@/components/Dashboard/Leads/Today";
import NotReady from "@/components/Dashboard/Leads/NotReady";
import { LEADS } from "@/lib/dashboard/plans";
import { getLeads } from "@/lib/leads/server";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage() {
  const { client, now, page, viewingAs } = await getLeads();
  if (page.state === "NONE") {
    const before =
      client.leads.raw === "ENDED" || Boolean(client.leads.startedAt);
    return (
      <LeadsTool
        trialDays={LEADS.trialDays}
        monthly={LEADS.monthly}
        now={now}
        readOnly={viewingAs}
        ended={
          before
            ? {
                at: client.leads.endedAt,
                // Never paid for it: it was the trial that ended.
                trial: !client.invoices.some((i) =>
                  /leads tool/i.test(i.description),
                ),
              }
            : undefined
        }
      />
    );
  }
  const trialEndsAt =
    client.leads.status === "TRIAL" ? client.leads.trialEndsAt : undefined;
  if (page.state === "OFF") {
    return (
      <NotReady
        state='OFF'
        trialEndsAt={trialEndsAt}
        action={{ href: "/dashboard/support", label: "Ask a question" }}
      />
    );
  }
  if (!page.workspace.market.ready) {
    return (
      <NotReady
        state='LOADING'
        market={page.workspace.settings.base.city}
        trialEndsAt={trialEndsAt}
        action={{ href: "/dashboard/leads/settings", label: "Lead settings" }}
      />
    );
  }
  return <Today firstName={client.contact.name.split(" ")[0]} />;
}
