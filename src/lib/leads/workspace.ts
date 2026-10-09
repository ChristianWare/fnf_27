// Everything one client's Leads Tool shows, from the database: their
// settings, the accounts and events within reach of their base, and the
// leads they've saved. The studio's own Leads Tool is the same, on a
// business called "studio" that isn't a client. Server only.

import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lte,
  sql,
} from "drizzle-orm";
import { db, schema } from "@/db";
import { createId } from "@/lib/server/ids";
import { alertAdmins } from "@/lib/server/notify";
import { url } from "@/lib/server/config";
import { LEADS } from "@/lib/dashboard/plans";
import { driveTime, findCity, firstPhoto, googleReady } from "./apis/google";
import { CATEGORIES, EVENT_TYPES } from "./catalog";
import { milesBetween, rank } from "./advice";
import { ACCOUNT_CATEGORIES, EVENT_KINDS, STUDIO_ID } from "./kinds";
import { CITIES, newSince } from "./market";
import { photoUrl } from "./photos";
import { organizerDomain } from "./research";
import { flushUsage } from "./usage";
import type {
  Account,
  AccountCategory,
  Contact,
  EventLead,
  EventType,
  LeadActivity,
  LeadExtras,
  LeadsSettings,
  LeadsWorkspace,
  Operator,
  SavedLead,
} from "./types";

const s = schema;
const DAY = 86_400_000;

/** How far Find can look: the widest radius on offer. */
export const REACH_MILES = 75;
/** Accounts sent to the browser at most (best first). */
const MAX_ACCOUNTS = 1200;

/* ── The studio ── */

/** The studio's own Leads Tool lives on this business. Made on first use. */
export async function ensureStudio() {
  await db
    .insert(s.clients)
    .values({
      id: STUDIO_ID,
      business: "Fonts & Footers",
      city: "Scottsdale",
      state: "AZ",
      websiteUrl: "https://fontsandfooters.com",
      approvedAt: new Date(),
    })
    .onConflictDoNothing();
}

/* ── Markets ── */

/**
 * The market a base belongs to: the nearest one within 30 miles, or a new
 * one centered on it (the admins hear about it).
 */
export async function marketFor(base: {
  city: string;
  state: string;
  lat: number;
  lng: number;
}) {
  const markets = await db.select().from(s.leadsMarkets);
  const near = markets
    .map((m) => ({ m, miles: milesBetween(m, base) }))
    .filter((x) => x.miles <= 30)
    .sort((a, b) => a.miles - b.miles)[0];
  if (near) return near.m.id;
  const id = createId();
  const name = `${base.city} area`;
  await db.insert(s.leadsMarkets).values({
    id,
    name,
    city: base.city,
    state: base.state,
    lat: base.lat,
    lng: base.lng,
  });
  await alertAdmins("signup", `New Leads Tool market: ${name}`, {
    eyebrow: "Leads Tool",
    heading: `A new market: ${name}`,
    paragraphs: [
      `A Leads Tool base in ${base.city}${base.state ? `, ${base.state}` : ""} isn't near any market yet, so we started one. Its first run is tonight, or run it now from the admin.`,
      "Add its event calendars there too.",
    ],
    button: {
      label: "Open the Leads Tool admin",
      href: url("/admin/leads-tool"),
    },
  });
  return id;
}

/** Where a city is: from our list, or from Google. */
export async function locateCity(text: string, who: { clientId?: string }) {
  const clean = text.trim().replace(/\s+/g, " ");
  const name = clean.split(",")[0].trim();
  const known = Object.keys(CITIES).find(
    (c) => c.toLowerCase() === name.toLowerCase(),
  );
  if (known && (!clean.includes(",") || /,\s*(az|arizona)\s*$/i.test(clean))) {
    return { city: known, state: "AZ", ...CITIES[known] };
  }
  if (!googleReady()) return undefined;
  return findCity(clean, who);
}

/* ── Settings ── */

