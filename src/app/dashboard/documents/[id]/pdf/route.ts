// GET /dashboard/documents/<id>/pdf: a service agreement as a PDF, signed
// or waiting to be. Only the signed-in client's own; the proxy and the DAL
// keep everyone else out.

import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/dashboard";
import { renderAgreement } from "@/lib/agreements/AgreementPdf";
import { agreementFileName } from "@/lib/agreements/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { client } = await getDashboard();
  const doc = client.documents.find((item) => item.id === id);
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
