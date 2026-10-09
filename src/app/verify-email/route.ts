// GET /verify-email?token=…: the link in the "confirm your email" email.
// Confirms the address (or switches to a new one they asked for), starts a
// Leads Tool trial for Leads sign-ups, tells the studio about a new
// sign-up, then on to sign in. Clicking it twice is harmless: link
// scanners in some inboxes open it before the person does.

import { NextResponse } from "next/server";
import { and, eq, gt, isNull, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { hashToken } from "@/lib/server/ids";
import { url } from "@/lib/server/config";
import { alertAdmins } from "@/lib/server/notify";
import { addActivity } from "@/lib/data/write";
import { LEADS, PLANS } from "@/lib/dashboard/plans";

const { authTokens, users, clients } = schema;

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const [link] = token
    ? await db
        .select({ userId: authTokens.userId })
        .from(authTokens)
        .where(
          and(
            eq(authTokens.tokenHash, hashToken(token)),
            eq(authTokens.kind, "VERIFY"),
            gt(authTokens.expiresAt, new Date()),
          ),
        )
        .limit(1)
    : [];
  const go = (path: string) =>
    NextResponse.redirect(new URL(path, request.url));
  if (!link) return go("/login?verify=expired");

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, link.userId))
    .limit(1);
  if (!user) return go("/login?verify=expired");

  // A new address they asked to switch to.
  if (user.pendingEmail) {
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, user.pendingEmail), ne(users.id, user.id)))
      .limit(1);
    if (taken) return go("/dashboard/profile?email=taken");
    await db
      .update(users)
      .set({
        email: user.pendingEmail,
        pendingEmail: null,
        emailVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
    return go("/dashboard/profile?email=confirmed");
  }

  // The first click on a new sign-up's link.
  const [fresh] = await db
    .update(users)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(users.id, user.id), isNull(users.emailVerifiedAt)))
    .returning();
  if (fresh?.clientId)
    await welcomeNewSignUp(fresh.clientId, fresh.name, fresh.email);

  return go(`/login?verified=1&email=${encodeURIComponent(user.email)}`);
}

async function welcomeNewSignUp(clientId: string, name: string, email: string) {
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  if (!client || client.approvedAt) return;

  if (client.requestPlan === "LEADS" && client.leadsStatus === "NONE") {
    const now = new Date();
    await db
      .update(clients)
      .set({
        leadsStatus: "TRIAL",
        leadsStartedAt: now,
        leadsTrialEndsAt: new Date(
          now.getTime() + LEADS.trialDays * 86_400_000,
        ),
        updatedAt: now,
      })
      .where(and(eq(clients.id, clientId), eq(clients.leadsStatus, "NONE")));
    await addActivity(
      clientId,
      "leads",
      `Your ${LEADS.trialDays}-day Leads Tool trial started`,
      "/dashboard/leads",
    );
  }

  const plan =
    client.requestPlan === "LEADS"
      ? `${LEADS.name} trial`
      : client.requestPlan
        ? PLANS[client.requestPlan].name
        : "an account";
  await alertAdmins(
    "signup",
    `New sign-up: ${client.business}`,
    {
      eyebrow: "New sign-up",
      heading: `${client.business} signed up for the ${plan}`,
      paragraphs: [
        client.requestPlan === "LEADS"
          ? "Their free trial has started on its own. Nothing to approve."
          : "They're waiting for you to approve them and set their plan and prices.",
      ],
      ...(client.requestMessage
        ? { quote: { text: client.requestMessage, by: name } }
        : {}),
      details: [
        ["Name", name],
        ["Email", email],
        ...(client.phone
          ? ([["Phone", client.phone]] as [string, string][])
          : []),
        ["City", [client.city, client.state].filter(Boolean).join(", ")],
      ],
      button: {
        label:
          client.requestPlan === "LEADS"
            ? "Open their account"
            : "Review and approve",
        href: url(`/admin/clients/${clientId}`),
      },
    },
    `New sign-up: ${client.business} (${plan})`,
  );
}
