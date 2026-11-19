"use server";

// Previews: make one for a prospect, give it more time, or delete it.
// The demo platform (fnf-demos) does the work; see src/lib/demos/platform.ts.

import { revalidatePath } from "next/cache";
import { and, eq, like } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { getSessionUser } from "@/lib/auth/dal";
import { done, fail, type ActionResult } from "@/lib/actions";
import { logActivity } from "@/lib/prospects/store";
import {
  createPlatformDemo,
  deletePlatformDemo,
  editPlatformDemo,
  extendPlatformDemo,
  PlatformError,
} from "@/lib/demos/platform";

async function admin() {
  const user = await getSessionUser();
  return user && user.role === "ADMIN" ? user : null;
}

const refresh = () => {
  revalidatePath("/admin/demos");
  revalidatePath("/admin/prospects", "layout");
};

/** Notes that their preview went out (texted, or its link or text
 *  copied to send another way). Once per preview: the Prospects list shows
 *  "Preview sent" from this. */
export async function markPreviewSent(prospectId: string, url: string, how: string): Promise<ActionResult> {
  const user = await admin();
  if (!user) return fail("Only admins can do that.");
  const id = String(prospectId);
  const link = String(url).slice(0, 300);
  const [already] = await db
    .select({ id: s.prospectActivity.id })
    .from(s.prospectActivity)
    .where(
      and(
        eq(s.prospectActivity.prospectId, id),
        eq(s.prospectActivity.kind, "PREVIEW"),
        like(s.prospectActivity.text, `%${link}`),
      ),
    )
    .limit(1);
  if (!already) {
    await logActivity(id, "PREVIEW", `Sent their preview (${String(how).slice(0, 40)}): ${link}`, user.id).catch(
      () => {},
    );
    revalidatePath(`/admin/prospects/${id}`);
    revalidatePath("/admin/prospects");
  }
  return done();
}

const why = (e: unknown) =>
  e instanceof PlatformError ? e.message : "Something went wrong. Try again.";

/** The form's fields and photos, passed on to the platform as they are. */
export async function makePreview(form: FormData): Promise<ActionResult<{ id: string; url: string }>> {
  const user = await admin();
  if (!user) return fail("Only admins can do that.");
  const prospectId = String(form.get("ref") ?? "");
  try {
    const demo = await createPlatformDemo(form);
    if (prospectId) {
      await logActivity(prospectId, "NOTE", `Made a preview: ${demo.url}`, user.id).catch(() => {});
    }
    refresh();
    return done({ id: demo.id, url: demo.url });
  } catch (e) {
    return fail(why(e));
  }
}

/** New name, contact details or photos for a live preview, in place. */
export async function editPreview(id: string, form: FormData): Promise<ActionResult> {
  const user = await admin();
  if (!user) return fail("Only admins can do that.");
  const prospectId = String(form.get("ref") ?? "");
  form.delete("ref");
  try {
    const demo = await editPlatformDemo(id, form);
    if (prospectId) {
      await logActivity(prospectId, "NOTE", `Edited their preview: ${demo.url}`, user.id).catch(() => {});
    }
    refresh();
    return done();
  } catch (e) {
    return fail(why(e));
  }
}

export async function extendPreview(id: string, days = 14): Promise<ActionResult> {
  if (!(await admin())) return fail("Only admins can do that.");
  try {
    await extendPlatformDemo(id, days);
    refresh();
    return done();
  } catch (e) {
    return fail(why(e));
  }
}

export async function deletePreview(id: string): Promise<ActionResult> {
  if (!(await admin())) return fail("Only admins can do that.");
  try {
    await deletePlatformDemo(id);
    refresh();
    return done();
  } catch (e) {
    return fail(why(e));
  }
}
