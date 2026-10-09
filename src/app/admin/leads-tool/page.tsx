import type { Metadata } from "next";
import LeadsToolAdmin from "@/components/Admin/LeadsTool/LeadsToolAdmin";
import { ButtonLink, PageHead } from "@/components/Dashboard/ui/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { getLeadsAdmin } from "@/lib/leads/admin";

export const metadata: Metadata = { title: "Leads Tool" };

// "Run now" keeps working after the click, for up to about four minutes.
export const maxDuration = 300;

export default async function LeadsToolPage() {
  await requireAdmin();
  const data = await getLeadsAdmin();
  return (
    <>
      <PageHead
        crumb='Settings'
        title='Leads Tool'
        text='The nightly runs (1 to 5 AM Arizona time), the calendars each market reads, who has it switched on, and roughly what it all costs.'
      >
        <ButtonLink href='/admin/leads' variant='light' icon='arrow'>
          Your own leads
        </ButtonLink>
      </PageHead>
      <LeadsToolAdmin data={data} />
    </>
  );
}
