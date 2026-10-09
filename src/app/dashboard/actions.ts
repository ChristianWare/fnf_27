"use server";

// Everything a client saves from their dashboard. Each action works out
// the business from the session, never from what the page sent, so no one
// can touch another client's things. An admin viewing as a client can look
// but not change anything.

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSessionUser } from "@/lib/auth/dal";
import type { User } from "@/lib/auth/users";
import {
  checkPassword,
  createToken,
  findUserByEmail,
  findUserById,
  hashPassword,
  normalEmail,
  passwordProblem,
} from "@/lib/auth/accounts";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth/session";
import { done, fail, VIEW_ONLY, type ActionResult } from "@/lib/actions";
import { addActivity, setFact } from "@/lib/data/write";
import { loadClient, sizeLabel } from "@/lib/data/clients";
import { createId } from "@/lib/server/ids";
import { url } from "@/lib/server/config";
import {
  isOurUpload,
  uploadTicket,
  uploadsReady,
  destroyUpload,
} from "@/lib/server/cloudinary";
import { alertAdmins, emailClient, emailPerson } from "@/lib/server/notify";
import { errorText } from "@/lib/billing/stripe";
import { setWebsiteCancel } from "@/lib/billing/website";
import { assetsComplete, isLive, leadsAccess } from "@/lib/dashboard/helpers";
import { fmtDate } from "@/lib/dashboard/format";
import { LEADS, PLANS } from "@/lib/dashboard/plans";
import type { Answers, Asset, AssetLabel } from "@/lib/dashboard/types";

const s = schema;

type Actor =
  { ok: false; error: string } | { ok: true; user: User; clientId: string };

/** The signed-in client and their business, or why they can't save. */
async function actor(): Promise<Actor> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Your session ended. Sign in again." };
  if (user.role === "ADMIN") return { ok: false, error: VIEW_ONLY };
  if (!user.clientId)
    return { ok: false, error: "We couldn't find your business." };
  return { ok: true, user, clientId: user.clientId };
}

const refresh = () => {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
};

const firstName = (name: string) => name.split(" ")[0] || name;

async function businessName(clientId: string) {
  const [row] = await db
    .select({ business: s.clients.business })
    .from(s.clients)
    .where(eq(s.clients.id, clientId))
    .limit(1);
  return row?.business ?? "A client";
}

const clean = (text: string, max = 5000) => text.trim().slice(0, max);

/* ── Documents ── */

