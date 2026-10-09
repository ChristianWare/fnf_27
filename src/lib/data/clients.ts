// Clients, as the dashboard and the admin see them: every table about a
// business, put together into one Client (src/lib/dashboard/types.ts).
// A handful of queries for any number of clients. Server only.

import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { db, schema } from "@/db";
import { STUDIO_ID } from "@/lib/leads/kinds";
import type {
  Activity,
  Asset,
  AssetLabel,
  BlueprintPage,
  Card,
  Client,
  Designs,
  Doc,
  Growth,
  Invoice,
  LeadsStatus,
  Thread,
} from "@/lib/dashboard/types";

const s = schema;

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : undefined);
const dollars = (cents: number) => Math.round(cents) / 100;

const LABELS: AssetLabel[] = [
  "Logo",
  "Fleet photo",
  "Team photo",
  "Brand guide",
  "Other",
];

export const sizeLabel = (bytes?: number | null) =>
  !bytes
    ? ""
    : bytes > 1_000_000
      ? `${(bytes / 1_000_000).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1000))} KB`;

const isPicture = (mime?: string | null, url?: string) =>
  Boolean(mime?.startsWith("image/")) ||
  /\.(png|jpe?g|webp|gif|avif|svg)(\?|$)/i.test(url ?? "");

/** "Visa", "Mastercard", "Amex"… from Stripe's lowercase brand. */
export const brandName = (brand: string) =>
  ({
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "Amex",
    discover: "Discover",
    diners: "Diners Club",
    jcb: "JCB",
    unionpay: "UnionPay",
  })[brand.toLowerCase()] ?? brand.charAt(0).toUpperCase() + brand.slice(1);

function card(c: typeof s.clients.$inferSelect, now: Date): Card | undefined {
  if (!c.cardBrand || !c.cardLast4) return undefined;
  const month = c.cardExpMonth ?? 12;
  const year = c.cardExpYear ?? 2099;
  // A card works through the last day of its month.
  const expired = new Date(Date.UTC(year, month, 1)) <= now;
  return {
    brand: brandName(c.cardBrand),
    last4: c.cardLast4,
    exp: `${String(month).padStart(2, "0")}/${String(year).slice(-2)}`,
    ...(expired ? { expired: true } : {}),
  };
}

/**
 * The Leads Tool as the dashboard sees it: on trial, on, or off. A trial
 * past its end is off, unless a card is set up to keep it (Stripe charges
 * at the end of the trial).
 */
function leadsView(
  c: typeof s.clients.$inferSelect,
  now: Date,
): Client["leads"] {
  const trialOver =
    c.leadsStatus === "TRIAL" &&
    !c.leadsSubscriptionId &&
    (!c.leadsTrialEndsAt || c.leadsTrialEndsAt <= now);
  const status: LeadsStatus =
    c.leadsStatus === "TRIAL"
      ? trialOver
        ? "NONE"
        : "TRIAL"
      : c.leadsStatus === "ACTIVE" ||
          c.leadsStatus === "CANCELLING" ||
          c.leadsStatus === "PAST_DUE"
        ? "ACTIVE"
        : "NONE";
  return {
    status,
    raw: trialOver ? "ENDED" : c.leadsStatus,
    startedAt: iso(c.leadsStartedAt),
    trialEndsAt: iso(c.leadsTrialEndsAt),
    nextBillingAt: iso(c.leadsNextBillingAt),
    endedAt: iso(c.leadsEndedAt ?? (trialOver ? c.leadsTrialEndsAt : null)),
    subscribed: Boolean(c.leadsSubscriptionId),
    enabled: c.leadsEnabled,
  };
}

export type ClientScope =
  { id: string } | { ids: string[] } | { archived: boolean };

