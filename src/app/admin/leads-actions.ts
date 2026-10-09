"use server";

// The admin's Leads Tool page: running a market now, pausing one, adding
// one, the calendars each market reads, and each client's on/off switch.

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { and, eq, gt } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSessionUser } from "@/lib/auth/dal";
import { done, fail, type ActionResult } from "@/lib/actions";
import { createId } from "@/lib/server/ids";
import { addActivity } from "@/lib/data/write";
import { emailClient } from "@/lib/server/notify";
import { url } from "@/lib/server/config";
import { readCalendar } from "@/lib/leads/apis/calendars";
import {
  checkServices as checkEach,
  type Check,
} from "@/lib/leads/apis/checks";
import { publicUrl } from "@/lib/leads/apis/http";
import { eventKind } from "@/lib/leads/classify";
import { CALENDAR_SOURCES, EVENT_KINDS, STUDIO_ID } from "@/lib/leads/kinds";
import { runMarket } from "@/lib/leads/runs";
import { flushUsage } from "@/lib/leads/usage";
import { ensureSettings, locateCity, marketFor } from "@/lib/leads/workspace";
import type { CalendarSource, EventType } from "@/lib/leads/types";

const s = schema;

async function admin() {
  const user = await getSessionUser();
  return user?.role === "ADMIN" ? user : undefined;
}

const refresh = () => revalidatePath("/admin/leads-tool");

/** Starts (or carries on) a market's run. It keeps going after the reply. */
export async function runMarketNow(marketId: string): Promise<ActionResult> {
  if (!(await admin())) return fail("Only admins can do that.");
  const [market] = await db
    .select()
    .from(s.leadsMarkets)
    .where(eq(s.leadsMarkets.id, marketId))
    .limit(1);
  if (!market) return fail("That market is gone.");
  const [busy] = await db
    .select({ id: s.leadsRuns.id })
    .from(s.leadsRuns)
    .where(
      and(
        eq(s.leadsRuns.marketId, marketId),
        gt(s.leadsRuns.lockedUntil, new Date()),
      ),
    )
    .limit(1);
  if (busy) return fail("It's running right now. Give it a few minutes.");
  // Up to about four minutes; a long first run carries on
  // with another click, or tonight.
  after(async () => {
    try {
      await runMarket(market, {
        trigger: "MANUAL",
        deadline: Date.now() + 240_000,
      });
    } catch (error) {
      console.error(`[leads] run for ${market.name} failed:`, error);
    }
  });
  return done();
}

export type { Check };

/** Asks each service a small question, to show what its key can do. */
export async function checkServices(): Promise<
  ActionResult<Record<string, Check>>
> {
  if (!(await admin())) return fail("Only admins can do that.");
  const results = await checkEach();
  await flushUsage();
  return done(results);
}

export async function setMarketPaused(
  marketId: string,
  paused: boolean,
): Promise<ActionResult> {
  if (!(await admin())) return fail("Only admins can do that.");
  await db
    .update(s.leadsMarkets)
    .set({ paused })
    .where(eq(s.leadsMarkets.id, marketId));
  refresh();
  return done();
}

/** A market for a city, before anyone's based there. */
export async function addMarket(
  city: string,
): Promise<ActionResult<{ id: string }>> {
  if (!(await admin())) return fail("Only admins can do that.");
  const text = city.trim().slice(0, 100);
  if (!text) return fail('Type a city, like "Dallas, TX".');
  const found = await locateCity(text, {}).catch(() => undefined);
  await flushUsage();
  if (!found) return fail(`We couldn't find ${text}. Try "City, State".`);
  const id = await marketFor(found);
  refresh();
  return done({ id });
}

/* ── Calendars ── */

type SourceInput = {
  label: string;
  url: string;
  source: CalendarSource;
  eventType?: EventType | "";
};

function checkSource(input: SourceInput) {
  const label = input.label?.trim().slice(0, 80);
  const address = publicUrl(input.url?.trim());
  if (!label) return { error: "Give it a name." };
  if (!address) return { error: "That isn't a public web address." };
  if (!(CALENDAR_SOURCES as readonly string[]).includes(input.source))
    return { error: "Pick what kind of calendar it is." };
  const eventType =
    input.eventType &&
    (EVENT_KINDS as readonly string[]).includes(input.eventType)
      ? (input.eventType as EventType)
      : null;
  return { label, url: address.toString(), source: input.source, eventType };
}

