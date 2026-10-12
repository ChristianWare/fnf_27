// GET /audit/report/<id>/status: where a running audit is, for the report
// page's progress (which checks are done). Nothing else about the audit.

import { getAudit } from "@/lib/audit/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const row = await getAudit((await params).id);
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(
    { status: row.status, steps: row.steps },
    { headers: { "Cache-Control": "no-store" } },
  );
}
