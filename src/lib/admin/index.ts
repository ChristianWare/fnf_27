// Everything an admin page needs: the signed-in admin, every client, the
// team, and "now". Runs once per request.

import { cache } from "react";
import { notFound } from "next/navigation";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdmin } from "@/lib/auth/dal";
import type { Role } from "@/lib/auth/users";
import { loadClient, loadClients } from "@/lib/data/clients";
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
  /** An admin who hasn't set a password yet. */
  invited?: boolean;
};

/** Everyone with an account: admins first, then each client's people. */
async function loadTeam(clients: Client[]): Promise<TeamMember[]> {
  const rows = await db
    .select()
    .from(schema.users)
    .orderBy(asc(schema.users.createdAt));
  const business = new Map(clients.map((c) => [c.id, c.business]));
  return rows
    .filter(
      (u) => u.role === "ADMIN" || (u.clientId && business.has(u.clientId)),
    )
    .map((u) => ({
      id: u.id,
      name: u.name || u.email,
      email: u.email,
      role: u.role,
      business: u.clientId ? business.get(u.clientId) : undefined,
      clientId: u.clientId ?? undefined,
      lastActiveAt: u.lastActiveAt?.toISOString(),
      owner: u.isOwner,
      invited: u.role === "ADMIN" && !u.passwordHash,
    }))
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "ADMIN" ? -1 : 1));
}

export const getAdmin = cache(async () => {
  const user = await requireAdmin();
  const clients = await loadClients({ archived: false });
  return {
    user,
    clients,
    team: await loadTeam(clients),
    now: new Date().toISOString(),
  };
});

/** Archived clients, for the Clients page. */
export const getArchived = cache(async () => {
  await requireAdmin();
  return loadClients({ archived: true });
});

/** One client for an admin page, archived ones too, or a 404. */
export async function getAdminClient(id: string) {
  const admin = await getAdmin();
  const client =
    admin.clients.find((c) => c.id === id) ?? (await loadClient(id));
  if (!client) notFound();
  return { ...admin, client };
}
