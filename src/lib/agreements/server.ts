// Agreements on the server: the saved templates, the account details an
// agreement is filled in from, and keeping an unsigned agreement's fees in
// step with the account.

import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { getSetting, setSetting } from "@/lib/data/write";
import { PLANS } from "@/lib/dashboard/plans";
import type { Client } from "@/lib/dashboard/types";
import {
  LIMITS,
  isAgreementBody,
  type AgreementBody,
  type AgreementTemplate,
} from "./types";

const KEY = "agreementTemplates";

export async function agreementTemplates(): Promise<AgreementTemplate[]> {
  const list = await getSetting<AgreementTemplate[]>(KEY);
  return Array.isArray(list) ? list : [];
}

export async function saveAgreementTemplates(list: AgreementTemplate[]) {
  await setSetting(KEY, list.slice(0, LIMITS.templates));
}

/** Who the agreement is between, from the account. */
export function partiesOf(client: Client): AgreementBody["parties"] {
  return {
    name: client.contact.name,
    business: client.business,
    email: client.contact.email,
    city: client.city,
  };
}

/**
 * The fees on an unsigned agreement, set again from the account: after
 * the admin changes the plan or the rates, the agreement still matches.
 */
export async function refreshAgreementFees(clientId: string) {
  const [site] = await db
    .select({
      plan: s.websites.plan,
      monthly: s.websites.monthlyCents,
      setup: s.websites.setupFeeCents,
    })
    .from(s.websites)
    .where(eq(s.websites.clientId, clientId))
    .limit(1);
  if (!site) return;
  const docs = await db
    .select({ id: s.documents.id, body: s.documents.body })
    .from(s.documents)
    .where(
      and(
        eq(s.documents.clientId, clientId),
        eq(s.documents.kind, "AGREEMENT"),
        eq(s.documents.status, "AWAITING"),
      ),
    );
  for (const doc of docs) {
    if (!isAgreementBody(doc.body)) continue;
    const body: AgreementBody = {
      ...doc.body,
      plan: site.plan,
      fees: {
        monthly: site.monthly / 100,
        setup: site.setup / 100,
        listSetup: PLANS[site.plan].setup,
      },
    };
    await db
      .update(s.documents)
      .set({ body })
      .where(eq(s.documents.id, doc.id));
  }
}
