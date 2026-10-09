// The 6 AM email: the Today page in the inbox, for everyone with the Leads
// Tool switched on who wants it (and the admins, for the studio's own).
// Also the trial reminders, and clearing out old data. Server only.

import { and, asc, eq, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { wants } from "@/lib/auth/users";
import { url, STUDIO } from "@/lib/server/config";
import { esc, render, sendEmail } from "@/lib/server/email";
import {
  emailClient,
  oneClickLink,
  unsubscribeLink,
} from "@/lib/server/notify";
import {
  dayKey,
  fmtDate,
  fmtDay,
  fmtWeekday,
  money,
} from "@/lib/dashboard/format";
import { prorate } from "@/lib/dashboard/billing";
import { LEADS } from "@/lib/dashboard/plans";
import { trialReminder } from "@/lib/billing/leads";
import { accessOf } from "./access";
import { googleReady, placePhotos } from "./apis/google";
import {
  fits,
  locate,
  rank,
  reasonsFor,
  thisWeek,
  todaysMoves,
  when,
} from "./advice";
import { CATEGORIES, EVENT_TYPES } from "./catalog";
import { STUDIO_ID } from "./kinds";
import { photoUrl } from "./photos";
import { loadWorkspace } from "./workspace";
import type { Located, Target } from "./types";

const s = schema;
const MONO = "'IBM Plex Mono',Menlo,Consolas,monospace";

/** Sends once per key: false if it already went. */
async function once(key: string) {
  const [row] = await db
    .insert(s.sentNotices)
    .values({ key })
    .onConflictDoNothing()
    .returning();
  return Boolean(row);
}

const forget = (key: string) =>
  db.delete(s.sentNotices).where(eq(s.sentNotices.key, key));

/* ── The morning email ── */

const TILE = {
  ACCOUNT: "#d9f99d",
  EVENT: "#e9d5ff",
};

/**
 * The first of a lead's pictures that will show in an email: a Google photo
 * once we know the place has one, or a picture from its listing or website.
 */
async function emailPicture(t: Located, google: boolean) {
  for (const candidate of t.images ?? []) {
    if (!candidate.startsWith("/api/leads/photo")) return candidate;
    const id = google
      ? new URL(candidate, "https://x").searchParams.get("id")
      : null;
    if (!id) continue;
    const has = await placePhotos(id)
      .then((list) => list.length > 0)
      .catch(() => false);
    if (has) return photoUrl(id, 160, { absolute: true });
  }
  return undefined;
}

async function rowHtml(
  t: Located,
  base: string,
  line: string,
  photos: boolean,
) {
  const href = url(`${base}/${encodeURIComponent(t.id)}`);
  const kind =
    t.kind === "ACCOUNT"
      ? CATEGORIES[t.category].short
      : EVENT_TYPES[t.type].short;
  const photo = await emailPicture(t, photos);
  // Its own width and height, so no email app squashes it.
  const tile = photo
    ? `<img src="${esc(photo)}" width="64" alt="" style="display:block;width:64px;height:auto;max-height:64px;border-radius:10px;">`
    : `<div style="width:64px;height:48px;border-radius:10px;background:${TILE[t.kind]};font-family:${MONO};font-size:14px;line-height:48px;text-align:center;color:#0d0d0e;">${esc(kind.slice(0, 2).toUpperCase())}</div>`;
  return `<tr><td width="64" style="padding:10px 0;vertical-align:top;">${tile}</td><td style="padding:10px 0 10px 14px;vertical-align:top;"><a href="${esc(href)}" style="font-size:16px;font-weight:700;line-height:1.35;color:#0d0d0e;text-decoration:none;">${esc(t.name)}</a><div style="margin-top:2px;font-family:${MONO};font-size:14px;text-transform:uppercase;color:#6b6b70;">${esc(`${kind}${t.city ? ` · ${t.city}` : ""}`)}</div><div style="margin-top:4px;font-size:14px;line-height:1.5;color:#3d3d40;">${esc(line)}</div></td></tr>`;
}

const section = (title: string, rows: string[]) =>
  rows.length
    ? `<p style="margin:24px 0 4px;font-family:${MONO};font-size:14px;text-transform:uppercase;color:#0d0d0e;">&#9679; ${esc(title)}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows.join("")}</table>`
    : "";

type Recipient = {
  id: string;
  email: string;
  name: string;
  kind: "digest" | "leads";
};

/** Who gets a business's morning email: its people, or the admins. */
async function recipients(clientId: string): Promise<Recipient[]> {
  if (clientId === STUDIO_ID) {
    const team = await db
      .select()
      .from(s.users)
      .where(and(eq(s.users.role, "ADMIN"), isNotNull(s.users.passwordHash)));
    return team
      .filter((u) => wants({ notify: u.notify ?? {} }, "leads"))
      .map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        kind: "leads" as const,
      }));
  }
  const people = await db
    .select()
    .from(s.users)
    .where(and(eq(s.users.clientId, clientId), eq(s.users.role, "CLIENT")))
    .orderBy(asc(s.users.createdAt));
  return people
    .filter(
      (u) => u.emailVerifiedAt && wants({ notify: u.notify ?? {} }, "digest"),
    )
    .map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      kind: "digest" as const,
    }));
}

