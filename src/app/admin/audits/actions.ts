"use server";

// Admin → Audits: running an audit for an operator (no email goes to
// them, and the report opens unlocked, ready to text), several at once for
// a call list, running one again, and keeping track of each operator:
// where you are with them, notes, and which audit is the public sample.

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/dal";
import { done, fail, type ActionResult } from "@/lib/actions";
import { FOLLOW_UPS, type FollowUp } from "@/lib/audit/kinds";
import { runAudit, runLater } from "@/lib/audit/run";
import { sampleId, setSampleId } from "@/lib/audit/sample";
import { mergeSemrush, type Parsed } from "@/lib/audit/semrush/parse";
import {
  SEMRUSH_KINDS,
  type SemrushData,
  type SemrushKind,
} from "@/lib/audit/semrush/types";
import { beginAudit, pickListing, type Candidate } from "@/lib/audit/start";
import {
  createAudit,
  deleteAudit,
  getAudit,
  updateAudit,
} from "@/lib/audit/store";

async function admin() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN")
    return { ok: false as const, error: "Only admins can do that." };
  return { ok: true as const, user };
}

const refresh = (id?: string) => {
  revalidatePath("/admin/audits");
  if (id) revalidatePath(`/admin/audits/${id}`);
};

export type AdminStart =
  | { id: string; next: "run" | "done" }
  | { id: string; next: "pick"; candidates: Candidate[]; askCity: boolean };

/** Starts an audit for an operator: a website, or a business name and city. */
export async function adminStartAudit(
  site: string,
  city: string,
): Promise<ActionResult<AdminStart>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const begun = await beginAudit({
    text: String(site ?? ""),
    city: String(city ?? "").slice(0, 80),
    source: "ADMIN",
    ranBy: a.user.id,
    gate: false,
  });
  if (!begun.ok) return fail(begun.error);
  if (begun.next === "run") runLater(begun.id);
  refresh();
  return done(
    begun.next === "pick"
      ? {
          id: begun.id,
          next: "pick",
          candidates: begun.candidates,
          askCity: begun.askCity,
        }
      : { id: begun.id, next: begun.next },
  );
}

export async function adminPickListing(
  id: string,
  choice: { placeId?: string; city?: string; notOnGoogle?: boolean },
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const picked = await pickListing(String(id), choice, { gate: false });
  if (!picked.ok) return fail(picked.error);
  if (picked.next === "run") runLater(String(id));
  refresh();
  return done();
}

/**
 * One line of a list, run to the end before it answers, so the list page
 * can go through them one at a time. A listing is picked only when it
 * links back to the site; otherwise the first match is used and flagged.
 */
export async function adminRunOne(
  site: string,
  city: string,
): Promise<ActionResult<{ id: string; score: number | null; note?: string }>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const begun = await beginAudit({
    text: String(site ?? ""),
    city: String(city ?? "").slice(0, 80),
    source: "ADMIN",
    ranBy: a.user.id,
    gate: false,
  });
  if (!begun.ok) return fail(begun.error);
  let note: string | undefined;
  if (begun.next === "pick") {
    const top = begun.candidates[0];
    if (!top && !String(city ?? "").trim() && begun.askCity)
      return fail(
        'No Google listing found, and no city to search in. Add it after a comma, like "site.com, Phoenix, AZ".',
      );
    const picked = await pickListing(
      begun.id,
      top ? { placeId: top.placeId } : { city },
      { gate: false },
    );
    if (!picked.ok) return fail(picked.error);
    note = top
      ? `Matched to "${top.name}" without asking. Check it's theirs.`
      : "No Google listing found.";
    if (top) await updateAudit(begun.id, { notes: note });
  }
  await runAudit(begun.id);
  const row = await getAudit(begun.id);
  refresh();
  return done({ id: begun.id, score: row?.score ?? null, note });
}

/** The same input again, as a new audit (the old one stays). */
export async function rerunAudit(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const row = await getAudit(String(id));
  if (!row) return fail("That audit isn't there anymore.");
  const fresh = await createAudit({
    source: "ADMIN",
    status: "QUEUED",
    input: row.input,
    url: row.url,
    domain: row.domain,
    business: row.business,
    city: row.city,
    state: row.state,
    // The listing is looked up again by its ID, so the numbers are today's.
    placeId: row.placeId,
    noListing: row.noListing,
    ranBy: a.user.id,
    notes: row.notes ? `Re-run. ${row.notes}`.slice(0, 2000) : "",
  });
  runLater(fresh);
  refresh();
  return done({ id: fresh });
}

