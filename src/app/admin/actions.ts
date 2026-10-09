"use server";

// Admin-only actions: view as client, the team, approving and archiving
// clients, notes and links, messages, change requests and settings. Every
// one checks the signed-in user is an admin first, whatever the page
// around it showed.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { VIEW_AS_COOKIE, getSessionUser, requireAdmin } from "@/lib/auth/dal";
import type { Role, User } from "@/lib/auth/users";
import { createToken, findUserByEmail, normalEmail } from "@/lib/auth/accounts";
import { done, fail, type ActionResult } from "@/lib/actions";
import {
  removeProblem,
  roleChangeProblem,
  validEmail,
} from "@/lib/admin/roles";
import { addActivity, setSetting } from "@/lib/data/write";
import { loadClient } from "@/lib/data/clients";
import { createId } from "@/lib/server/ids";
import { url } from "@/lib/server/config";
import { emailClient, emailPerson } from "@/lib/server/notify";
import { errorText } from "@/lib/billing/stripe";
import { cancelEverythingNow, setWebsiteCancel } from "@/lib/billing/website";
import { serviceAgreement } from "@/lib/dashboard/agreement";
import { nextFirst } from "@/lib/dashboard/billing";
import { fmtDate, money } from "@/lib/dashboard/format";
import { todos } from "@/lib/dashboard/helpers";
import { PLANS } from "@/lib/dashboard/plans";
import type { ChangeStatus, PlanId } from "@/lib/dashboard/types";

export type { ActionResult } from "@/lib/actions";

const s = schema;

type Admin = { ok: false; error: string } | { ok: true; user: User };

async function admin(): Promise<Admin> {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN")
    return { ok: false, error: "Only admins can do that." };
  return { ok: true, user };
}

const refresh = () => {
  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard", "layout");
};

const first = (name: string) => name.split(" ")[0] || name;
const clean = (text: string, max = 5000) => (text ?? "").trim().slice(0, max);
const cents = (dollars: number) => Math.round(dollars * 100);

/* ── View as client ── */

// Open a client's dashboard exactly as they see it. Only admins can start
// it, and the dashboard only honours it for admins.
export async function viewAsClient(clientId: string) {
  await requireAdmin();
  if (!(await loadClient(clientId))) redirect("/admin/clients");

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

async function teamFacts() {
  const rows = await db.select().from(s.users);
  return {
    rows,
    activeAdmins: rows.filter((u) => u.role === "ADMIN" && u.passwordHash)
      .length,
  };
}

export async function changeRole(
  userId: string,
  role: Role,
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const { rows, activeAdmins } = await teamFacts();
  const target = rows.find((u) => u.id === userId);
  if (!target) return fail("We couldn't find that account.");
  if (target.role === role) return done();

  const problem = roleChangeProblem(
    a.user.id,
    {
      id: target.id,
      role: target.role,
      owner: target.isOwner,
      clientId: target.clientId ?? undefined,
    },
    role,
    activeAdmins,
  );
  if (problem) return fail(problem);

  await db
    .update(s.users)
    .set({ role, updatedAt: new Date() })
    .where(eq(s.users.id, userId));
  refresh();
  return done();
}

export async function inviteAdmin(
  name: string,
  email: string,
): Promise<ActionResult<{ id: string }>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const who = clean(name, 120);
  const address = normalEmail(email);
  if (!who) return fail("Add their name.");
  if (!validEmail(address)) return fail("That email doesn't look right.");
  if (await findUserByEmail(address)) {
    return fail(
      "Someone already signs in with that email. Change their role instead.",
    );
  }

  const id = createId();
  await db.insert(s.users).values({
    id,
    name: who,
    email: address,
    role: "ADMIN",
    emailVerifiedAt: new Date(),
  });
  const token = await createToken(id, "INVITE");
  await emailPerson(
    address,
    `${a.user.name} invited you to the Fonts & Footers admin`,
    {
      eyebrow: "You're invited",
      heading: `Welcome aboard, ${first(who)}`,
      paragraphs: [
        `${a.user.name} added you as an admin at Fonts & Footers: every client, billing, messages and the team.`,
        "Set your password to sign in.",
      ],
      button: {
        label: "Set your password",
        href: url(`/set-password?token=${token}`),
      },
      after: ["The link works for 7 days."],
    },
  );
  refresh();
  return done({ id });
}