/** One business's morning email, to each person who wants it. */
async function morningFor(
  client: typeof s.clients.$inferSelect,
  access: "STUDIO" | "INCLUDED" | "TRIAL" | "ACTIVE",
  now: Date,
) {
  const people = await recipients(client.id);
  const day = dayKey(now);
  const todo = [];
  for (const p of people) {
    if (await once(`leads-morning:${p.id}:${day}`)) todo.push(p);
  }
  if (!todo.length) return 0;

  const loaded = await loadWorkspace({
    clientId: client.id,
    access,
    trialEndsAt: client.leadsTrialEndsAt?.toISOString(),
    billing: {
      raw: client.leadsStatus,
      subscribed: Boolean(client.leadsSubscriptionId),
    },
    morningEmail: true,
    defaults: {
      company: client.business,
      name: todo[0].name,
      phone: client.phone ?? "",
      city: [client.city, client.state].filter(Boolean).join(", "),
    },
  });
  const w = loaded.workspace;
  if (!w.market.ready) {
    await Promise.all(todo.map((p) => forget(`leads-morning:${p.id}:${day}`)));
    return 0;
  }
  const nowIso = now.toISOString();
  const accounts = locate(w.accounts, w.settings.base);
  const events = locate(w.events, w.settings.base);
  const all: Located[] = [...accounts, ...events];
  const find = (id: string) => all.find((t) => t.id === id);
  const savedIds = new Set(w.saved.map((l) => l.targetId));
  const moves = todaysMoves(w.saved, find, nowIso);
  const fresh = all
    .filter(
      (t) =>
        t.foundAt > w.newSince && fits(t, w.settings) && !savedIds.has(t.id),
    )
    .sort((a, b) => rank(b, nowIso, w.newSince) - rank(a, nowIso, w.newSince));
  const soon = events
    .filter(
      (e) => thisWeek(e, nowIso) && fits(e, w.settings) && !savedIds.has(e.id),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!moves.length && !fresh.length && !soon.length) return 0;

  const base = client.id === STUDIO_ID ? "/admin/leads" : "/dashboard/leads";
  const photos = googleReady();
  const reasons = (t: Located) =>
    reasonsFor(t, nowIso)
      .slice(0, 3)
      .map((r) => r.text)
      .join(" · ");
  const moveRows = await Promise.all(
    moves
      .slice(0, 5)
      .map((m) =>
        rowHtml(
          m.target as Located,
          base,
          `${m.overdue ? "Overdue: " : ""}${m.verb}${m.target.contact ? ` · ${m.target.contact.name}` : ""} · ${m.detail}`,
          photos,
        ),
      ),
  );
  const freshRows = await Promise.all(
    fresh.slice(0, 5).map((t) => rowHtml(t, base, reasons(t), photos)),
  );
  const soonRows = await Promise.all(
    soon
      .slice(0, 3)
      .map((e) =>
        rowHtml(
          e,
          base,
          [when(e.date, nowIso), e.venue].filter(Boolean).join(" · "),
          photos,
        ),
      ),
  );
  const textLines = (
    title: string,
    list: Target[],
    line: (t: Target) => string,
  ) =>
    list.length
      ? [
          title.toUpperCase(),
          ...list.map(
            (t) =>
              `• ${t.name}: ${line(t)}\n  ${url(`${base}/${encodeURIComponent(t.id)}`)}`,
          ),
          "",
        ]
      : [];

  const summary = [
    moves.length
      ? `${moves.length} ${moves.length === 1 ? "lead" : "leads"} to reach today`
      : "",
    fresh.length ? `${fresh.length} new this morning` : "",
    soon.length
      ? `${soon.length} ${soon.length === 1 ? "event" : "events"} in the next two weeks`
      : "",
  ].filter(Boolean);
  const subject = summary
    .slice(0, 2)
    .join(", ")
    .replace(/^./, (c) => c.toUpperCase());

  let sent = 0;
  for (const p of todo) {
    const first = p.name.split(" ")[0] || "there";
    const { html, text } = render({
      preheader: summary.join(", "),
      eyebrow: `Leads · ${fmtDay(now)}`,
      heading: `Good morning, ${first}`,
      paragraphs: [
        `${summary.join(", ")}, within ${w.settings.radius} miles of ${w.settings.base.city}.`,
      ],
      blocks: {
        html:
          section("Your moves today", moveRows) +
          section("New this morning", freshRows) +
          section("Coming up", soonRows) +
          `<div style="height:24px"></div>`,
        text: [
          ...textLines(
            "Your moves today",
            moves.slice(0, 5).map((m) => m.target),
            (t) => {
              const m = moves.find((x) => x.target.id === t.id)!;
              return `${m.verb} · ${m.detail}`;
            },
          ),
          ...textLines("New this morning", fresh.slice(0, 5), (t) =>
            reasons(t as Located),
          ),
          ...textLines("Coming up", soon.slice(0, 3), (t) =>
            t.kind === "EVENT" ? when(t.date, nowIso) : "",
          ),
        ].join("\n"),
      },
      button: { label: "Open today's leads", href: url(base) },
      after:
        client.id === STUDIO_ID
          ? []
          : [
              "Places and photos from Google. Reply to this email with any question.",
            ],
      reason:
        client.id === STUDIO_ID
          ? "The studio's own Leads Tool, every morning at 6."
          : `Your Leads Tool from ${STUDIO.name}, every morning at 6.`,
      manage: url(`${base}/settings`),
      unsubscribe: unsubscribeLink(p.id, p.kind),
    });
    const result = await sendEmail({
      to: p.email,
      subject: subject || `Your leads for ${fmtWeekday(now)}`,
      html,
      text,
      unsubscribe: oneClickLink(p.id, p.kind),
    });
    if (result.ok) sent++;
  }
  return sent;
}