export type SettingsRow = typeof s.leadsSettings.$inferSelect;

/**
 * A client's settings, made from their account the first time: their city
 * as the base, everything turned on, and their business for the scripts.
 */
export async function settingsFor(
  clientId: string,
  defaults: {
    company: string;
    name: string;
    phone: string;
    website?: string;
    city?: string | null;
    state?: string | null;
  },
): Promise<SettingsRow> {
  const [row] = await db
    .select()
    .from(s.leadsSettings)
    .where(eq(s.leadsSettings.clientId, clientId))
    .limit(1);
  if (row) return row;

  const cityText = [defaults.city, defaults.state].filter(Boolean).join(", ");
  const base = (cityText
    ? await locateCity(cityText, { clientId }).catch(() => undefined)
    : undefined) ?? { city: "Phoenix", state: "AZ", ...CITIES.Phoenix };
  const marketId = await marketFor(base);
  const operator: Operator = {
    company: defaults.company,
    name: defaults.name,
    fleet: "black SUVs and sedans",
    strength: "airport runs and events",
    phone: defaults.phone,
    website: defaults.website,
  };
  const [made] = await db
    .insert(s.leadsSettings)
    .values({
      clientId,
      baseCity: base.city,
      baseLat: base.lat,
      baseLng: base.lng,
      radius: 50,
      categories: [...ACCOUNT_CATEGORIES],
      eventTypes: [...EVENT_KINDS],
      operator,
      marketId,
    })
    .onConflictDoNothing()
    .returning();
  if (made) return made;
  const [again] = await db
    .select()
    .from(s.leadsSettings)
    .where(eq(s.leadsSettings.clientId, clientId))
    .limit(1);
  return again;
}

/** Settings for a client from their account, made if they're missing. */
export async function ensureSettings(clientId: string) {
  const [client] = await db
    .select()
    .from(s.clients)
    .where(eq(s.clients.id, clientId))
    .limit(1);
  if (!client) return undefined;
  const [person] = await db
    .select()
    .from(s.users)
    .where(eq(s.users.clientId, clientId))
    .orderBy(asc(s.users.createdAt))
    .limit(1);
  const [site] = await db
    .select({ domain: s.websites.domain })
    .from(s.websites)
    .where(eq(s.websites.clientId, clientId))
    .limit(1);
  return settingsFor(clientId, {
    company: client.business,
    name: person?.name ?? "",
    phone: person?.phone ?? client.phone ?? "",
    website: site?.domain ?? client.websiteUrl ?? undefined,
    city: [client.city, client.state].filter(Boolean).join(", "),
  });
}

export const toSettings = (
  row: SettingsRow,
  morningEmail: boolean,
): LeadsSettings => ({
  base: { city: row.baseCity, lat: row.baseLat, lng: row.baseLng },
  radius: row.radius,
  categories: row.categories,
  eventTypes: row.eventTypes,
  morningEmail,
  operator: row.operator,
});

/* ── Accounts and events ── */

/** The box around a base that holds everything within `miles`. */
export function boxAround(base: { lat: number; lng: number }, miles: number) {
  const dLat = miles / 69;
  const dLng = miles / (69 * Math.cos((base.lat * Math.PI) / 180));
  return {
    south: base.lat - dLat,
    north: base.lat + dLat,
    west: base.lng - dLng,
    east: base.lng + dLng,
  };
}

type ResearchRow = typeof s.leadsResearch.$inferSelect;

function contactFor(research: ResearchRow | undefined, saved: boolean) {
  const c = research?.contact;
  if (!c) return {};
  if (saved) {
    const contact: Contact = {
      name: c.name,
      title: c.title,
      email: c.email,
      phone: c.phone,
      verified: c.verified,
    };
    return { contact };
  }
  return { contactReady: Boolean(c.email) };
}

/** The key research is kept under for an event's organizer. */
export const eventResearchKey = (e: {
  organizerUrl?: string | null;
  url?: string | null;
  organizer: string;
}) => {
  const domain = organizerDomain(e.organizerUrl) ?? organizerDomain(e.url);
  return domain ? `org:${domain}` : undefined;
};

