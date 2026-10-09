// The Leads Tool for whoever is looking, once per request: a client's own
// (or the one an admin is viewing as), or the studio's. Server only.

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getDashboard, leadsAccess } from "@/lib/dashboard";
import { requireAdmin } from "@/lib/auth/dal";
import { wants } from "@/lib/auth/users";
import { clientPeople } from "@/lib/data/write";
import { STUDIO_ID } from "./kinds";
import { ensureStudio, loadWorkspace, type Loaded } from "./workspace";
import type { Account, EventLead } from "./types";

export type LeadsState = { state: "NONE" } | { state: "OFF" } | Loaded;

/** A client's Leads Tool, as they (or an admin viewing as them) see it. */
export const getLeads = cache(async () => {
  const { user, client, now, viewingAs } = await getDashboard();
  const access = leadsAccess(client);
  let page: LeadsState;
  if (access === "NONE") page = { state: "NONE" };
  else if (!client.leads.enabled) page = { state: "OFF" };
  else {
    // The morning email is each person's own; an admin sees the owner's.
    const person = viewingAs ? (await clientPeople(client.id))[0] : undefined;
    page = await loadWorkspace({
      clientId: client.id,
      access,
      trialEndsAt: client.leads.trialEndsAt,
      billing: {
        raw: client.leads.raw,
        subscribed: client.leads.subscribed,
        nextBillingAt: client.leads.nextBillingAt,
      },
      morningEmail: wants(
        { notify: person ? (person.notify ?? {}) : user.notify },
        "digest",
      ),
      defaults: {
        company: client.business,
        name: client.contact.name,
        phone: client.contact.phone,
        website: client.website?.domain,
        city: client.city,
      },
    });
  }
  return { user, client, now, viewingAs, page };
});

/** The workspace, or back to the Leads Tool page. */
export async function requireLeads() {
  const { page } = await getLeads();
  if (page.state !== "READY") redirect("/dashboard/leads");
  return page.workspace;
}

/** The studio's own Leads Tool, for admins. Free, and always on. */
export const getStudioLeads = cache(async () => {
  const user = await requireAdmin();
  await ensureStudio();
  const page = await loadWorkspace({
    clientId: STUDIO_ID,
    access: "STUDIO",
    billing: { raw: "ACTIVE", subscribed: false },
    morningEmail: wants(user, "leads"),
    defaults: {
      company: "Fonts & Footers",
      name: user.name,
      phone: user.phone ?? "",
      website: "fontsandfooters.com",
      city: "Scottsdale, AZ",
    },
  });
  return { user, now: new Date().toISOString(), page };
});

export async function requireStudioLeads() {
  const { page } = await getStudioLeads();
  return page.workspace;
}

/** A lead in a workspace, or a 404. */
export function targetIn(
  workspace: { accounts: Account[]; events: EventLead[] },
  id: string,
): Account | EventLead {
  const target =
    workspace.accounts.find((a) => a.id === id) ??
    workspace.events.find((e) => e.id === id);
  if (!target) notFound();
  return target;
}