export async function loadClients(scope: ClientScope): Promise<Client[]> {
  const now = new Date();
  const which =
    "id" in scope
      ? eq(s.clients.id, scope.id)
      : "ids" in scope
        ? inArray(s.clients.id, scope.ids.length ? scope.ids : [""])
        : scope.archived
          ? and(isNotNull(s.clients.archivedAt), lte(s.clients.archivedAt, now))
          : or(isNull(s.clients.archivedAt), gt(s.clients.archivedAt, now));
  // The studio's own Leads Tool isn't a client.
  const where = and(which, ne(s.clients.id, STUDIO_ID));

  const rows = await db
    .select()
    .from(s.clients)
    .where(where)
    .orderBy(desc(s.clients.signedUpAt));
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const inIds = (column: PgColumn): SQL =>
    ids.length === 1 ? eq(column, ids[0]) : inArray(column, ids);

  const [
    people,
    sites,
    docs,
    quests,
    files,
    pages,
    sections,
    comments,
    changes,
    threads,
    messages,
    acts,
    bills,
  ] = await Promise.all([
    db
      .select()
      .from(s.users)
      .where(inIds(s.users.clientId))
      .orderBy(asc(s.users.createdAt)),
    db.select().from(s.websites).where(inIds(s.websites.clientId)),
    db
      .select()
      .from(s.documents)
      .where(inIds(s.documents.clientId))
      .orderBy(desc(s.documents.sentAt)),
    db.select().from(s.questionnaires).where(inIds(s.questionnaires.clientId)),
    db
      .select()
      .from(s.assets)
      .where(inIds(s.assets.clientId))
      .orderBy(asc(s.assets.createdAt)),
    db
      .select()
      .from(s.blueprintPages)
      .where(inIds(s.blueprintPages.clientId))
      .orderBy(asc(s.blueprintPages.position), asc(s.blueprintPages.createdAt)),
    db
      .select({ section: s.blueprintSections })
      .from(s.blueprintSections)
      .innerJoin(
        s.blueprintPages,
        eq(s.blueprintPages.id, s.blueprintSections.pageId),
      )
      .where(inIds(s.blueprintPages.clientId))
      .orderBy(asc(s.blueprintSections.position)),
    db
      .select({ comment: s.blueprintComments })
      .from(s.blueprintComments)
      .innerJoin(
        s.blueprintSections,
        eq(s.blueprintSections.id, s.blueprintComments.sectionId),
      )
      .innerJoin(
        s.blueprintPages,
        eq(s.blueprintPages.id, s.blueprintSections.pageId),
      )
      .where(inIds(s.blueprintPages.clientId))
      .orderBy(asc(s.blueprintComments.createdAt)),
    db
      .select()
      .from(s.changeRequests)
      .where(inIds(s.changeRequests.clientId))
      .orderBy(desc(s.changeRequests.number)),
    db
      .select()
      .from(s.threads)
      .where(inIds(s.threads.clientId))
      .orderBy(desc(s.threads.updatedAt)),
    db
      .select({ message: s.messages })
      .from(s.messages)
      .innerJoin(s.threads, eq(s.threads.id, s.messages.threadId))
      .where(inIds(s.threads.clientId))
      .orderBy(asc(s.messages.createdAt)),
    db
      .select()
      .from(s.activity)
      .where(inIds(s.activity.clientId))
      .orderBy(desc(s.activity.createdAt)),
    db
      .select()
      .from(s.invoices)
      .where(inIds(s.invoices.clientId))
      .orderBy(desc(s.invoices.issuedAt)),
  ]);

  return rows.map((c): Client => {
    const contact = people.find((p) => p.clientId === c.id);
    const site = sites.find((w) => w.clientId === c.id);
    const quest = quests.find((q) => q.clientId === c.id);
    const city = [c.city, c.state].filter(Boolean).join(", ");

    const documents: Doc[] = docs
      .filter((d) => d.clientId === c.id && d.visible)
      .map((d) => ({
        id: d.id,
        title: d.title,
        summary: d.summary,
        kind: d.kind,
        status: d.status,
        sentAt: d.sentAt.toISOString(),
        signedAt: iso(d.signedAt),
        signedBy: d.signedBy ?? undefined,
        body: d.body ?? [],
        fileUrl: d.fileUrl ?? undefined,
        fileName: d.fileName ?? undefined,
      }));

    const assets: Asset[] = files
      .filter((a) => a.clientId === c.id)
      .map((a) => ({
        id: a.id,
        name: a.name,
        label: LABELS.includes(a.label as AssetLabel)
          ? (a.label as AssetLabel)
          : "Other",
        size: sizeLabel(a.sizeBytes),
        addedAt: a.createdAt.toISOString(),
        src: isPicture(a.mimeType, a.url) ? a.url : undefined,
        url: a.url,
      }));

    const blueprint: BlueprintPage[] = pages
      .filter((p) => p.clientId === c.id)
      .map((p) => ({
        id: p.id,
        name: p.name,
        path: p.path,
        purpose: p.purpose,
        keyword: p.keyword ?? undefined,
        sections: sections
          .filter(({ section }) => section.pageId === p.id)
          .map(({ section }) => ({
            id: section.id,
            title: section.title,
            status: section.status,
            copy: section.copy ?? [],
            comments: comments
              .filter(({ comment }) => comment.sectionId === section.id)
              .map(({ comment }) => ({
                id: comment.id,
                from: comment.author === "CLIENT" ? "you" : "us",
                name: comment.name,
                at: comment.createdAt.toISOString(),
                text: comment.text,
              })),
          })),
      }));

    const threadList: Thread[] = threads
      .filter((t) => t.clientId === c.id)
      .map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        ...(t.clientUnread ? { unread: true } : {}),
        messages: messages
          .filter(({ message }) => message.threadId === t.id)
          .map(({ message }) => ({
            id: message.id,
            from: message.author === "CLIENT" ? "you" : "us",
            name: message.name,
            at: message.createdAt.toISOString(),
            text: message.text,
          })),
      }));

    const invoices: Invoice[] = bills
      .filter((i) => i.clientId === c.id && i.status !== "VOID")
      .map((i) => ({
        id: i.id,
        number: i.number,
        date: i.issuedAt.toISOString(),
        description: i.description,
        ...(i.periodStart && i.periodEnd
          ? {
              period: {
                from: i.periodStart.toISOString(),
                to: i.periodEnd.toISOString(),
              },
            }
          : {}),
        amount: dollars(i.amountCents),
        status: i.status === "PAID" ? "PAID" : "DUE",
        paidAt: iso(i.paidAt),
        method: i.method ?? undefined,
      }));

    const activity: Activity[] = acts
      .filter((a) => a.clientId === c.id)
      .slice(0, 60)
      .map((a) => ({
        id: a.id,
        at: a.createdAt.toISOString(),
        kind: a.kind,
        text: a.text,
        href: a.href ?? undefined,
      }));

    const designs = (site?.designs ?? { options: [] }) as Designs;
    const growth = site?.growth as Growth | null | undefined;

    return {
      id: c.id,
      business: c.business,
      city,
      contact: {
        name: contact?.name || c.business,
        email: contact?.email ?? "",
        phone: contact?.phone ?? c.phone ?? "",
        role: contact?.title ?? "Owner",
        verified: Boolean(contact?.emailVerifiedAt),
      },
      signedUpAt: c.signedUpAt.toISOString(),
      approvedAt: iso(c.approvedAt),
      archivedAt: iso(c.archivedAt),
      request:
        c.requestPlan || c.requestMessage
          ? {
              plan: c.requestPlan ?? undefined,
              message: c.requestMessage ?? undefined,
            }
          : undefined,
      notes: c.notes ?? undefined,
      website: site
        ? {
            plan: site.plan,
            status: site.status,
            monthly: dollars(site.monthlyCents),
            setupFee: dollars(site.setupFeeCents),
            domain: site.domain ?? "",
            startedAt: site.startedAt.toISOString(),
            targetLaunch: iso(site.targetLaunch),
            liveUrl: site.liveUrl ?? undefined,
            previewUrl: site.previewUrl ?? undefined,
            bookingAdminUrl: site.bookingAdminUrl ?? undefined,
            nextBillingAt: iso(site.nextBillingAt),
            facts: site.facts ?? {},
          }
        : undefined,
      leads: leadsView(c, now),
      documents,
      answers: quest?.answers ?? {},
      assets,
      blueprint,
      designs: { ...designs, options: designs.options ?? [] },
      changes: changes
        .filter((r) => r.clientId === c.id)
        .map((r) => ({
          id: r.id,
          number: r.number,
          title: r.title,
          area: r.area,
          details: r.details,
          status: r.status,
          submittedAt: r.submittedAt.toISOString(),
          updatedAt: iso(r.updatedAt),
          reply: r.reply ?? undefined,
        })),
      growth: growth && Array.isArray(growth.months) ? growth : undefined,
      invoices,
      card: card(c, now),
      stripeLinked: Boolean(c.stripeCustomerId),
      threads: threadList,
      activity,
    };
  });
}

export async function loadClient(id: string) {
  const [client] = await loadClients({ id });
  return client;
}
