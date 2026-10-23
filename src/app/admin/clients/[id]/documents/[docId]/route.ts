// GET /admin/clients/<id>/documents/<docId>: a client's service agreement
// as the same PDF they download themselves. Admins only.

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/admin";
import { renderAgreement } from "@/lib/agreements/AgreementPdf";
import { agreementFileName } from "@/lib/agreements/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { id, docId } = await params;
  const { client } = await getAdminClient(id);
  const doc = client.documents.find((item) => item.id === docId);
  if (!doc?.agreement) return new NextResponse("Not found", { status: 404 });

  const pdf = await renderAgreement(doc.agreement, doc);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${agreementFileName(client.business)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
