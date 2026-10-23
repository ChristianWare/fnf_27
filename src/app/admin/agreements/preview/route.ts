// POST /admin/agreements/preview: an agreement the admin is still shaping,
// as the PDF the client will see. Nothing is saved. Admins only.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/dal";
import { loadClient } from "@/lib/data/clients";
import { renderAgreement } from "@/lib/agreements/AgreementPdf";
import { partiesOf } from "@/lib/agreements/server";
import {
  agreementFileName,
  buildAgreement,
  cleanDraft,
} from "@/lib/agreements/types";
import { PLANS } from "@/lib/dashboard/plans";
import type { PlanId } from "@/lib/dashboard/types";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN")
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  const input = (await request.json().catch(() => ({}))) as {
    clientId?: string;
    plan?: PlanId;
    monthly?: number;
    setup?: number;
    agreement?: unknown;
  };
  const client = input.clientId ? await loadClient(input.clientId) : null;
  if (!client)
    return NextResponse.json({ error: "No such client." }, { status: 404 });

  let draft;
  try {
    draft = cleanDraft(input.agreement);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Check the agreement." },
      { status: 400 },
    );
  }
  const plan: PlanId =
    input.plan && input.plan in PLANS
      ? input.plan
      : (client.website?.plan ?? "WEBSITE_ONLY");
  const body = buildAgreement(draft, {
    parties: partiesOf(client),
    plan,
    monthly: Number(input.monthly) || client.website?.monthly || PLANS[plan].monthly,
    setup: Math.max(0, Number(input.setup) || 0),
  });
  const pdf = await renderAgreement(body, { id: "PREVIEW0" });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Preview-${agreementFileName(client.business)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
