// Our invoices: one row per Stripe charge, numbered INV-2026-0001 and up in
// the order they happen, never reused. The branded PDF goes to the client
// by email when a payment goes through. Server only.

import type Stripe from "stripe";
import { and, eq, like, sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/db";
import { createId } from "@/lib/server/ids";
import { url } from "@/lib/server/config";
import { alertAdmins, emailClient } from "@/lib/server/notify";
import { addActivity, getSetting } from "@/lib/data/write";
import { loadClient, brandName } from "@/lib/data/clients";
import { renderInvoice } from "@/lib/invoices/InvoicePdf";
import { fmtShort, money } from "@/lib/dashboard/format";
import { LEADS, PLANS } from "@/lib/dashboard/plans";
import { asBillingDay } from "@/lib/dashboard/billing";
import { clientByCustomer, stripe, subscriptionOf } from "./stripe";

const { invoices, websites, clients } = schema;

type Product = "WEBSITE" | "SETUP" | "LEADS" | "OTHER";

const AZ = 7 * 3_600_000;
const azYear = (date: Date) => new Date(date.getTime() - AZ).getUTCFullYear();
const monthName = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "America/Phoenix",
  }).format(date);

/**
 * The line a monthly invoice actually charges for: the subscription's own
 * line, not a proration from a rate change.
 */
function serviceLine(inv: Stripe.Invoice) {
  const lines = inv.lines?.data ?? [];
  return (
    lines.find(
      (l) =>
        l.parent?.type === "subscription_item_details" &&
        !l.parent.subscription_item_details?.proration,
    ) ?? lines[0]
  );
}

/** Which of our products a Stripe invoice is for. */
async function productOf(
  inv: Stripe.Invoice,
  client: typeof clients.$inferSelect,
): Promise<Product> {
  const subId = subscriptionOf(inv);
  if (subId) {
    if (subId === client.leadsSubscriptionId) return "LEADS";
    const [site] = await db
      .select({ sub: websites.stripeSubscriptionId })
      .from(websites)
      .where(eq(websites.clientId, client.id))
      .limit(1);
    if (subId === site?.sub) return "WEBSITE";
    // A subscription we haven't linked yet (made by the old site, say).
    const sub = await stripe().subscriptions.retrieve(subId);
    const tag = String(
      sub.metadata?.fnf_product ?? sub.metadata?.productType ?? "",
    ).toUpperCase();
    return tag === "LEADS" ? "LEADS" : "WEBSITE";
  }
  const text = [
    inv.metadata?.purpose,
    inv.description,
    ...(inv.lines?.data ?? []).map((l) => l.description),
  ].join(" ");
  return /setup/i.test(text) ? "SETUP" : "OTHER";
}

async function describe(
  inv: Stripe.Invoice,
  product: Product,
  clientId: string,
) {
  const line = serviceLine(inv);
  const start = line?.period?.start
    ? asBillingDay(new Date(line.period.start * 1000))
    : undefined;
  const end = line?.period?.end
    ? asBillingDay(new Date(line.period.end * 1000))
    : undefined;
  const [site] = await db
    .select({ plan: websites.plan })
    .from(websites)
    .where(eq(websites.clientId, clientId))
    .limit(1);
  const plan = site ? PLANS[site.plan].name : "Website";

  if (product === "SETUP") return { description: `${plan} setup` };
  if ((product === "WEBSITE" || product === "LEADS") && start && end) {
    const name = product === "LEADS" ? LEADS.name : plan;
    // The last day it covers is the day before the next period starts.
    const last = new Date(end.getTime() - 86_400_000);
    const days = (end.getTime() - start.getTime()) / 86_400_000;
    return {
      description:
        days < 27
          ? `${name}, ${fmtShort(start)} – ${fmtShort(last)} (prorated)`
          : `${name}, ${monthName(start).split(" ")[0]}`,
      periodStart: start,
      periodEnd: last,
    };
  }
  return {
    description: inv.description ?? line?.description ?? "Payment",
  };
}

