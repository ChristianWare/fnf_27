// GET /dashboard/billing/invoices/<id>: one invoice as a PDF. Only the
// signed-in client's own invoices; the proxy and the DAL keep everyone
// else out.

import { NextResponse } from "next/server";
import { getDashboard } from "@/lib/dashboard";
import { renderInvoice } from "@/lib/invoices/InvoicePdf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { client } = await getDashboard();
  const invoice = client.invoices.find((item) => item.id === id);
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
