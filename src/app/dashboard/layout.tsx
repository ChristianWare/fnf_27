import type { Metadata } from "next";
import type { ReactNode } from "react";
import Shell from "@/components/Dashboard/Shell/Shell";
import { buildNav } from "@/components/Dashboard/Shell/nav";
import ViewAs from "@/components/Dashboard/ViewAs/ViewAs";
import {
  awaitingApproval,
  getDashboard,
  leadsAccess,
  planName,
} from "@/lib/dashboard";
import { initials } from "@/lib/dashboard/format";
import { leadsSidebar } from "@/lib/leads/workspace";
import Tour from "@/components/Dashboard/Tour/Tour";
import { tourFor, tourKey } from "@/lib/dashboard/tours";

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
  const leads =
    leadsAccess(client) !== "NONE" && client.leads.enabled
      ? await leadsSidebar(client.id)
      : { ready: false, due: 0 };
  const pending = awaitingApproval(client);
  // The plan they have, or the one they asked for while we approve it.
  const planId = client.website?.plan ?? (pending ? client.request?.plan : undefined);
  const tone =
    planId === "FULL_PLATFORM"
      ? "platform"
      : planId === "WEBSITE_ONLY"
        ? "website"
        : "leads";

  const nav = buildNav(client, leads);
  // The tour for their plan and stage. It opens on its own until they've
  // seen it; an admin viewing as them only gets it from the button.
  const tour = tourFor(client, nav);
  const seen = user.notify?.[tourKey(tour.id)] === true;

  return (
    <Shell
      nav={nav}
      business={client.business}
      plan={planName(client)}
      tone={tone}
      user={{
        name: user.name,
        email: user.email,
        initials: initials(user.name),
      }}
      promo={!client.website && !pending}
      banner={
        viewingAs ? (
          <ViewAs business={client.business} clientId={client.id} />
        ) : undefined
      }
    >
      {children}
      <Tour tour={tour} autoStart={!seen && !viewingAs} />
    </Shell>
  );
}
