// GET /audit/report/<id>/pdf: the full report as a PDF, the same one the
// email attaches. Only once the report is unlocked (an email was given, or
// an admin ran it), or for a signed-in admin.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/dal";
import { reportUrl } from "@/lib/audit/emails";
import { pdfFileName, renderAuditPdf } from "@/lib/audit/pdf";
import { getAudit } from "@/lib/audit/store";
import { toView } from "@/lib/audit/view";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const row = await getAudit((await params).id);
  if (!row || row.status !== "DONE")
    return new NextResponse("Not found", { status: 404 });
  const admin = (await getSessionUser())?.role === "ADMIN";
  const view = toView(row, { admin });
  if (!view.unlocked) return new NextResponse("Not found", { status: 404 });

  const pdf = await renderAuditPdf(view, reportUrl(row.id));
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdfFileName(view)}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