export async function removeAdmin(userId: string): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const { rows, activeAdmins } = await teamFacts();
  const target = rows.find((u) => u.id === userId);
  if (!target) return fail("We couldn't find that account.");

  // Someone invited who never set a password can always be withdrawn.
  if (!(target.role === "ADMIN" && !target.passwordHash && !target.isOwner)) {
    const problem = removeProblem(
      a.user.id,
      {
        id: target.id,
        role: target.role,
        owner: target.isOwner,
        clientId: target.clientId ?? undefined,
      },
      activeAdmins,
    );
    if (problem) return fail(problem);
  }
  await db.delete(s.users).where(eq(s.users.id, userId));
  refresh();
  return done();
}

/* ── New sign-ups ── */

export async function approveClient(
  clientId: string,
  input: { plan: PlanId; monthly: number; setup: number; note?: string },
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  if (!(input.plan in PLANS)) return fail("Choose a plan.");
  const monthly = Number(input.monthly);
  const setup = Number(input.setup);
  if (!(monthly > 0) || !(setup >= 0) || monthly > 100_000 || setup > 100_000)
    return fail("Check the monthly rate and the setup fee.");

  const client = await loadClient(clientId);
  if (!client) return fail("We couldn't find that client.");
  if (client.website) return fail(`${client.business} already has a plan.`);

  // Their current site's domain, if they told us one.
  const [row] = await db
    .select({ site: s.clients.websiteUrl })
    .from(s.clients)
    .where(eq(s.clients.id, clientId))
    .limit(1);
  let domain: string | null = null;
  try {
    domain = row?.site
      ? new URL(row.site).hostname.replace(/^www\./, "")
      : null;
  } catch {
    domain = null;
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(s.websites).values({
      clientId,
      plan: input.plan,
      monthlyCents: cents(monthly),
      setupFeeCents: cents(setup),
      domain,
      startedAt: now,
    });
    await tx
      .update(s.clients)
      .set({ approvedAt: now, archivedAt: null, updatedAt: now })
      .where(eq(s.clients.id, clientId));
    await tx.insert(s.documents).values({
      id: createId(),
      clientId,
      title: "Service agreement",
      summary: "Your plan, the fees and what we build.",
      kind: "AGREEMENT",
      status: "AWAITING",
      body: serviceAgreement(client.business, input.plan, { monthly, setup }),
      sentAt: now,
    });
    await addActivity(
      clientId,
      "build",
      `We approved your account for the ${PLANS[input.plan].name}`,
      "/dashboard/website",
      tx,
    );
    await addActivity(
      clientId,
      "document",
      "We sent your agreement",
      "/dashboard/website/documents",
      tx,
    );
  });

  const note = clean(input.note ?? "", 2000);
  await emailClient(
    clientId,
    `Welcome to Fonts & Footers, ${first(client.contact.name)}`,
    {
      eyebrow: "You're approved",
      heading: `You're in, ${first(client.contact.name)}`,
      paragraphs: [
        `${client.business} is on the ${PLANS[input.plan].name}: ${money(monthly)} a month, with a ${money(setup)} setup fee.`,
      ],
      ...(note ? { quote: { text: note, by: a.user.name } } : {}),
      details: [
        ["1", "Sign your agreement"],
        ["2", `Pay the ${money(setup)} setup fee`],
        ["3", "Fill in the questionnaire"],
      ],
      button: { label: "Open your dashboard", href: url("/dashboard") },
      after: [
        `Monthly billing starts on the 1st after your setup fee: if you pay it this month, the first ${money(monthly)} is on ${fmtDate(nextFirst(now))}.`,
      ],
    },
  );
  refresh();
  return done();
}