/** Everyone's morning email. */
export async function sendMorningEmails(now = new Date()) {
  const rows = await db
    .select({ client: s.clients, site: s.websites })
    .from(s.leadsSettings)
    .innerJoin(s.clients, eq(s.clients.id, s.leadsSettings.clientId))
    .leftJoin(s.websites, eq(s.websites.clientId, s.clients.id));
  let sent = 0;
  for (const { client, site } of rows) {
    const access = accessOf(client, site, now);
    if (access === "NONE") continue;
    if (access !== "STUDIO" && !client.leadsEnabled) continue;
    try {
      sent += await morningFor(client, access, now);
    } catch (error) {
      console.error(
        `[leads] morning email for ${client.business} failed:`,
        error,
      );
    }
  }
  return sent;
}

/* ── Trial reminders: three days before, and on the day ── */

export async function sendTrialReminders(now = new Date()) {
  const trials = await db
    .select({ client: s.clients, plan: s.websites.plan })
    .from(s.clients)
    .leftJoin(s.websites, eq(s.websites.clientId, s.clients.id))
    .where(
      and(
        eq(s.clients.leadsStatus, "TRIAL"),
        isNotNull(s.clients.leadsTrialEndsAt),
      ),
    );
  let sent = 0;
  for (const { client, plan } of trials) {
    if (plan === "FULL_PLATFORM" || !client.leadsTrialEndsAt) continue;
    const which = trialReminder(client.leadsTrialEndsAt, now);
    if (!which) continue;
    const ends = client.leadsTrialEndsAt.toISOString();
    if (!(await once(`leads-trial:${which}:${client.id}:${ends.slice(0, 10)}`)))
      continue;
    const first = money(prorate(LEADS.monthly, ends));
    const card = Boolean(client.leadsSubscriptionId);
    const today = which === "TODAY";
    await emailClient(
      client.id,
      card
        ? today
          ? "Your Leads Tool trial ends today"
          : "Your Leads Tool trial ends in 3 days"
        : today
          ? "Your Leads Tool trial ends today: add a card to keep it"
          : "3 days left in your Leads Tool trial",
      {
        eyebrow: LEADS.name,
        heading: today
          ? "Your free trial ends today"
          : `Your free trial ends ${fmtWeekday(ends)}`,
        paragraphs: card
          ? [
              `You're all set to keep it. On ${fmtDate(ends)} your card is charged ${first} for the rest of that month, then ${money(LEADS.monthly)} on the 1st of every month.`,
              "Nothing to do. If you'd rather stop, cancel from Billing before then and nothing is charged.",
            ]
          : [
              today
                ? "Add a card today to keep your morning leads coming. Without one, the Leads Tool pauses tonight."
                : "Add a card to keep your morning leads coming after the trial.",
              `The first charge covers the rest of that month (${first}), then it's ${money(LEADS.monthly)} on the 1st of every month. Cancel anytime.`,
            ],
        button: card
          ? { label: "Open Billing", href: url("/dashboard/billing#leads") }
          : { label: "Add a card", href: url("/dashboard/billing/leads") },
      },
    );
    sent++;
  }
  return sent;
}