type PlaceRow = typeof s.leadsPlaces.$inferSelect;
type EventRow = typeof s.leadsEvents.$inferSelect;

export function toAccount(
  p: PlaceRow,
  research: ResearchRow | undefined,
  saved: boolean,
): Account {
  return {
    kind: "ACCOUNT",
    id: p.id,
    name: p.name ?? "",
    category: p.category,
    city: p.city ?? "",
    lat: p.lat ?? 0,
    lng: p.lng ?? 0,
    address: p.address ?? "",
    rating: p.rating ?? undefined,
    reviews: p.reviews ?? undefined,
    phone: p.phone ?? undefined,
    website: p.website ?? undefined,
    carService: research?.carService ?? "UNKNOWN",
    carServiceNote: research?.carServiceNote ?? undefined,
    note: research?.brief ?? undefined,
    news: p.news ?? undefined,
    foundAt: p.firstSeenAt.toISOString(),
    photo: photoUrl(p.id, 160),
    ...contactFor(research, saved),
  };
}

export function toEvent(
  e: EventRow,
  research: ResearchRow | undefined,
  saved: boolean,
): EventLead {
  return {
    kind: "EVENT",
    id: e.id,
    name: e.name,
    type: e.type,
    source: e.source,
    city: e.city,
    lat: e.lat ?? 0,
    lng: e.lng ?? 0,
    date: e.startsAt.toISOString(),
    endDate: e.endsAt?.toISOString(),
    allDay: e.allDay || undefined,
    venue: e.venue,
    address: e.address ?? undefined,
    organizer: e.organizer,
    guests: e.guests ?? undefined,
    phone: e.phone ?? undefined,
    website: e.url ?? e.organizerUrl ?? undefined,
    note: e.description ? firstSentence(e.description) : undefined,
    foundAt: e.foundAt.toISOString(),
    photo: e.venuePlaceId ? photoUrl(e.venuePlaceId, 160) : undefined,
    ...contactFor(research, saved),
  };
}

/** The first sentence or so of a description, for the brief. */
function firstSentence(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  const m = /^(.{40,220}?[.!?])\s/.exec(clean);
  return (m ? m[1] : clean.slice(0, 200)).trim() || undefined;
}

async function researchByKey(keys: string[]) {
  if (!keys.length) return new Map<string, ResearchRow>();
  const rows: ResearchRow[] = [];
  for (let i = 0; i < keys.length; i += 1000) {
    rows.push(
      ...(await db
        .select()
        .from(s.leadsResearch)
        .where(inArray(s.leadsResearch.key, keys.slice(i, i + 1000)))),
    );
  }
  return new Map(rows.map((r) => [r.key, r]));
}

/* ── Saved leads ── */

export async function savedLeads(clientId: string): Promise<SavedLead[]> {
  const [rows, acts] = await Promise.all([
    db
      .select()
      .from(s.leadsSaved)
      .where(eq(s.leadsSaved.clientId, clientId))
      .orderBy(desc(s.leadsSaved.savedAt)),
    db
      .select()
      .from(s.leadsActivity)
      .where(eq(s.leadsActivity.clientId, clientId))
      .orderBy(desc(s.leadsActivity.at)),
  ]);
  const byLead = new Map<string, LeadActivity[]>();
  for (const a of acts) {
    const list = byLead.get(a.targetId) ?? [];
    list.push({ id: a.id, at: a.at.toISOString(), kind: a.kind, text: a.text });
    byLead.set(a.targetId, list);
  }
  return rows.map((r) => toSaved(r, byLead.get(r.targetId) ?? []));
}

