// Who may change whose role. The same rules run in the browser, to grey out
// what you can't do, and on the server, which has the final say.

import type { Role } from "@/lib/auth/users";

export type RoleTarget = {
  id: string;
  role: Role;
  /** The person who set up the studio. Always an admin. */
  owner?: boolean;
  /** The business they sign in for, if they're a client. */
  clientId?: string;
};

/**
 * Why `actorId` can't give `target` this role, or undefined if they can.
 * Giving someone the role they already have is fine: nothing changes.
 */
export function roleChangeProblem(
  actorId: string,
  target: RoleTarget,
  role: Role,
  admins: number,
) {
  if (role !== "ADMIN" && role !== "CLIENT") return "That isn't a role.";
  if (target.id === actorId) return "You can't change your own role.";
  if (target.owner) return "The owner is always an admin.";
  if (role === "CLIENT" && !target.clientId) {
    return "They don't have a business to sign in for. Remove them instead.";
  }
  if (target.role === "ADMIN" && admins <= 1) {
    return "There has to be at least one admin.";
  }
  return undefined;
}

/** Why `actorId` can't remove admin `target`, or undefined if they can. */
export function removeProblem(
  actorId: string,
  target: RoleTarget,
  admins: number,
) {
  if (target.role !== "ADMIN") return "Only admins are removed here.";
  if (target.id === actorId) return "You can't remove yourself.";
  if (target.owner) return "The owner can't be removed.";
  if (target.clientId) {
    return "They sign in for a business too. Make them a client instead.";
  }
  if (admins <= 1) return "There has to be at least one admin.";
  return undefined;
}

export const validEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
