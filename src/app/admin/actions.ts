"use server";

// Admin-only actions. Every one checks the signed-in user is an admin
// first, whatever the page around it showed.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { VIEW_AS_COOKIE, requireAdmin } from "@/lib/auth/dal";
import type { Role } from "@/lib/auth/users";
import { getAdmin } from "@/lib/admin";
import {
  removeProblem,
  roleChangeProblem,
  validEmail,
} from "@/lib/admin/roles";
import { findClient } from "@/lib/dashboard/clients";

export type ActionResult = { ok: true } | { ok: false; error: string };

/* ── View as client ── */

// Open a client's dashboard exactly as they see it. Only admins can start
// it, and the dashboard only honours it for admins.
export async function viewAsClient(clientId: string) {
  await requireAdmin();
  if (!findClient(clientId, new Date())) redirect("/admin/clients");

  (await cookies()).set(VIEW_AS_COOKIE, clientId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 2,
  });
  redirect("/dashboard");
}

export async function stopViewingAs(clientId?: string) {
  await requireAdmin();
  (await cookies()).delete(VIEW_AS_COOKIE);
  redirect(clientId ? `/admin/clients/${clientId}` : "/admin/clients");
}

/* ── Team and roles ── */

// SAMPLE: the accounts live in a file for now, so these check everything
// and save nothing; a change lasts until you reload. After the move, each
// one saves to the database where it says so. A new role counts from the
// person's next page load, since every page reads the role fresh.

export async function changeRole(
  userId: string,
  role: Role,
): Promise<ActionResult> {
  const { user, team } = await getAdmin();
  const target = team.find((m) => m.id === userId);
  if (!target) return { ok: false, error: "We couldn't find that account." };
  if (target.role === role) return { ok: true };

  const admins = team.filter((m) => m.role === "ADMIN").length;
  const problem = roleChangeProblem(user.id, target, role, admins);
  if (problem) return { ok: false, error: problem };

  // After the move: await db.user.update({ where: { id: userId }, data: { role } });
  return { ok: true };
}

export async function inviteAdmin(
  name: string,
  email: string,
): Promise<ActionResult> {
  const { team } = await getAdmin();
  if (!name.trim()) return { ok: false, error: "Add their name." };
  if (!validEmail(email)) {
    return { ok: false, error: "That email doesn't look right." };
  }
  const taken = team.some(
    (m) => m.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (taken) {
    return {
      ok: false,
      error:
        "Someone already signs in with that email. Change their role instead.",
    };
  }

  // After the move: create the account as an ADMIN and email them a link
  // to set their password.
  return { ok: true };
}

export async function removeAdmin(userId: string): Promise<ActionResult> {
  const { user, team } = await getAdmin();
  const target = team.find((m) => m.id === userId);
  if (!target) return { ok: false, error: "We couldn't find that account." };

  const admins = team.filter((m) => m.role === "ADMIN").length;
  const problem = removeProblem(user.id, target, admins);
  if (problem) return { ok: false, error: problem };

  // After the move: delete the account, or switch it off, and sign them out.
  return { ok: true };
}
