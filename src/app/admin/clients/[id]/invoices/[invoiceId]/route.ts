// GET /admin/clients/<id>/invoices/<invoiceId>: any client's invoice as the
// same PDF they download themselves. Admins only.

import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/admin";
import { renderInvoice } from "@/lib/invoices/InvoicePdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; invoiceId: string }> },
) {
  const { id, invoiceId } = await params;
  const { client } = await getAdminClient(id);
  const invoice = client.invoices.find((item) => item.id === invoiceId);
  if (!invoice) return new NextResponse("Not found", { status: 404 });

  const pdf = await renderInvoice(invoice, client);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