export function toSaved(
  r: typeof s.leadsSaved.$inferSelect,
  activity: LeadActivity[],
): SavedLead {
  return {
    targetId: r.targetId,
    stage: r.stage,
    savedAt: r.savedAt.toISOString(),
    remindAt: r.remindAt?.toISOString(),
    value: r.valueCents != null ? r.valueCents / 100 : undefined,
    per: r.per ?? undefined,
    wonAt: r.wonAt?.toISOString(),
    scripts: r.scripts ?? undefined,
    activity,
  };
}

/* ── One target, for actions and the lead page ── */

export async function findTarget(
  clientId: string,
  id: string,
): Promise<Account | EventLead | undefined> {
  const [saved] = await db
    .select({ id: s.leadsSaved.targetId })
    .from(s.leadsSaved)
    .where(
      and(eq(s.leadsSaved.clientId, clientId), eq(s.leadsSaved.targetId, id)),
    )
    .limit(1);
  if (id.startsWith("ev")) {
    const [e] = await db
      .select()
      .from(s.leadsEvents)
      .where(eq(s.leadsEvents.id, id))
      .limit(1);
    if (!e) return undefined;
    const key = eventResearchKey(e);
    const research = key ? (await researchByKey([key])).get(key) : undefined;
    return toEvent(e, research, Boolean(saved));
  }
  const [p] = await db
    .select()
    .from(s.leadsPlaces)
    .where(and(eq(s.leadsPlaces.id, id), isNotNull(s.leadsPlaces.name)))
    .limit(1);
  if (!p) return undefined;
  const research = (await researchByKey([p.id])).get(p.id);
  return toAccount(p, research, Boolean(saved));
}

/** Where to look someone up for a lead: the research key and the website. */
export async function researchTarget(id: string) {
  if (!id.startsWith("ev")) {
    const [p] = await db
      .select({ website: s.leadsPlaces.website })
      .from(s.leadsPlaces)
      .where(eq(s.leadsPlaces.id, id))
      .limit(1);
    return { key: id, website: p?.website ?? undefined };
  }
  const [e] = await db
    .select({
      organizerUrl: s.leadsEvents.organizerUrl,
      url: s.leadsEvents.url,
      organizer: s.leadsEvents.organizer,
    })
    .from(s.leadsEvents)
    .where(eq(s.leadsEvents.id, id))
    .limit(1);
  if (!e) return { key: undefined, website: undefined };
  const website = organizerDomain(e.organizerUrl)
    ? e.organizerUrl
    : organizerDomain(e.url)
      ? e.url
      : undefined;
  return { key: eventResearchKey(e), website: website ?? undefined };
}

/* ── The whole workspace ── */

export type Owner = {
  clientId: string;
  access: LeadsWorkspace["access"];
  trialEndsAt?: string;
  billing: LeadsWorkspace["billing"];
  morningEmail: boolean;
  defaults: Parameters<typeof settingsFor>[1];
};

export type Loaded = { state: "READY"; workspace: LeadsWorkspace };

