// The admin sidebar. Counts show what's waiting in each place.

import type { NavGroup } from "@/components/Dashboard/Shell/nav";
import type { studioStats } from "@/lib/admin/derive";

export function adminNav(
  stats: ReturnType<typeof studioStats>,
  queue: number,
): NavGroup[] {
  return [
    {
      items: [
        {
          href: "/admin",
          label: "Today",
          icon: "home",
          badge: queue || undefined,
        },
      ],
    },
    {
      title: "Studio",
      items: [
        {
          href: "/admin/clients",
          label: "Clients",
          icon: "users",
          badge: stats.newSignups || undefined,
          match: "prefix",
        },
        {
          href: "/admin/requests",
          label: "Change requests",
          icon: "pen",
          badge: stats.openRequests || undefined,
        },
        {
          href: "/admin/messages",
          label: "Messages",
          icon: "inbox",
          badge: stats.unread || undefined,
        },
      ],
    },
    {
      title: "Money",
      items: [
        {
          href: "/admin/billing",
          label: "Billing",
          icon: "card",
          badge: stats.pastDue || undefined,
        },
      ],
    },
    {
      title: "Settings",
      items: [
        { href: "/admin/team", label: "Team and roles", icon: "shield" },
        {
          href: "/admin/settings",
          label: "Plans and billing",
          icon: "settings",
        },
      ],
    },
  ];
}