export async function addSource(
  marketId: string,
  input: SourceInput,
): Promise<ActionResult<{ id: string }>> {
  if (!(await admin())) return fail("Only admins can do that.");
  const checked = checkSource(input);
  if ("error" in checked) return fail(checked.error!);
  const id = createId();
  await db.insert(s.leadsSources).values({ id, marketId, ...checked });
  refresh();
  return done({ id });
}

export type SourceTest = {
  format: string;
  found: number;
  kept: number;
  sample: { name: string; date: string; type?: EventType; venue?: string }[];
};

/** Reads a calendar now and shows what it would find. Saves nothing. */
export async function testSource(
  input: Pick<SourceInput, "url" | "source" | "eventType">,
): Promise<ActionResult<SourceTest>> {
  if (!(await admin())) return fail("Only admins can do that.");
  const address = publicUrl(input.url?.trim());
  if (!address) return fail("That isn't a public web address.");
  const source = (CALENDAR_SOURCES as readonly string[]).includes(input.source)
    ? input.source
    : "TOURISM";
  try {
    const now = new Date();
    const read = await readCalendar(address.toString(), source, now, {});
    await flushUsage();
    const upcoming = read.events.filter(
      (e) =>
        new Date(e.endsAt ?? e.startsAt).getTime() >=
        now.getTime() - 86_400_000,
    );
    const fallback =
      input.eventType &&
      (EVENT_KINDS as readonly string[]).includes(input.eventType)
        ? (input.eventType as EventType)
        : undefined;
    const typed = upcoming.map((e) => ({
      e,
      type: e.type ?? eventKind(e.name, e.description, fallback),
    }));
    return done({
      format: {
        ICAL: "iCal",
        RSS: "RSS",
        EVENT_DATA: "Event data on the page",
        AI: "Read by the AI",
      }[read.format],
      found: upcoming.length,
      kept: typed.filter((x) => x.type).length,
      sample: typed.slice(0, 6).map(({ e, type }) => ({
        name: e.name,
        date: e.startsAt,
        type,
        venue: e.venue,
      })),
    });
  } catch (error) {
    await flushUsage();
    return fail(
      `Couldn't read it: ${error instanceof Error ? error.message : "it didn't answer."}`,
    );
  }
}

export async function setSourceEnabled(
  id: string,
  enabled: boolean,
): Promise<ActionResult> {
  if (!(await admin())) return fail("Only admins can do that.");
  await db
    .update(s.leadsSources)
    .set({ enabled })
    .where(eq(s.leadsSources.id, id));
  refresh();
  return done();
}

export async function removeSource(id: string): Promise<ActionResult> {
  if (!(await admin())) return fail("Only admins can do that.");
  await db.delete(s.leadsSources).where(eq(s.leadsSources.id, id));
  refresh();
  return done();
}

/* ── A client's switch ── */

export async function setClientLeads(
  clientId: string,
  enabled: boolean,
): Promise<ActionResult> {
  if (!(await admin())) return fail("Only admins can do that.");
  if (clientId === STUDIO_ID) return fail("The studio's own is always on.");
  const [row] = await db
    .update(s.clients)
    .set({ leadsEnabled: enabled, updatedAt: new Date() })
    .where(eq(s.clients.id, clientId))
    .returning();
  if (!row) return fail("That client is gone.");
  if (enabled) await ensureSettings(clientId).catch(() => undefined);
  const [market] = await db
    .select({ loaded: s.leadsMarkets.firstLoadedAt })
    .from(s.leadsSettings)
    .innerJoin(s.leadsMarkets, eq(s.leadsMarkets.id, s.leadsSettings.marketId))
    .where(eq(s.leadsSettings.clientId, clientId))
    .limit(1);
  // Only when there's something to see: otherwise the morning email is
  // the first they hear.
  if (enabled && market?.loaded) {
    await addActivity(
      clientId,
      "leads",
      "Your Leads Tool is on",
      "/dashboard/leads",
    );
    await emailClient(clientId, "Your Leads Tool is ready", {
      eyebrow: "Leads Tool",
      heading: "Your leads are in",
      paragraphs: [
        "The hotels, venues, companies and events around you that book rides are in your dashboard now, with the person to contact at each one and what to say.",
        "New ones land every morning at 6.",
      ],
      button: { label: "Open the Leads Tool", href: url("/dashboard/leads") },
    });
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard", "layout");
  return done();
}