/** The next free number for the year, under a lock so two never collide. */
async function nextNumber(tx: Tx, at: Date) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext('fnf_invoice_numbers'))`,
  );
  const year = azYear(at);
  const rows = await tx
    .select({ number: invoices.number })
    .from(invoices)
    .where(like(invoices.number, `INV-${year}-%`));
  const max = rows.reduce(
    (m, r) => Math.max(m, Number(r.number.split("-")[2]) || 0),
    0,
  );
  return `INV-${year}-${String(max + 1).padStart(4, "0")}`;
}

/**
 * Records a Stripe invoice in our table (or updates it), once. Returns our
 * row and whether it just became paid.
 */
async function upsertInvoice(
  inv: Stripe.Invoice,
  client: typeof clients.$inferSelect,
  status: "PAID" | "DUE",
) {
  const product = await productOf(inv, client);
  const info = await describe(inv, product, client.id);
  // Monthly bills from the old site land at midnight UTC: file them on the 1st.
  const cycle = product === "WEBSITE" || product === "LEADS";
  const onDay = (date: Date) => (cycle ? asBillingDay(date) : date);
  const paidAt = onDay(
    inv.status_transitions?.paid_at
      ? new Date(inv.status_transitions.paid_at * 1000)
      : new Date(),
  );
  const method =
    client.cardBrand && client.cardLast4
      ? `${brandName(client.cardBrand)} ending ${client.cardLast4}`
      : null;
  const amount = status === "PAID" ? inv.amount_paid : inv.amount_due;

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(invoices)
      .where(eq(invoices.stripeInvoiceId, inv.id!))
      .limit(1);
    if (existing) {
      if (status === "PAID" && existing.status !== "PAID") {
        const [row] = await tx
          .update(invoices)
          .set({ status: "PAID", paidAt, method, amountCents: amount })
          .where(eq(invoices.id, existing.id))
          .returning();
        return { row, product, nowPaid: true, created: false };
      }
      return { row: existing, product, nowPaid: false, created: false };
    }
    const issuedAt = onDay(
      inv.created ? new Date(inv.created * 1000) : new Date(),
    );
    const [row] = await tx
      .insert(invoices)
      .values({
        id: createId(),
        clientId: client.id,
        number: await nextNumber(tx, status === "PAID" ? paidAt : issuedAt),
        stripeInvoiceId: inv.id,
        description: info.description,
        amountCents: amount,
        status,
        issuedAt: status === "PAID" ? paidAt : issuedAt,
        periodStart: info.periodStart,
        periodEnd: info.periodEnd,
        paidAt: status === "PAID" ? paidAt : null,
        method: status === "PAID" ? method : null,
        product,
      })
      .returning();
    return { row, product, nowPaid: status === "PAID", created: true };
  });
}

/** Emails the PDF to the client, unless invoice emails are switched off. */
export async function emailInvoice(invoiceId: string, force = false) {
  const [row] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  if (!row || row.status !== "PAID") return false;
  if (!force && (await getSetting<boolean>("invoice_emails")) === false)
    return false;
  const client = await loadClient(row.clientId);
  const invoice = client?.invoices.find((i) => i.id === row.id);
  if (!client || !invoice) return false;

  const pdf = await renderInvoice(invoice, client);
  const sent = await emailClient(
    client.id,
    `Receipt ${invoice.number}: ${money(invoice.amount)} paid`,
    {
      eyebrow: "Payment received",
      heading: `Thanks, ${client.contact.name.split(" ")[0]}. You're paid up.`,
      paragraphs: [
        `We received ${money(invoice.amount)} for ${invoice.description}. Your receipt is attached as a PDF, and it's always in your dashboard under Billing.`,
      ],
      details: [
        ["Invoice", invoice.number],
        ["Amount", money(invoice.amount)],
        ...(invoice.method
          ? ([["Paid with", invoice.method]] as [string, string][])
          : []),
      ],
      button: { label: "Open Billing", href: url("/dashboard/billing") },
    },
    {
      kind: "invoices",
      attachments: [
        { filename: `${invoice.number}.pdf`, content: new Uint8Array(pdf) },
      ],
    },
  );
  if (sent)
    await db
      .update(invoices)
      .set({ emailedAt: new Date() })
      .where(eq(invoices.id, row.id));
  return sent;
}