/* ── Clearing out ── */

/**
 * Saved leads are kept 90 days after the Leads Tool ends, then removed,
 * along with old sent-email keys and usage over a year old.
 */
export async function clearOldLeads(now = new Date()) {
  const cutoff = new Date(now.getTime() - 90 * 86_400_000);
  const gone = await db
    .select({ id: s.clients.id })
    .from(s.clients)
    .leftJoin(s.websites, eq(s.websites.clientId, s.clients.id))
    .where(
      and(
        eq(s.clients.leadsStatus, "ENDED"),
        lt(s.clients.leadsEndedAt, cutoff),
        sql`(${s.websites.plan} is null or ${s.websites.plan} <> 'FULL_PLATFORM')`,
      ),
    );
  const ids = gone.map((g) => g.id);
  if (ids.length) {
    await db
      .delete(s.leadsActivity)
      .where(inArray(s.leadsActivity.clientId, ids));
    await db.delete(s.leadsSaved).where(inArray(s.leadsSaved.clientId, ids));
    await db
      .delete(s.leadsSettings)
      .where(inArray(s.leadsSettings.clientId, ids));
  }
  await db
    .delete(s.sentNotices)
    .where(
      lt(s.sentNotices.sentAt, new Date(now.getTime() - 120 * 86_400_000)),
    );
  await db
    .delete(s.leadsUsage)
    .where(
      lt(
        s.leadsUsage.day,
        new Date(now.getTime() - 400 * 86_400_000).toISOString().slice(0, 10),
      ),
    );
  return ids.length;
}
