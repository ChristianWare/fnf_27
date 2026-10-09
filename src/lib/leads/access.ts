// Who can use the Leads Tool right now, from the database rows. Checked on
// every action, by the morning email and by the nightly runs. Server only.

import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { STUDIO_ID } from "./kinds";

type ClientRow = typeof schema.clients.$inferSelect;
type SiteRow = typeof schema.websites.$inferSelect;

export type Access = "STUDIO" | "INCLUDED" | "TRIAL" | "ACTIVE" | "NONE";

/**
 * The studio always; the Full Platform includes it until that plan ends; a
 * trial until it ends (or after, with a card set up to keep it); paid
 * plans until they end.
 */
export function accessOf(
  client: ClientRow,
  site: Pick<SiteRow, "plan" | "status"> | null | undefined,
  now = new Date(),
): Access {
  if (client.id === STUDIO_ID) return "STUDIO";
  if (client.archivedAt && client.archivedAt <= now) return "NONE";
  if (site?.plan === "FULL_PLATFORM" && site.status !== "CANCELLED")
    return "INCLUDED";
  switch (client.leadsStatus) {
    case "TRIAL":
      return client.leadsSubscriptionId ||
        (client.leadsTrialEndsAt && client.leadsTrialEndsAt > now)
        ? "TRIAL"
        : "NONE";
    case "ACTIVE":
    case "CANCELLING":
    case "PAST_DUE":
      return "ACTIVE";
    default:
      return "NONE";
  }
}

/** A business and its website plan, with what it can do with leads. */
export async function leadsAccount(clientId: string) {
  const [row] = await db
    .select({ client: schema.clients, site: schema.websites })
    .from(schema.clients)
    .leftJoin(schema.websites, eq(schema.websites.clientId, schema.clients.id))
    .where(and(eq(schema.clients.id, clientId)))
    .limit(1);
  if (!row) return undefined;
  const access = accessOf(row.client, row.site);
  return {
    ...row,
    access,
    usable:
      access !== "NONE" && (access === "STUDIO" || row.client.leadsEnabled),
  };
}
