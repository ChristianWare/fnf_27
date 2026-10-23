// The sidebar, worked out from the client's plan and where their build is.
// Before launch, the website group follows the build in order. After
// launch, it leads with what matters now, and the build pages fold away
// under "Build history". Clients with the Leads Tool get a Leads group;
// everyone else gets one link to try it.

import type { IconName } from "../icons";
import type { Client } from "@/lib/dashboard/types";
import {
  awaitingApproval,
  blueprintStatus,
  buildUnlocked,
  isLive,
  leadsAccess,
  leadsOffered,
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
  /** Greyed out and not a link, until something's done first. */
  disabled?: boolean;
  /** Why it's greyed out, shown on hover. */
  disabledReason?: string;
  /** Also active on the pages under it, e.g. one client's page. */
  match?: "prefix";
};

export type NavGroup = {
  title?: string;
  items: NavItem[];
  fold?: { label: string; items: NavItem[] };
};

/**
 * `leads.ready`: their Leads Tool is on and has leads in it. `leads.due`:
 * leads to reach or follow up with today.
 */
export function buildNav(
  client: Client,
  leads: { ready: boolean; due: number } = { ready: false, due: 0 },
): NavGroup[] {
  const groups: NavGroup[] = [
    { items: [{ href: "/dashboard", label: "Dashboard", icon: "home" }] },
  ];

  // Waiting for approval: the home page, and the account pages greyed out
  // until their plan, prices and any waived fee are set.
  if (awaitingApproval(client)) {
    groups.push({
      title: "Account",
      items: [
        {
          href: "/dashboard/billing",
          label: "Billing",
          icon: "card",
          disabled: true,
          disabledReason: "Opens once your account is approved",
        },
        {
          href: "/dashboard/support",
          label: "Support",
          icon: "message",
          disabled: true,
          disabledReason: "Opens once your account is approved",
        },
        {
          href: "/dashboard/profile",
          label: "Profile",
          icon: "user",
          disabled: true,
          disabledReason: "Opens once your account is approved",
        },
      ],
    });
    return groups;
  }

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
      badge: blueprintStatus(client.blueprint) === "REVIEW" ? 1 : undefined,
    };
    const design: NavItem = {
      href: "/dashboard/website/design",
      label: "Design",
      icon: "palette",
      badge: yours("design"),
    };
    // The build pages open once the agreement is signed and billing is
    // set up.
    if (!buildUnlocked(client)) {
      for (const item of [questionnaire, assets, blueprint, design]) {
        item.disabled = true;
        item.badge = undefined;
        item.disabledReason =
          "Opens once you've signed your agreement and set up billing";
      }
    }
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

  // The Leads Tool's pages, once it's on and its first leads are in.
  if (leadsAccess(client) !== "NONE" && leads.ready) {
    groups.push({
      title: "Leads",
      items: [
        {
          href: "/dashboard/leads",
          label: "Today",
          icon: "target",
          badge: leads.due || undefined,
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
  // Website Only clients aren't offered the Leads Tool.
  if (leadsOffered(client) && (leadsAccess(client) === "NONE" || !leads.ready)) {
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