export async function loadWorkspace(owner: Owner): Promise<Loaded> {
  const now = new Date();
  const row = await settingsFor(owner.clientId, owner.defaults);
  const [market] = row.marketId
    ? await db
        .select()
        .from(s.leadsMarkets)
        .where(eq(s.leadsMarkets.id, row.marketId))
        .limit(1)
    : [];
  // Before its market's first run, there's nothing around them yet: the
  // pages say so, and settings and saved leads still work.
  const ready = Boolean(market?.firstLoadedAt);
  const settings = toSettings(row, owner.morningEmail);
  const base = settings.base;
  const box = boxAround(base, REACH_MILES);
  const saved = await savedLeads(owner.clientId);
  const savedIds = new Set(saved.map((l) => l.targetId));

  const [placeRows, eventRows] = await Promise.all([
    db
      .select()
      .from(s.leadsPlaces)
      .where(
        and(
          eq(s.leadsPlaces.closed, false),
          isNotNull(s.leadsPlaces.name),
          gte(s.leadsPlaces.lat, box.south),
          lte(s.leadsPlaces.lat, box.north),
          gte(s.leadsPlaces.lng, box.west),
          lte(s.leadsPlaces.lng, box.east),
        ),
      ),
    db
      .select()
      .from(s.leadsEvents)
      .where(
        and(
          gte(s.leadsEvents.lat, box.south),
          lte(s.leadsEvents.lat, box.north),
          gte(s.leadsEvents.lng, box.west),
          lte(s.leadsEvents.lng, box.east),
          sql`coalesce(${s.leadsEvents.endsAt}, ${s.leadsEvents.startsAt}) >= ${new Date(now.getTime() - DAY)}`,
        ),
      )
      .orderBy(asc(s.leadsEvents.startsAt)),
  ]);

  // Saved ones that are out of reach now (moved base, past events).
  const missingPlaces = [...savedIds].filter(
    (id) => !id.startsWith("ev") && !placeRows.some((p) => p.id === id),
  );
  const missingEvents = [...savedIds].filter(
    (id) => id.startsWith("ev") && !eventRows.some((e) => e.id === id),
  );
  const [extraPlaces, extraEvents] = await Promise.all([
    missingPlaces.length
      ? db
          .select()
          .from(s.leadsPlaces)
          .where(
            and(
              inArray(s.leadsPlaces.id, missingPlaces),
              isNotNull(s.leadsPlaces.name),
            ),
          )
      : [],
    missingEvents.length
      ? db
          .select()
          .from(s.leadsEvents)
          .where(inArray(s.leadsEvents.id, missingEvents))
      : [],
  ]);

  const places = [...placeRows, ...extraPlaces];
  const events = [...eventRows, ...extraEvents];
  const eventKeys = new Map(events.map((e) => [e.id, eventResearchKey(e)]));
  const research = await researchByKey([
    ...places.map((p) => p.id),
    ...[...eventKeys.values()].filter((k): k is string => Boolean(k)),
  ]);

  const nowIso = now.toISOString();
  const accounts = places
    .map((p) => toAccount(p, research.get(p.id), savedIds.has(p.id)))
    .map((a) => ({ a, miles: milesBetween(base, a) }))
    .filter((x) => x.miles <= REACH_MILES || savedIds.has(x.a.id))
    .map((x) => ({ ...x, score: rank({ ...x.a, miles: x.miles }, nowIso) }))
    .sort((x, y) => y.score - x.score)
    .filter((x, i) => i < MAX_ACCOUNTS || savedIds.has(x.a.id))
    .map((x) => x.a);

  const eventLeads = events
    .map((e) => {
      const key = eventKeys.get(e.id);
      return toEvent(
        e,
        key ? research.get(key) : undefined,
        savedIds.has(e.id),
      );
    })
    .filter((e) => savedIds.has(e.id) || milesBetween(base, e) <= REACH_MILES);

  return {
    state: "READY",
    workspace: {
      now: nowIso,
      access: owner.access,
      trialEndsAt: owner.trialEndsAt,
      billing: owner.billing,
      monthly: LEADS.monthly,
      settings,
      market: {
        name: market?.name ?? `${row.baseCity} area`,
        ready,
        lastRunAt: market?.lastRunAt?.toISOString(),
      },
      newSince: ready
        ? newSince(now, market!.firstLoadedAt!.toISOString())
        : nowIso,
      accounts,
      events: eventLeads,
      saved,
    },
  };
}

/**
 * How many leads are waiting today, for the sidebar: new saved leads not
 * reached yet, and follow-ups due by tonight. A quick count, not the
 * whole workspace.
 */
export async function leadsDue(clientId: string, now = new Date()) {
  const local = new Date(now.getTime() - 7 * 3_600_000);
  const tomorrow = new Date(
    Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate() + 1,
    ) +
      7 * 3_600_000,
  );
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.leadsSaved)
    .where(
      and(
        eq(s.leadsSaved.clientId, clientId),
        sql`${s.leadsSaved.stage} not in ('WON', 'NOT_NOW')`,
        sql`(
          ${s.leadsSaved.remindAt} < ${tomorrow}
          or (${s.leadsSaved.stage} = 'NEW' and not exists (
            select 1 from ${s.leadsActivity} a
            where a.client_id = ${s.leadsSaved.clientId}
              and a.target_id = ${s.leadsSaved.targetId}
              and a.kind in ('EMAIL', 'TEXT', 'CALL', 'MET')
          ))
        )`,
      ),
    );
  return row?.n ?? 0;
}