export async function signDocument(
  docId: string,
  name: string,
): Promise<ActionResult<{ signedAt: string }>> {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  const signer = clean(name, 120);
  if (signer.length < 3) return fail("Type your full name to sign.");

  const ip =
    (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const now = new Date();
  const [doc] = await db
    .update(s.documents)
    .set({ status: "SIGNED", signedAt: now, signedBy: signer, signedIp: ip })
    .where(
      and(
        eq(s.documents.id, docId),
        eq(s.documents.clientId, a.clientId),
        eq(s.documents.status, "AWAITING"),
      ),
    )
    .returning();
  if (!doc)
    return fail("That document is already signed, or isn't yours to sign.");

  if (doc.kind === "AGREEMENT") {
    await setFact(a.clientId, "agreementSignedAt", now.toISOString());
  }
  await addActivity(
    a.clientId,
    "document",
    doc.kind === "AGREEMENT"
      ? "You signed your agreement"
      : `You signed ${doc.title}`,
    "/dashboard/website/documents",
  );
  const business = await businessName(a.clientId);
  await alertAdmins("document", `${business} signed ${doc.title}`, {
    eyebrow: "Signed",
    heading: `${business} signed ${doc.title}`,
    paragraphs: [
      `Signed by ${signer} on ${fmtDate(now)}.`,
      ...(doc.kind === "AGREEMENT" ? ["Next for them: the setup fee."] : []),
    ],
    button: {
      label: "Open their files",
      href: url(`/admin/clients/${a.clientId}?tab=files`),
    },
  });
  refresh();
  return done({ signedAt: now.toISOString() });
}

/* ── Questionnaire ── */

function cleanAnswers(answers: Answers) {
  const out: Answers = {};
  for (const [key, value] of Object.entries(answers ?? {}).slice(0, 200)) {
    if (!/^[\w-]{1,60}$/.test(key)) continue;
    out[key] = Array.isArray(value)
      ? value.slice(0, 50).map((v) => String(v).slice(0, 500))
      : String(value ?? "").slice(0, 5000);
  }
  return out;
}

export async function saveAnswers(answers: Answers): Promise<ActionResult> {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  const now = new Date();
  await db
    .insert(s.questionnaires)
    .values({
      clientId: a.clientId,
      answers: cleanAnswers(answers),
      savedAt: now,
    })
    .onConflictDoUpdate({
      target: s.questionnaires.clientId,
      set: { answers: cleanAnswers(answers), savedAt: now },
    });
  refresh();
  return done();
}

export async function submitQuestionnaire(
  answers: Answers,
): Promise<ActionResult<{ submittedAt: string }>> {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  const now = new Date();
  await db
    .insert(s.questionnaires)
    .values({
      clientId: a.clientId,
      answers: cleanAnswers(answers),
      savedAt: now,
      submittedAt: now,
    })
    .onConflictDoUpdate({
      target: s.questionnaires.clientId,
      set: {
        answers: cleanAnswers(answers),
        savedAt: now,
        submittedAt: sql`coalesce(${s.questionnaires.submittedAt}, now())`,
      },
    });
  const first = await setFact(
    a.clientId,
    "questionnaireSubmittedAt",
    now.toISOString(),
  );
  if (first) {
    await addActivity(
      a.clientId,
      "build",
      "You sent your questionnaire",
      "/dashboard/website/questionnaire",
    );
    const business = await businessName(a.clientId);
    await alertAdmins("blueprint", `${business} sent their questionnaire`, {
      eyebrow: "Questionnaire",
      heading: `${business} sent their questionnaire`,
      paragraphs: [
        "Their answers are in. Next for you: the blueprint and three designs.",
      ],
      button: {
        label: "Read their answers",
        href: url(`/admin/clients/${a.clientId}?tab=files`),
      },
    });
  }
  refresh();
  return done({ submittedAt: now.toISOString() });
}

/* ── Brand assets ── */

const assetFolder = (clientId: string) => `fnf/clients/${clientId}/assets`;

export async function assetUploadTicket() {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  if (!uploadsReady())
    return fail(
      "Uploads aren't set up yet. Email your files to hello@fontsandfooters.com for now.",
    );
  return done(uploadTicket(assetFolder(a.clientId)));
}

const LABELS: AssetLabel[] = [
  "Logo",
  "Fleet photo",
  "Team photo",
  "Brand guide",
  "Other",
];

export async function addAssets(
  files: {
    url: string;
    publicId: string;
    name: string;
    size: number;
    mime: string;
    label: AssetLabel;
  }[],
): Promise<ActionResult<Asset[]>> {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  const folder = assetFolder(a.clientId);
  const ok = files
    .slice(0, 40)
    .filter((f) => isOurUpload(f.url, f.publicId, folder));
  if (!ok.length)
    return fail("We couldn't save those files. Try uploading them again.");

  const rows = await db
    .insert(s.assets)
    .values(
      ok.map((f) => ({
        id: createId(),
        clientId: a.clientId,
        name: clean(f.name, 200) || "File",
        label: LABELS.includes(f.label) ? f.label : "Other",
        sizeBytes: Math.max(0, Math.round(f.size)) || null,
        mimeType: f.mime?.slice(0, 100) || null,
        url: f.url,
        publicId: f.publicId,
      })),
    )
    .returning();

  await checkAssetsComplete(a.clientId);
  refresh();
  return done(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      label: r.label as AssetLabel,
      size: sizeLabel(r.sizeBytes),
      addedAt: r.createdAt.toISOString(),
      src: r.mimeType?.startsWith("image/") ? r.url : undefined,
      url: r.url,
    })),
  );
}

