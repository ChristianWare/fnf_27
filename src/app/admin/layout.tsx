import type { Metadata } from "next";
import type { ReactNode } from "react";
import Shell from "@/components/Dashboard/Shell/Shell";
import { adminNav } from "@/components/Admin/nav";
import { adminQueue, getAdmin, studioStats } from "@/lib/admin";
import { initials } from "@/lib/dashboard/format";

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

  return (
    <Shell
      nav={adminNav(studioStats(clients), queue.length)}
      business='Fonts & Footers'
      plan='Admin'
      tone='admin'
      mark='FF'
      user={{
        name: user.name,
        email: user.email,
        initials: initials(user.name),
        sample: user.sample,
      }}
    >
      {children}
    </Shell>
  );
}