/** A payment went through: record it, mark the plan paid up, send the PDF. */
export async function recordPaidInvoice(invoiceId: string) {
  const inv = await stripe().invoices.retrieve(invoiceId);
  // The free days before the first 1st come as a $0 invoice: nothing to say.
  if (!inv.amount_paid) return;
  const client = await clientByCustomer(inv.customer);
  if (!client) {
    console.warn(
      `[billing] paid invoice ${inv.id} for a customer we don't know`,
    );
    return;
  }
  const { row, product, nowPaid } = await upsertInvoice(inv, client, "PAID");
  if (!nowPaid) return;

  if (product === "WEBSITE") {
    const subId = subscriptionOf(inv);
    const line = serviceLine(inv);
    await db
      .update(websites)
      .set({
        status: sql`case when ${websites.status} = 'PAST_DUE' then 'ACTIVE' else ${websites.status} end`,
        ...(line?.period?.end
          ? { nextBillingAt: asBillingDay(new Date(line.period.end * 1000)) }
          : {}),
        ...(subId ? { stripeSubscriptionId: subId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(websites.clientId, client.id));
  }
  const leadsSub = subscriptionOf(inv);
  // Only the plan they have now: a late bill from one that ended changes
  // nothing.
  if (product === "LEADS" && leadsSub) {
    const line = serviceLine(inv);
    await db
      .update(clients)
      .set({
        leadsStatus: sql`case when ${clients.leadsStatus} in ('PAST_DUE', 'TRIAL') then 'ACTIVE' else ${clients.leadsStatus} end`,
        ...(line?.period?.end
          ? {
              leadsNextBillingAt: asBillingDay(
                new Date(line.period.end * 1000),
              ),
            }
          : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(clients.id, client.id),
          eq(clients.leadsSubscriptionId, leadsSub),
        ),
      );
  }

  await addActivity(
    client.id,
    "invoice",
    `Paid ${row.number}: ${money(row.amountCents / 100)}`,
    "/dashboard/billing",
  );
  await emailInvoice(row.id);
  await alertAdmins(
    "payment",
    `${money(row.amountCents / 100)} from ${client.business}`,
    {
      eyebrow: "Payment received",
      heading: `${client.business} paid ${money(row.amountCents / 100)}`,
      paragraphs: [`${row.description}. Invoice ${row.number}.`],
      button: {
        label: "Open their billing",
        href: url(`/admin/clients/${client.id}?tab=billing`),
      },
    },
    product === "SETUP"
      ? `${money(row.amountCents / 100)} setup fee from ${client.business}`
      : undefined,
  );
}

/** A charge failed: mark it due, tell the client how to fix it, tell us. */
export async function recordFailedInvoice(invoiceId: string) {
  const inv = await stripe().invoices.retrieve(invoiceId);
  if (!inv.amount_due) return;
  const client = await clientByCustomer(inv.customer);
  if (!client) return;
  const { row, product, created } = await upsertInvoice(inv, client, "DUE");

  if (product === "WEBSITE") {
    await db
      .update(websites)
      .set({ status: "PAST_DUE", updatedAt: new Date() })
      .where(
        and(
          eq(websites.clientId, client.id),
          sql`${websites.status} <> 'CANCELLED'`,
        ),
      );
  }
  // Only the plan they have now: a late failure from one that ended can't
  // switch the tool back on.
  const leadsSub = subscriptionOf(inv);
  if (product === "LEADS" && leadsSub) {
    await db
      .update(clients)
      .set({ leadsStatus: "PAST_DUE", updatedAt: new Date() })
      .where(
        and(
          eq(clients.id, client.id),
          eq(clients.leadsSubscriptionId, leadsSub),
        ),
      );
  }
  // Stripe retries a failed charge a few times: only speak up the first time.
  if (!created) return;

  const amount = money(row.amountCents / 100);
  await addActivity(
    client.id,
    "invoice",
    `Your payment of ${amount} didn't go through`,
    "/dashboard/billing",
  );
  await emailClient(client.id, `Your payment of ${amount} didn't go through`, {
    eyebrow: "Billing",
    heading: "Your card was declined",
    paragraphs: [
      `We tried to charge ${amount} for ${row.description}, and your bank declined it. It happens: a card expires, or a bank flags a charge.`,
      "Add or update your card and we'll try again straight away. Your site keeps running while you sort it out.",
    ],
    button: { label: "Update your card", href: url("/dashboard/billing/card") },
  });
  await alertAdmins(
    "failed",
    `Payment failed: ${client.business}`,
    {
      eyebrow: "Payment failed",
      heading: `${client.business}'s payment of ${amount} failed`,
      paragraphs: [
        `${row.description}. Stripe will retry, and they've been emailed a link to update their card.`,
      ],
      button: {
        label: "Open their billing",
        href: url(`/admin/clients/${client.id}?tab=billing`),
      },
    },
    `Payment failed: ${amount} from ${client.business}`,
  );
}