async function checkAssetsComplete(clientId: string) {
  const rows = await db
    .select({ label: s.assets.label })
    .from(s.assets)
    .where(eq(s.assets.clientId, clientId));
  if (!assetsComplete(rows.map((r) => ({ label: r.label as AssetLabel }))))
    return;
  const first = await setFact(
    clientId,
    "assetsCompleteAt",
    new Date().toISOString(),
  );
  if (first) {
    await addActivity(
      clientId,
      "build",
      "You uploaded your brand assets",
      "/dashboard/website/assets",
    );
  }
}

export async function relabelAsset(
  id: string,
  label: AssetLabel,
): Promise<ActionResult> {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  if (!LABELS.includes(label)) return fail("That isn't a label we know.");
  await db
    .update(s.assets)
    .set({ label })
    .where(and(eq(s.assets.id, id), eq(s.assets.clientId, a.clientId)));
  await checkAssetsComplete(a.clientId);
  refresh();
  return done();
}

export async function removeAsset(id: string): Promise<ActionResult> {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  const [row] = await db
    .delete(s.assets)
    .where(and(eq(s.assets.id, id), eq(s.assets.clientId, a.clientId)))
    .returning();
  if (row?.publicId) await destroyUpload(row.publicId, row.mimeType);
  refresh();
  return done();
}

/* ── Blueprint ── */

async function ownSections(clientId: string, ids: string[]) {
  if (!ids.length) return [];
  return db
    .select({
      id: s.blueprintSections.id,
      status: s.blueprintSections.status,
      title: s.blueprintSections.title,
    })
    .from(s.blueprintSections)
    .innerJoin(
      s.blueprintPages,
      eq(s.blueprintPages.id, s.blueprintSections.pageId),
    )
    .where(
      and(
        inArray(s.blueprintSections.id, ids),
        eq(s.blueprintPages.clientId, clientId),
      ),
    );
}

export async function approveSections(ids: string[]): Promise<ActionResult> {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  const mine = (await ownSections(a.clientId, ids.slice(0, 200))).filter(
    (x) => x.status === "REVIEW",
  );
  if (!mine.length) return fail("Those sections aren't waiting for you.");
  await db
    .update(s.blueprintSections)
    .set({ status: "APPROVED", updatedAt: new Date() })
    .where(
      inArray(
        s.blueprintSections.id,
        mine.map((x) => x.id),
      ),
    );

  // Every section on every page approved: the blueprint is done.
  const [left] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.blueprintSections)
    .innerJoin(
      s.blueprintPages,
      eq(s.blueprintPages.id, s.blueprintSections.pageId),
    )
    .where(
      and(
        eq(s.blueprintPages.clientId, a.clientId),
        sql`${s.blueprintSections.status} <> 'APPROVED'`,
      ),
    );
  if (left?.n === 0) {
    const first = await setFact(
      a.clientId,
      "blueprintApprovedAt",
      new Date().toISOString(),
    );
    if (first) {
      await addActivity(
        a.clientId,
        "build",
        "You approved your blueprint",
        "/dashboard/website/blueprint",
      );
      const business = await businessName(a.clientId);
      await alertAdmins("blueprint", `${business} approved their blueprint`, {
        eyebrow: "Blueprint",
        heading: `${business} approved every section`,
        paragraphs: ["The blueprint is signed off. On to the build."],
        button: {
          label: "Open their blueprint",
          href: url(`/admin/clients/${a.clientId}?tab=blueprint`),
        },
      });
    }
  }
  refresh();
  return done();
}

