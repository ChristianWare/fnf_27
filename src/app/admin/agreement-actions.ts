"use server";

// The service agreement, from the admin side: save a version as a
// template, remove one, and change an agreement the client hasn't signed
// yet. Approving a sign-up with its agreement is approveClient.

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { getSessionUser } from "@/lib/auth/dal";
import { done, fail, type ActionResult } from "@/lib/actions";
import { addActivity } from "@/lib/data/write";
import { loadClient } from "@/lib/data/clients";
import { createId } from "@/lib/server/ids";
import {
  LIMITS,
  buildAgreement,
  cleanDraft,
  isAgreementBody,
  type AgreementTemplate,
} from "@/lib/agreements/types";
import {
  agreementTemplates,
  partiesOf,
  saveAgreementTemplates,
} from "@/lib/agreements/server";

async function isAdmin() {
  const user = await getSessionUser();
  return user?.role === "ADMIN";
}

const refresh = () => {
  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard", "layout");
};

const problem = (error: unknown) =>
  error instanceof Error ? error.message : "Check the agreement.";

/** Saves this version to start from next time. Same name: replaced. */
export async function saveAgreementTemplate(
  name: string,
  input: unknown,
): Promise<ActionResult<AgreementTemplate[]>> {
  if (!(await isAdmin())) return fail("Only admins can do that.");
  const title = name.trim().replace(/\s+/g, " ").slice(0, LIMITS.templateName);
  if (!title) return fail("Name the template.");
  let draft;
  try {
    draft = cleanDraft(input);
  } catch (error) {
    return fail(problem(error));
  }
  const list = await agreementTemplates();
  const same = list.find((t) => t.name.toLowerCase() === title.toLowerCase());
  if (!same && list.length >= LIMITS.templates)
    return fail(`That's ${LIMITS.templates} templates. Remove one first.`);
  const { template: _from, ...words } = draft;
  void _from;
  const saved: AgreementTemplate = {
    ...words,
    id: same?.id ?? `t_${createId()}`,
    name: title,
  };
  const next = same
    ? list.map((t) => (t.id === same.id ? saved : t))
    : [...list, saved];
  await saveAgreementTemplates(next);
  refresh();
  return done(next);
}

export async function deleteAgreementTemplate(
  id: string,
): Promise<ActionResult<AgreementTemplate[]>> {
  if (!(await isAdmin())) return fail("Only admins can do that.");
  const next = (await agreementTemplates()).filter((t) => t.id !== id);
  await saveAgreementTemplates(next);
  refresh();
  return done(next);
}

/** Changes an agreement they haven't signed. They see the new version. */
export async function updateAgreement(
  clientId: string,
  docId: string,
  input: unknown,
): Promise<ActionResult> {
  if (!(await isAdmin())) return fail("Only admins can do that.");
  let draft;
  try {
    draft = cleanDraft(input);
  } catch (error) {
    return fail(problem(error));
  }
  const client = await loadClient(clientId);
  const w = client?.website;
  if (!client || !w) return fail("They don't have a plan yet.");
  const [doc] = await db
    .select({ status: s.documents.status, body: s.documents.body })
    .from(s.documents)
    .where(
      and(
        eq(s.documents.id, docId),
        eq(s.documents.clientId, clientId),
        eq(s.documents.kind, "AGREEMENT"),
      ),
    )
    .limit(1);
  if (!doc) return fail("We couldn't find that agreement.");
  if (doc.status !== "AWAITING")
    return fail("It's signed, so it can't change. Send a new document instead.");

  const body = buildAgreement(draft, {
    parties: partiesOf(client),
    plan: w.plan,
    monthly: w.monthly,
    setup: w.setupFee,
  });
  await db
    .update(s.documents)
    .set({ body })
    .where(eq(s.documents.id, docId));
  if (isAgreementBody(doc.body))
    await addActivity(
      clientId,
      "document",
      "We updated your agreement",
      "/dashboard/website/documents",
    );
  refresh();
  return done();
}
