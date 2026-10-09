// Turning off one kind of email from a link in that email, without signing
// in. The link is signed, so it only works for the person it was sent to.
// Server only.

import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { signatureOk } from "./ids";

export const EMAIL_NAMES: Record<string, string> = {
  replies: "replies to your messages",
  changes: "updates on your change requests",
  invoices: "invoices and receipts",
  digest: "the morning leads email",
  leads: "the studio's morning leads email",
};

export function checkLink(u?: string, k?: string, s?: string) {
  if (!u || !k || !s || !EMAIL_NAMES[k]) return false;
  return signatureOk(`${u}.${k}`, s);
}

export async function unsubscribe(userId: string, kind: string) {
  await db
    .update(schema.users)
    .set({
      notify: sql`${schema.users.notify} || jsonb_build_object(${kind}::text, false)`,
      updatedAt: new Date(),
    })
    .where(eq(schema.users.id, userId));
}