export async function commentOnSection(
  sectionId: string,
  text: string,
): Promise<ActionResult> {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  const body = clean(text, 4000);
  if (!body) return fail("Write what you'd change first.");
  const [section] = await ownSections(a.clientId, [sectionId]);
  if (!section) return fail("We couldn't find that section.");

  await db.insert(s.blueprintComments).values({
    id: createId(),
    sectionId,
    author: "CLIENT",
    name: a.user.name,
    text: body,
  });
  await db
    .update(s.blueprintSections)
    .set({ status: "DRAFT", updatedAt: new Date() })
    .where(eq(s.blueprintSections.id, sectionId));

  const business = await businessName(a.clientId);
  await alertAdmins("message", `${business} commented on ${section.title}`, {
    eyebrow: "Blueprint comment",
    heading: `${firstName(a.user.name)} wants a change to ${section.title}`,
    paragraphs: [],
    quote: { text: body, by: `${a.user.name}, ${business}` },
    button: {
      label: "Open their blueprint",
      href: url(`/admin/clients/${a.clientId}?tab=blueprint`),
    },
  });
  refresh();
  return done();
}

/* ── Design ── */

export async function chooseDesign(
  optionId: string,
): Promise<ActionResult<{ chosenAt: string }>> {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  const client = await loadClient(a.clientId);
  if (!client?.website) return fail("There's no website plan yet.");
  if (isLive(client)) return fail("Your site is live, so the design is set.");
  const option = client.designs.options.find((o) => o.id === optionId);
  if (!option) return fail("We couldn't find that design.");

  const now = new Date().toISOString();
  await db
    .update(s.websites)
    .set({
      designs: { ...client.designs, chosen: option.id, chosenAt: now },
      updatedAt: new Date(),
    })
    .where(eq(s.websites.clientId, a.clientId));
  await setFact(a.clientId, "designChosenAt", now);
  await addActivity(
    a.clientId,
    "build",
    `You chose your design: ${option.name}`,
    "/dashboard/website/design",
  );
  await alertAdmins("blueprint", `${client.business} chose ${option.name}`, {
    eyebrow: "Design",
    heading: `${client.business} chose ${option.name}`,
    paragraphs: ["Their design direction is picked."],
    button: {
      label: "Open their files",
      href: url(`/admin/clients/${a.clientId}?tab=files`),
    },
  });
  refresh();
  return done({ chosenAt: now });
}

/* ── Change requests ── */

export async function sendChangeRequest(input: {
  title: string;
  area: string;
  details: string;
}): Promise<ActionResult<{ id: string; number: number }>> {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  const title = clean(input.title, 160);
  const details = clean(input.details, 5000);
  if (!title || !details) return fail("Add a title and the details.");
  const client = await loadClient(a.clientId);
  if (!client || !isLive(client))
    return fail("Change requests open on launch day.");

  const id = createId();
  let number = 0;
  for (let attempt = 0; attempt < 3 && !number; attempt++) {
    const [row] = await db
      .select({
        n: sql<number>`coalesce(max(${s.changeRequests.number}), 0)::int`,
      })
      .from(s.changeRequests)
      .where(eq(s.changeRequests.clientId, a.clientId));
    try {
      await db.insert(s.changeRequests).values({
        id,
        clientId: a.clientId,
        number: (row?.n ?? 0) + 1,
        title,
        area: clean(input.area, 60) || "Whole site",
        details,
      });
      number = (row?.n ?? 0) + 1;
    } catch {
      // Someone else on the team sent one at the same moment: try the next number.
    }
  }
  if (!number) return fail("We couldn't send that. Try again.");

  await addActivity(
    a.clientId,
    "change",
    `You asked for: ${title}`,
    "/dashboard/website/changes",
  );
  await alertAdmins(
    "change",
    `Change request #${number} from ${client.business}`,
    {
      eyebrow: `Change request #${number}`,
      heading: title,
      paragraphs: [
        `${client.business} · ${clean(input.area, 60) || "Whole site"}`,
      ],
      quote: { text: details, by: a.user.name },
      button: {
        label: "Open the request",
        href: url(`/admin/requests?open=${a.clientId}.${id}`),
      },
    },
  );
  refresh();
  return done({ id, number });
}

/* ── Support ── */

