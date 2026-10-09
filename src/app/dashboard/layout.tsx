import type { Metadata } from "next";
import type { ReactNode } from "react";
import Shell from "@/components/Dashboard/Shell/Shell";
import { buildNav } from "@/components/Dashboard/Shell/nav";
import ViewAs from "@/components/Dashboard/ViewAs/ViewAs";
import { getDashboard, planName } from "@/lib/dashboard";
import { initials } from "@/lib/dashboard/format";
import { todaysMoves } from "@/lib/leads/advice";
import { getLeads } from "@/lib/leads/server";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, client, viewingAs } = await getDashboard();
  const { workspace, now } = await getLeads();
  const leadsDue = workspace
    ? todaysMoves(
        workspace.saved,
        (id) =>
          workspace.accounts.find((a) => a.id === id) ??
          workspace.events.find((e) => e.id === id),
        now,
      ).length
    : 0;
  const tone =
    client.website?.plan === "FULL_PLATFORM"
      ? "platform"
      : client.website
        ? "website"
        : "leads";

  return (
    <Shell
      nav={buildNav(client, leadsDue)}
      business={client.business}
      plan={planName(client)}
      tone={tone}
      user={{
        name: user.name,
        email: user.email,
        initials: initials(user.name),
      }}
      promo={!client.website}
      banner={
        viewingAs ? (
          <ViewAs business={client.business} clientId={client.id} />
        ) : undefined
      }
    >
      {children}
    </Shell>
  );
}
