import type { Metadata } from "next";
import type { ReactNode } from "react";
import Shell from "@/components/Dashboard/Shell/Shell";
import { adminNav } from "@/components/Admin/nav";
import { adminQueue, getAdmin, studioStats } from "@/lib/admin";
import { initials } from "@/lib/dashboard/format";
import { STUDIO_ID } from "@/lib/leads/kinds";
import { leadsSidebar } from "@/lib/leads/workspace";
import { countNewAudits } from "@/lib/audit/store";
import { countDueProspects } from "@/lib/prospects/store";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s - Admin - Fonts & Footers" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, clients, now } = await getAdmin();
  const queue = adminQueue(clients, now);
  const [leads, auditsNew, prospectsDue] = await Promise.all([
    leadsSidebar(STUDIO_ID),
    countNewAudits(),
    countDueProspects(),
  ]);

  return (
    <Shell
      nav={adminNav(
        studioStats(clients),
        queue.length,
        leads.due,
        auditsNew,
        prospectsDue,
      )}
      business='Fonts & Footers'
      plan='Admin'
      tone='admin'
      mark='FF'
      user={{
        name: user.name,
        email: user.email,
        initials: initials(user.name),
      }}
    >
      {children}
    </Shell>
  );
}