/**
 * For the sidebar: whether they've set the tool up (it has their base),
 * and how many leads are due today.
 */
export async function leadsSidebar(clientId: string) {
  const [row] = await db
    .select({ id: s.leadsSettings.clientId })
    .from(s.leadsSettings)
    .where(eq(s.leadsSettings.clientId, clientId))
    .limit(1);
  const ready = Boolean(row);
  return { ready, due: ready ? await leadsDue(clientId) : 0 };
}

/** The angle for a target's kind: who to ask for, what to offer. */
export const angleOf = (kind: AccountCategory | EventType, isEvent: boolean) =>
  isEvent
    ? EVENT_TYPES[kind as EventType]
    : CATEGORIES[kind as AccountCategory];

/* ── A lead's page: the big photo, the map and the drive ── */

const within = <T>(work: Promise<T>, ms: number) =>
  Promise.race([
    work,
    new Promise<undefined>((resolve) =>
      setTimeout(() => resolve(undefined), ms),
    ),
  ]).catch(() => undefined);

/** The base, rounded to about 100 meters, for caching drive times. */
const baseKey = (base: { lat: number; lng: number }) =>
  `${base.lat.toFixed(3)},${base.lng.toFixed(3)}`;

async function drive(
  clientId: string,
  base: { lat: number; lng: number },
  target: Account | EventLead,
) {
  if (!target.lat || !target.lng) return undefined;
  const fromKey = baseKey(base);
  const [cached] = await db
    .select()
    .from(s.leadsDrives)
    .where(
      and(
        eq(s.leadsDrives.fromKey, fromKey),
        eq(s.leadsDrives.targetId, target.id),
      ),
    )
    .limit(1);
  if (cached && Date.now() - cached.at.getTime() < 29 * DAY)
    return { minutes: cached.minutes, miles: cached.miles };
  const found = await driveTime(base, target, { clientId });
  if (!found) return undefined;
  await db
    .insert(s.leadsDrives)
    .values({ fromKey, targetId: target.id, ...found, at: new Date() })
    .onConflictDoUpdate({
      target: [s.leadsDrives.fromKey, s.leadsDrives.targetId],
      set: { ...found, at: new Date() },
    });
  return found;
}

export async function leadExtras(
  clientId: string,
  target: Account | EventLead,
  base: { lat: number; lng: number },
): Promise<LeadExtras> {
  let placeId: string | undefined;
  if (target.kind === "ACCOUNT") placeId = target.id;
  else {
    const [e] = await db
      .select({ venuePlaceId: s.leadsEvents.venuePlaceId })
      .from(s.leadsEvents)
      .where(eq(s.leadsEvents.id, target.id))
      .limit(1);
    placeId = e?.venuePlaceId ?? undefined;
  }
  const google = googleReady();
  const [photo, driving] = await Promise.all([
    google && placeId ? within(firstPhoto(placeId), 3_000) : undefined,
    google ? within(drive(clientId, base, target), 4_000) : undefined,
  ]);
  await flushUsage();
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;
  const q = placeId
    ? `place_id:${placeId}`
    : target.lat && target.lng
      ? `${target.lat},${target.lng}`
      : undefined;
  return {
    ...(photo && placeId
      ? {
          photo: {
            src: photoUrl(placeId, 1200),
            credit: photo.author,
            creditUrl: photo.authorUrl,
          },
        }
      : {}),
    ...(key && q
      ? {
          map: `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&zoom=13`,
        }
      : {}),
    ...(driving ? { drive: driving } : {}),
  };
}
