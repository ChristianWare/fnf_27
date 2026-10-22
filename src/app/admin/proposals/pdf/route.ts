// POST /admin/proposals/pdf: the proposal form's fields in, the PDF out.
// Nothing is saved. Admins only.

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/dal";
import { renderProposal } from "@/lib/proposals/ProposalPdf";
import { parseProposal, proposalFileName } from "@/lib/proposals/types";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN")
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });

  let proposal;
  try {
    proposal = parseProposal(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Those fields don't work.",
      },
      { status: 400 },
    );
  }

  const pdf = await renderProposal(proposal);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${proposalFileName(proposal)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