export async function declineClient(
  clientId: string,
  reason: string,
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const client = await loadClient(clientId);
  if (!client) return fail("We couldn't find that client.");
  const why = clean(reason, 2000);
  await db
    .update(s.clients)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(s.clients.id, clientId));
  await emailClient(clientId, "About your Fonts & Footers sign-up", {
    eyebrow: "Your sign-up",
    heading: `Thanks for signing up, ${first(client.contact.name)}`,
    paragraphs: [
      "We've looked at your sign-up, and we're not the right fit for you just now, so we've closed your account.",
    ],
    ...(why ? { quote: { text: why, by: a.user.name } } : {}),
    after: ["If anything changes, just reply to this email."],
  });
  refresh();
  return done();
}

/* ── A client's details ── */

export async function saveNotes(
  clientId: string,
  notes: string,
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  await db
    .update(s.clients)
    .set({ notes: clean(notes, 20_000) || null, updatedAt: new Date() })
    .where(eq(s.clients.id, clientId));
  refresh();
  return done();
}

const link = (value: string) => {
  const v = clean(value, 500);
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
};

export async function saveSiteLinks(
  clientId: string,
  links: {
    domain: string;
    previewUrl: string;
    liveUrl: string;
    bookingAdminUrl: string;
  },
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const domain = clean(links.domain, 200)
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "");
  const [row] = await db
    .update(s.websites)
    .set({
      domain: domain || null,
      previewUrl: link(links.previewUrl),
      liveUrl: link(links.liveUrl),
      bookingAdminUrl: link(links.bookingAdminUrl),
      updatedAt: new Date(),
    })
    .where(eq(s.websites.clientId, clientId))
    .returning();
  if (!row) return fail("They don't have a website plan yet.");
  refresh();
  return done();
}

export async function archiveClient(
  clientId: string,
  when: "end" | "now",
): Promise<ActionResult<{ archivedAt: string }>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const client = await loadClient(clientId);
  if (!client) return fail("We couldn't find that client.");

  try {
    if (when === "now") {
      await cancelEverythingNow(clientId);
      const now = new Date();
      await db
        .update(s.clients)
        .set({ archivedAt: now, updatedAt: now })
        .where(eq(s.clients.id, clientId));
      // Signed out everywhere.
      await db
        .update(s.users)
        .set({ sessionsValidAfter: now })
        .where(and(eq(s.users.clientId, clientId), eq(s.users.role, "CLIENT")));
      refresh();
      return done({ archivedAt: now.toISOString() });
    }

    // At the end of the month: billing stops at the next 1st, and so does access.
    const ends = new Date(nextFirst(new Date()));
    if (client.website && client.website.status !== "CANCELLED") {
      await setWebsiteCancel(clientId, true);
    }
    await db
      .update(s.clients)
      .set({ archivedAt: ends, updatedAt: new Date() })
      .where(eq(s.clients.id, clientId));
    refresh();
    return done({ archivedAt: ends.toISOString() });
  } catch (error) {
    return fail(errorText(error));
  }
}

export async function restoreClient(clientId: string): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  await db
    .update(s.clients)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(eq(s.clients.id, clientId));
  refresh();
  return done();
}

/** A friendly reminder of what's waiting on them. */
export async function nudgeClient(clientId: string): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const client = await loadClient(clientId);
  if (!client) return fail("We couldn't find that client.");
  const list = todos(client, new Date().toISOString());
  if (!list.length)
    return fail(
      `Nothing is waiting on ${first(client.contact.name)} right now.`,
    );
  const sent = await emailClient(
    clientId,
    `${list.length === 1 ? "One thing" : `${list.length} things`} waiting for you`,
    {
      eyebrow: "A quick reminder",
      heading: `Hi ${first(client.contact.name)}, a few things are waiting for you`,
      paragraphs: [
        "When you have a minute, these keep your project moving:",
        ...list.map((t) => `• ${t.title}`),
      ],
      button: { label: "Open your dashboard", href: url("/dashboard") },
    },
    { firstOnly: true },
  );
  if (!sent) return fail("The email didn't go out. Try again in a minute.");
  return done();
}

/* ── Messages ── */

