// The sidebar, worked out from the client's plan and where their build is.
// Before launch, the website group follows the build in order. After
// launch, it leads with what matters now, and the build pages fold away
// under "Build history". Clients with the Leads Tool get a Leads group;
// everyone else gets one link to try it.

import type { IconName } from "../icons";
import type { Client } from "@/lib/dashboard/types";
import {
  blueprintCounts,
  isLive,
  leadsAccess,
  projectSteps,
} from "@/lib/dashboard";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** A count of things waiting for the client. */
  badge?: number;
  external?: boolean;
  /** Opens after launch. */
  locked?: boolean;
  /** Also active on the pages under it, e.g. one client's page. */
  match?: "prefix";
};

export type NavGroup = {
  title?: string;
  items: NavItem[];
  fold?: { label: string; items: NavItem[] };
};

/** `leadsDue`: leads to reach or follow up with today. */
export function buildNav(client: Client, leadsDue = 0): NavGroup[] {
  const groups: NavGroup[] = [
    { items: [{ href: "/dashboard", label: "Dashboard", icon: "home" }] },
  ];

  const website = client.website;
  const live = isLive(client);

  if (website) {
    const steps = projectSteps(client);
    const yours = (...ids: string[]) =>
      steps.filter((s) => ids.includes(s.id) && s.state === "you").length ||
      undefined;

    const status: NavItem = {
      href: "/dashboard/website",
      label: "Project status",
      icon: "status",
    };
    const documents: NavItem = {
      href: "/dashboard/website/documents",
      label: "Documents",
      icon: "file",
      badge:
        client.documents.filter((d) => d.status === "AWAITING").length ||
        undefined,
    };
    const questionnaire: NavItem = {
      href: "/dashboard/website/questionnaire",
      label: "Questionnaire",
      icon: "clipboard",
      badge: yours("questionnaire", "booking"),
    };
    const assets: NavItem = {
      href: "/dashboard/website/assets",
      label: "Brand assets",
      icon: "image",
      badge: yours("assets"),
    };
    const blueprint: NavItem = {
      href: "/dashboard/website/blueprint",
      label: "Blueprint",
      icon: "blueprint",
      badge: blueprintCounts(client.blueprint).review || undefined,
    };
    const design: NavItem = {
      href: "/dashboard/website/design",
      label: "Design",
      icon: "palette",
      badge: yours("design"),
    };
    const changes: NavItem = {
      href: "/dashboard/website/changes",
      label: "Change requests",
      icon: "pen",
      locked: !live,
    };
    const growth: NavItem = {
      href: "/dashboard/growth",
      label: "Growth",
      icon: "chart",
      locked: !live,
    };

    groups.push(
      live
        ? {
            title: "Your website",
            items: [status, growth, changes, documents],
            fold: {
              label: "Build history",
              items: [questionnaire, assets, blueprint, design],
            },
          }
        : {
            title: "Your website",
            items: [
              status,
              documents,
              questionnaire,
              assets,
              blueprint,
              design,
              changes,
              growth,
            ],
          },
    );
  }

  // The Leads Tool's full set of pages (Today, Find, Pipeline, Settings)
  // comes back with its nightly jobs; until then, one page.
  if (leadsAccess(client) !== "NONE" && leadsDue > 0) {
    groups.push({
      title: "Leads",
      items: [
        {
          href: "/dashboard/leads",
          label: "Today",
          icon: "target",
          badge: leadsDue || undefined,
        },
        { href: "/dashboard/leads/find", label: "Find leads", icon: "search" },
        { href: "/dashboard/leads/pipeline", label: "Pipeline", icon: "chart" },
        {
          href: "/dashboard/leads/settings",
          label: "Lead settings",
          icon: "settings",
        },
      ],
    });
  }

  const tools: NavItem[] = [];
  if (website?.plan === "FULL_PLATFORM" && live && website.bookingAdminUrl) {
    tools.push({
      href: website.bookingAdminUrl,
      label: "Booking dashboard",
      icon: "booking",
      external: true,
    });
  }
  if (leadsAccess(client) === "NONE" || leadsDue === 0) {
    tools.push({
      href: "/dashboard/leads",
      label: "Leads Tool",
      icon: "target",
    });
  }
  if (tools.length) groups.push({ title: "Tools", items: tools });

  groups.push({
    title: "Account",
    items: [
      { href: "/dashboard/billing", label: "Billing", icon: "card" },
      {
        href: "/dashboard/support",
        label: "Support",
        icon: "message",
        badge: client.threads.filter((t) => t.unread).length || undefined,
      },
      { href: "/dashboard/profile", label: "Profile", icon: "user" },
    ],
  });

  return groups;
}
