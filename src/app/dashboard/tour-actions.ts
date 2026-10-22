"use server";

// The guided tour: remembers on their account that they've seen it, so it
// doesn't open again on another device. Kept in users.notify under a
// "tour:" key, next to the email settings (whose keys never start with it).

import { eq, sql } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { getSessionUser } from "@/lib/auth/dal";
import { done, fail, type ActionResult } from "@/lib/actions";
import { TOUR_IDS, tourKey, type TourId } from "@/lib/dashboard/tours";

export async function markTourSeen(id: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return fail("Your session ended. Sign in again.");
  // An admin viewing as a client: nothing to remember.
  if (user.role === "ADMIN") return done();
  if (!TOUR_IDS.includes(id as TourId)) return fail("That isn't a tour.");
  await db
    .update(s.users)
    .set({
      notify: sql`${s.users.notify} || jsonb_build_object(${tourKey(id as TourId)}::text, true)`,
      updatedAt: new Date(),
    })
    .where(eq(s.users.id, user.id));
  return done();
}