export async function startThread(
  subject: string,
  text: string,
): Promise<ActionResult<{ id: string }>> {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  const topic = clean(subject, 160);
  const body = clean(text, 8000);
  if (!topic || !body) return fail("Add a subject and your message.");
  const id = createId();
  await db.transaction(async (tx) => {
    await tx
      .insert(s.threads)
      .values({ id, clientId: a.clientId, subject: topic });
    await tx.insert(s.messages).values({
      id: createId(),
      threadId: id,
      author: "CLIENT",
      userId: a.user.id,
      name: a.user.name,
      text: body,
    });
  });
  await alertClientMessage(a.clientId, a.user.name, topic, body, id);
  refresh();
  return done({ id });
}

export async function replyThread(
  threadId: string,
  text: string,
): Promise<ActionResult> {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  const body = clean(text, 8000);
  if (!body) return fail("Write your reply first.");
  const [thread] = await db
    .update(s.threads)
    .set({ status: "OPEN", clientUnread: false, updatedAt: new Date() })
    .where(and(eq(s.threads.id, threadId), eq(s.threads.clientId, a.clientId)))
    .returning();
  if (!thread) return fail("We couldn't find that conversation.");
  await db.insert(s.messages).values({
    id: createId(),
    threadId,
    author: "CLIENT",
    userId: a.user.id,
    name: a.user.name,
    text: body,
  });
  await alertClientMessage(
    a.clientId,
    a.user.name,
    thread.subject,
    body,
    threadId,
  );
  refresh();
  return done();
}

async function alertClientMessage(
  clientId: string,
  name: string,
  subject: string,
  text: string,
  threadId: string,
) {
  const business = await businessName(clientId);
  await alertAdmins(
    "message",
    `${business}: ${subject}`,
    {
      eyebrow: "New message",
      heading: subject,
      paragraphs: [],
      quote: { text, by: `${name}, ${business}` },
      button: {
        label: "Reply",
        href: url(`/admin/messages?thread=${clientId}.${threadId}`),
      },
    },
    `Message from ${business}: ${subject}`,
  );
}

export async function markThreadRead(threadId: string): Promise<ActionResult> {
  const a = await actor();
  if (!a.ok) return done();
  await db
    .update(s.threads)
    .set({ clientUnread: false })
    .where(and(eq(s.threads.id, threadId), eq(s.threads.clientId, a.clientId)));
  return done();
}

/* ── Profile ── */

export async function saveProfile(
  part: "you" | "business",
  details: {
    name?: string;
    role?: string;
    email?: string;
    phone?: string;
    business?: string;
    city?: string;
  },
): Promise<ActionResult<{ pendingEmail?: string }>> {
  const a = await actor();
  if (!a.ok) return fail(a.error);

  if (part === "business") {
    const business = clean(details.business ?? "", 160);
    if (business.length < 2) return fail("Add your business name.");
    const [city, state] = clean(details.city ?? "", 120)
      .split(",")
      .map((x) => x.trim());
    await db
      .update(s.clients)
      .set({
        business,
        city: city || null,
        state: state || null,
        updatedAt: new Date(),
      })
      .where(eq(s.clients.id, a.clientId));
    refresh();
    return done();
  }

  const name = clean(details.name ?? "", 120);
  if (name.length < 2) return fail("Add your name.");
  await db
    .update(s.users)
    .set({
      name,
      title: clean(details.role ?? "", 80) || null,
      phone: clean(details.phone ?? "", 40) || null,
      updatedAt: new Date(),
    })
    .where(eq(s.users.id, a.user.id));

  // A new email only takes over once they confirm it.
  const email = normalEmail(details.email ?? "");
  let pendingEmail: string | undefined;
  if (email && email !== a.user.email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return fail("That email doesn't look right.");
    const taken = await findUserByEmail(email);
    if (taken) return fail("Someone else already signs in with that email.");
    await db
      .update(s.users)
      .set({ pendingEmail: email })
      .where(eq(s.users.id, a.user.id));
    const token = await createToken(a.user.id, "VERIFY");
    await emailPerson(email, "Confirm your new email for Fonts & Footers", {
      eyebrow: "Your account",
      heading: "Confirm your new email",
      paragraphs: [
        `You asked to sign in to Fonts & Footers with ${email} instead of ${a.user.email}. Click the button to confirm it.`,
      ],
      button: {
        label: "Confirm my new email",
        href: url(`/verify-email?token=${token}`),
      },
      after: ["Until you do, keep signing in with your current email."],
    });
    pendingEmail = email;
  }
  refresh();
  return done({ pendingEmail });
}

