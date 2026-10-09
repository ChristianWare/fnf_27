import type { Metadata } from "next";
import LeadsTool from "@/components/Dashboard/LeadsTool/LeadsTool";
import Today from "@/components/Dashboard/Leads/Today";
import {
  ButtonLink,
  Empty,
  PageHead,
  Panel,
} from "@/components/Dashboard/ui/ui";
import { leadsAccess } from "@/lib/dashboard";
import { fmtDate } from "@/lib/dashboard/format";
import { LEADS } from "@/lib/dashboard/plans";
import { getLeads } from "@/lib/leads/server";

export const metadata: Metadata = { title: "Leads" };

export default async function LeadsPage() {
  const { client, now, workspace } = await getLeads();
  if (leadsAccess(client) === "NONE") {
    return (
      <LeadsTool
        trialDays={LEADS.trialDays}
        monthly={LEADS.monthly}
        now={now}
      />
    );
  }
  if (!workspace) {
    return (
      <>
        <PageHead
          crumb='Leads'
          title='Leads Tool'
          text='The hotels, venues, companies and events near you that book rides, every morning.'
        />
        <Panel>
          <Empty
            icon='target'
            title='Your Leads Tool is being set up'
            text={`We're moving the Leads Tool onto its new engine: fresh accounts and events near you every morning, with the right person to contact and what to say. It'll be ready here very soon, and there's nothing for you to do.${client.leads.status === "TRIAL" && client.leads.trialEndsAt ? ` Your free trial runs until ${fmtDate(client.leads.trialEndsAt)}.` : ""}`}
          >
            <ButtonLink href='/dashboard/support' variant='light'>
              Ask a question
            </ButtonLink>
          </Empty>
        </Panel>
      </>
    );
  }
  return <Today firstName={client.contact.name.split(" ")[0]} />;
}