export async function studioReply(
  clientId: string,
  threadId: string,
  text: string,
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const body = clean(text, 8000);
  if (!body) return fail("Write your reply first.");
  const [thread] = await db
    .update(s.threads)
    .set({ status: "ANSWERED", clientUnread: true, updatedAt: new Date() })
    .where(and(eq(s.threads.id, threadId), eq(s.threads.clientId, clientId)))
    .returning();
  if (!thread) return fail("We couldn't find that conversation.");
  await db.insert(s.messages).values({
    id: createId(),
    threadId,
    author: "STUDIO",
    userId: a.user.id,
    name: a.user.name,
    text: body,
  });
  await addActivity(
    clientId,
    "support",
    `${first(a.user.name)} replied: ${thread.subject}`,
    "/dashboard/support",
  );
  await emailClient(
    clientId,
    `Re: ${thread.subject}`,
    {
      eyebrow: "A reply from Fonts & Footers",
      heading: thread.subject,
      paragraphs: [],
      quote: { text: body, by: a.user.name },
      button: {
        label: "Reply in your dashboard",
        href: url("/dashboard/support"),
      },
    },
    { kind: "replies" },
  );
  refresh();
  return done();
}

export async function setThreadStatus(
  clientId: string,
  threadId: string,
  status: "OPEN" | "ANSWERED" | "CLOSED",
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  if (!["OPEN", "ANSWERED", "CLOSED"].includes(status))
    return fail("That isn't a status.");
  await db
    .update(s.threads)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(s.threads.id, threadId), eq(s.threads.clientId, clientId)));
  refresh();
  return done();
}

/* ── Change requests ── */

const STATUS_WORDS: Record<ChangeStatus, string> = {
  PENDING: "received",
  IN_PROGRESS: "in progress",
  COMPLETED: "done",
  DECLINED: "not one we can do",
};

export async function updateChangeRequest(
  clientId: string,
  requestId: string,
  input: { status: ChangeStatus; reply?: string },
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  if (!(input.status in STATUS_WORDS)) return fail("That isn't a status.");
  const [before] = await db
    .select()
    .from(s.changeRequests)
    .where(
      and(
        eq(s.changeRequests.id, requestId),
        eq(s.changeRequests.clientId, clientId),
      ),
    )
    .limit(1);
  if (!before) return fail("We couldn't find that request.");

  const reply = clean(input.reply ?? "", 5000);
  const now = new Date();
  await db
    .update(s.changeRequests)
    .set({
      status: input.status,
      ...(reply ? { reply } : {}),
      updatedAt: now,
      completedAt:
        input.status === "COMPLETED" ? (before.completedAt ?? now) : null,
    })
    .where(eq(s.changeRequests.id, requestId));

  const moved = before.status !== input.status;
  if (moved && input.status === "COMPLETED") {
    await addActivity(
      clientId,
      "change",
      `Done: ${before.title}`,
      "/dashboard/website/changes",
    );
  }
  if (moved || reply) {
    await emailClient(
      clientId,
      moved
        ? `Request #${before.number} is ${STATUS_WORDS[input.status]}`
        : `About request #${before.number}`,
      {
        eyebrow: `Change request #${before.number}`,
        heading: before.title,
        paragraphs: [
          moved
            ? input.status === "COMPLETED"
              ? "It's done and live on your site."
              : `It's ${STATUS_WORDS[input.status]}.`
            : "We have a note about it:",
        ],
        ...(reply ? { quote: { text: reply, by: a.user.name } } : {}),
        button: {
          label: "See your requests",
          href: url("/dashboard/website/changes"),
        },
      },
      { kind: "changes" },
    );
  }
  refresh();
  return done();
}

/* ── Settings ── */

const ADMIN_ALERTS = [
  "signup",
  "payment",
  "failed",
  "message",
  "change",
  "document",
  "blueprint",
  "digest",
];

export async function saveNotifications(
  on: Record<string, boolean>,
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const prefs = Object.fromEntries(
    ADMIN_ALERTS.map((k) => [k, on[k] !== false]),
  );
  await db
    .update(s.users)
    .set({
      notify: sql`${s.users.notify} || ${JSON.stringify(prefs)}::jsonb`,
      updatedAt: new Date(),
    })
    .where(eq(s.users.id, a.user.id));
  refresh();
  return done();
}

export async function setInvoiceEmails(on: boolean): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  await setSetting("invoice_emails", Boolean(on));
  refresh();
  return done();
}