export async function changePassword(
  current: string,
  next: string,
): Promise<ActionResult> {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  const weak = passwordProblem(next);
  if (weak) return fail(weak);
  const row = await findUserById(a.user.id);
  if (!row || !(await checkPassword(row.passwordHash, current))) {
    return fail("Your current password isn't right.");
  }
  const now = new Date();
  now.setMilliseconds(0);
  await db
    .update(s.users)
    .set({
      passwordHash: await hashPassword(next),
      sessionsValidAfter: now,
      updatedAt: now,
    })
    .where(eq(s.users.id, a.user.id));
  // Signed out everywhere else; this session carries on.
  const { token, expires } = await signSession(a.user.id);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions(expires));
  return done();
}

const EMAIL_KINDS = ["replies", "changes", "invoices", "digest"];

export async function setEmailPreference(
  kind: string,
  on: boolean,
): Promise<ActionResult> {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  if (!EMAIL_KINDS.includes(kind)) return fail("That isn't an email we send.");
  await db
    .update(s.users)
    .set({
      notify: sql`${s.users.notify} || jsonb_build_object(${kind}::text, ${on}::boolean)`,
      updatedAt: new Date(),
    })
    .where(eq(s.users.id, a.user.id));
  refresh();
  return done();
}

/* ── Growth: this week's habits ── */

export async function toggleHabit(
  id: string,
  week: string,
): Promise<ActionResult<string[]>> {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  const client = await loadClient(a.clientId);
  const growth = client?.growth;
  if (!growth || !growth.habits.some((h) => h.id === id))
    return fail("We couldn't find that habit.");
  const current = growth.habitsDone?.week === week ? growth.habitsDone.ids : [];
  const ids = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id];
  await db
    .update(s.websites)
    .set({
      growth: { ...growth, habitsDone: { week, ids } },
      updatedAt: new Date(),
    })
    .where(eq(s.websites.clientId, a.clientId));
  return done(ids);
}

/* ── Plans ── */

export async function startLeadsTrial(): Promise<
  ActionResult<{ trialEndsAt: string }>
> {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  const client = await loadClient(a.clientId);
  if (!client) return fail("We couldn't find your business.");
  if (leadsAccess(client) !== "NONE")
    return fail("Your Leads Tool is already on.");
  const now = new Date();
  const ends = new Date(now.getTime() + LEADS.trialDays * 86_400_000);
  const [row] = await db
    .update(s.clients)
    .set({
      leadsStatus: "TRIAL",
      leadsStartedAt: now,
      leadsTrialEndsAt: ends,
      updatedAt: now,
    })
    .where(
      and(
        eq(s.clients.id, a.clientId),
        eq(s.clients.leadsStatus, "NONE"),
        sql`${s.clients.leadsStartedAt} is null`,
      ),
    )
    .returning();
  if (!row) {
    return fail(
      "You've had your free trial. Message us and we'll switch the Leads Tool back on.",
    );
  }
  await addActivity(
    a.clientId,
    "leads",
    `Your ${LEADS.trialDays}-day Leads Tool trial started`,
    "/dashboard/leads",
  );
  await alertAdmins("signup", `${client.business} started a Leads Tool trial`, {
    eyebrow: "Leads Tool",
    heading: `${client.business} started a free trial`,
    paragraphs: [`It runs until ${fmtDate(ends)}.`],
    button: {
      label: "Open their account",
      href: url(`/admin/clients/${a.clientId}`),
    },
  });
  refresh();
  return done({ trialEndsAt: ends.toISOString() });
}

