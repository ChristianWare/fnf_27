// Everything an admin page needs: the signed-in admin, every client, the
// team, and "now". Runs once per request.

import { cache } from "react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { sampleAccounts, type Role } from "@/lib/auth/users";
import { allClients } from "@/lib/dashboard/clients";
import { lastActivity } from "./derive";
import type { Client } from "@/lib/dashboard/types";

export * from "./derive";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** The business a client signs in for. */
  business?: string;
  clientId?: string;
  lastActiveAt?: string;
  /** The person who set up the studio; their role can't change. */
  owner?: boolean;
};

/** Everyone with an account: admins, then every client's contact. */
function team(clients: Client[]): TeamMember[] {
  const admins: TeamMember[] = sampleAccounts
    .filter((a) => a.role === "ADMIN")
    .map((a, i) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      role: a.role,
      owner: i === 0,
    }));
  const people: TeamMember[] = clients.map((c) => {
    const account = sampleAccounts.find((a) => a.clientId === c.id);
    return {
      id: account?.id ?? `user-${c.id}`,
      name: c.contact.name,
      email: account?.email ?? c.contact.email,
      role: account?.role ?? "CLIENT",
      business: c.business,
      clientId: c.id,
      lastActiveAt: lastActivity(c),
    };
  });
  return [...admins, ...people];
}

export const getAdmin = cache(async () => {
  const user = await requireAdmin();
  const now = new Date();
  // SAMPLE: every sample client. After the move, the database.
  const clients = allClients(now);
  return {
    user,
    clients,
    team: team(clients),
    now: now.toISOString(),
  };
});

/** One client for an admin page, or a 404. */
export async function getAdminClient(id: string) {
  const admin = await getAdmin();
  const client = admin.clients.find((c) => c.id === id);
  if (!client) notFound();
  return { ...admin, client };
}