export async function setFollowUp(
  id: string,
  followUp: FollowUp,
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  if (!FOLLOW_UPS.includes(followUp)) return fail("Pick one of the statuses.");
  await updateAudit(String(id), { followUp });
  refresh(id);
  return done();
}

export async function saveAuditNotes(
  id: string,
  notes: string,
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  await updateAudit(String(id), { notes: String(notes ?? "").slice(0, 5000) });
  refresh(id);
  return done();
}

/** Makes this audit the public sample, or stops using it. */
export async function setSample(
  id: string,
  on: boolean,
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const row = await getAudit(String(id));
  if (on && row?.status !== "DONE")
    return fail("Only a finished audit can be the sample.");
  if (on) await setSampleId(String(id));
  else if ((await sampleId()) === id) await setSampleId(null);
  refresh(id);
  revalidatePath("/audit");
  revalidatePath("/audit/sample");
  return done();
}

/** Deletes an audit for good (an operator asked, say). */
export async function removeAudit(id: string): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  if ((await sampleId()) === id) await setSampleId(null);
  await deleteAudit(String(id));
  refresh();
  return done();
}

/* ── Semrush exports ── */

/**
 * Adds one Semrush export to an audit, read in the browser (the files can
 * be megabytes) and checked again here. One of each kind; newest wins.
 */
export async function addSemrush(
  id: string,
  parsed: unknown,
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const row = await getAudit(String(id));
  if (!row) return fail("That audit isn't there anymore.");
  const p = parsed as Extract<Parsed, { ok: true }>;
  if (
    !p ||
    typeof p !== "object" ||
    !SEMRUSH_KINDS.includes(p.kind) ||
    !p.file ||
    p.file.kind !== p.kind ||
    typeof p.patch !== "object"
  )
    return fail("That export didn't read right. Try the file again.");
  if (JSON.stringify(p).length > 400_000)
    return fail("That export is too big to keep. Export fewer rows.");
  // Only the part for this kind of export is kept.
  const key = {
    POSITIONS: "positions",
    TREND: "trend",
    COMPETITORS: "competitors",
    GAP: "gap",
    BACKLINKS: "links",
    REFDOMAINS: "links",
    PAGES: "pages",
  }[p.kind] as keyof SemrushData;
  const merged = mergeSemrush(row.semrush, {
    ok: true,
    kind: p.kind,
    file: {
      kind: p.kind,
      name: String(p.file.name ?? "").slice(0, 160),
      rows: Number(p.file.rows) || 0,
      database: p.file.database ? String(p.file.database).slice(0, 20) : undefined,
      uploadedAt: new Date().toISOString(),
    },
    patch: { [key]: (p.patch as Record<string, unknown>)[key] } as Partial<SemrushData>,
  });
  await updateAudit(row.id, { semrush: merged });
  refresh(row.id);
  revalidatePath(`/audit/report/${row.id}`);
  return done();
}

/** Takes one export back out, or all of them. */
export async function removeSemrush(
  id: string,
  kind?: SemrushKind,
): Promise<ActionResult> {
  const a = await admin();
  if (!a.ok) return fail(a.error);
  const row = await getAudit(String(id));
  if (!row) return fail("That audit isn't there anymore.");
  let next: SemrushData | null = null;
  if (kind && row.semrush) {
    const key = {
      POSITIONS: "positions",
      TREND: "trend",
      COMPETITORS: "competitors",
      GAP: "gap",
      BACKLINKS: "links",
      REFDOMAINS: "links",
      PAGES: "pages",
    }[kind] as keyof SemrushData;
    const { [key]: _gone, ...rest } = row.semrush;
    void _gone;
    next = { ...rest, v: 1, files: row.semrush.files.filter((f) => f.kind !== kind) } as SemrushData;
    if (!next.files.length) next = null;
  }
  await updateAudit(row.id, { semrush: next });
  refresh(row.id);
  revalidatePath(`/audit/report/${row.id}`);
  return done();
}