export async function cancelPlan(): Promise<ActionResult<{ endsAt?: string }>> {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  const client = await loadClient(a.clientId);
  if (!client?.website) return fail("There's no website plan to cancel.");
  try {
    const result = await setWebsiteCancel(a.clientId, true);
    const plan = PLANS[client.website.plan].name;
    const ends = result.endsAt
      ? new Date(new Date(result.endsAt).getTime() - 86_400_000).toISOString()
      : undefined;
    await addActivity(
      a.clientId,
      "invoice",
      ends
        ? `You cancelled your plan. It ends on ${fmtDate(ends)}`
        : "You cancelled your plan",
      "/dashboard/billing",
    );
    await emailClient(a.clientId, `Your ${plan} plan is cancelled`, {
      eyebrow: "Billing",
      heading: "Your plan is cancelled",
      paragraphs: [
        ends
          ? `Your ${plan} plan ends on ${fmtDate(ends)}. Nothing more is charged, and your site stays up until then.`
          : `Your ${plan} plan is cancelled. Nothing more is charged.`,
        "Changed your mind? You can keep your plan from Billing anytime before then.",
      ],
      button: { label: "Open Billing", href: url("/dashboard/billing") },
    });
    await alertAdmins(
      "failed",
      `${client.business} cancelled their plan`,
      {
        eyebrow: "Cancellation",
        heading: `${client.business} cancelled the ${plan}`,
        paragraphs: [
          ends ? `It ends on ${fmtDate(ends)}.` : "It ended straight away.",
        ],
        button: {
          label: "Open their billing",
          href: url(`/admin/clients/${a.clientId}?tab=billing`),
        },
      },
      `${client.business} cancelled their plan`,
    );
    refresh();
    return done({ endsAt: ends });
  } catch (error) {
    return fail(errorText(error));
  }
}

export async function keepPlan(): Promise<ActionResult> {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  const client = await loadClient(a.clientId);
  if (!client?.website) return fail("There's no website plan.");
  try {
    await setWebsiteCancel(a.clientId, false);
    await addActivity(
      a.clientId,
      "invoice",
      "You kept your plan",
      "/dashboard/billing",
    );
    await alertAdmins("failed", `${client.business} is staying`, {
      eyebrow: "Cancellation undone",
      heading: `${client.business} kept their plan`,
      paragraphs: [
        "They undid their cancellation. Billing carries on as normal.",
      ],
      button: {
        label: "Open their billing",
        href: url(`/admin/clients/${a.clientId}?tab=billing`),
      },
    });
    refresh();
    return done();
  } catch (error) {
    return fail(errorText(error));
  }
}

export async function requestUpgrade(): Promise<ActionResult> {
  const a = await actor();
  if (!a.ok) return fail(a.error);
  const client = await loadClient(a.clientId);
  if (client?.website?.plan !== "WEBSITE_ONLY")
    return fail("You're already on the Full Platform.");
  if (client.website.facts.upgradeRequestedAt) return done();

  await db
    .update(s.websites)
    .set({
      facts: sql`${s.websites.facts} || jsonb_build_object('upgradeRequestedAt', ${new Date().toISOString()}::text)`,
      updatedAt: new Date(),
    })
    .where(eq(s.websites.clientId, a.clientId));
  const id = createId();
  const text = `I'd like to upgrade ${client.business} to the ${PLANS.FULL_PLATFORM.name}.`;
  await db.transaction(async (tx) => {
    await tx.insert(s.threads).values({
      id,
      clientId: a.clientId,
      subject: "Upgrade to the Full Platform",
    });
    await tx.insert(s.messages).values({
      id: createId(),
      threadId: id,
      author: "CLIENT",
      userId: a.user.id,
      name: a.user.name,
      text,
    });
  });
  await alertClientMessage(
    a.clientId,
    a.user.name,
    "Upgrade to the Full Platform",
    text,
    id,
  );
  refresh();
  return done();
}
