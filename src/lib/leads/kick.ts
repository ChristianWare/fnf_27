// Keeping a market's run going with nobody watching. A run takes several
// rounds of about four minutes (Vercel's limit per call), so each round
// books the next one itself, through /api/leads/continue, until the run is
// done. Rounds start on their own the moment someone gets the Leads Tool
// in a market that's never been loaded, so a new client never waits for
// the night, or for an admin. Server only.

import { and, eq, gt } from "drizzle-orm";
import { after } from "next/server";
import { db, schema } from "@/db";
import { url } from "@/lib/server/config";
import { runMarket, STEP_COUNT } from "./runs";

const s = schema;

/** A round's budget, inside the route's 300 seconds. */
const ROUND_MS = Number(process.env.LEADS_RUN_BUDGET_MS) || 240_000;
/** Rounds one run may take before it's left for the night (about an hour). */
const MAX_ROUNDS = 15;

/** A run that's part way through and nobody is working on. */
async function unfinished(marketId: string) {
  const [run] = await db
    .select({ id: s.leadsRuns.id, cursor: s.leadsRuns.cursor })
    .from(s.leadsRuns)
    .where(
      and(
        eq(s.leadsRuns.marketId, marketId),
        eq(s.leadsRuns.status, "RUNNING"),
      ),
    )
    .limit(1);
  return run;
}

async function busy(marketId: string) {
  const [row] = await db
    .select({ id: s.leadsRuns.id })
    .from(s.leadsRuns)
    .where(
      and(
        eq(s.leadsRuns.marketId, marketId),
        gt(s.leadsRuns.lockedUntil, new Date()),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/**
 * Starts (or carries on) a market's run after the response goes out, when
 * the market has never been loaded or a run is part way through. With
 * `force`, a new run starts even on a loaded market ("Run now").
 */
export async function kickMarket(
  marketId: string | null | undefined,
  options: { force?: boolean } = {},
) {
  if (!marketId) return false;
  const [market] = await db
    .select()
    .from(s.leadsMarkets)
    .where(eq(s.leadsMarkets.id, marketId))
    .limit(1);
  if (!market || market.paused) return false;
  if (await busy(marketId)) return false;
  if (!options.force && market.firstLoadedAt && !(await unfinished(marketId)))
    return false;
  after(() => round(marketId, options));
  return true;
}

/**
 * One round of a market's run, then the next one is booked if it needs
 * it. Only a first load or a run part way through; with `force`, a new run.
 */
export async function round(
  marketId: string,
  options: { force?: boolean } = {},
) {
  const [market] = await db
    .select()
    .from(s.leadsMarkets)
    .where(
      and(eq(s.leadsMarkets.id, marketId), eq(s.leadsMarkets.paused, false)),
    )
    .limit(1);
  if (!market) return;
  if (!options.force && market.firstLoadedAt && !(await unfinished(marketId)))
    return;
  try {
    const report = await runMarket(market, {
      trigger: "MANUAL",
      deadline: Date.now() + ROUND_MS,
    });
    if (report.status !== "RUNNING") return;
    const run = await unfinished(marketId);
    if (!run) return;
    const rounds = (Number(run.cursor.rounds) || 0) + 1;
    await db
      .update(s.leadsRuns)
      .set({ cursor: { ...run.cursor, rounds } })
      .where(eq(s.leadsRuns.id, run.id));
    if (rounds >= MAX_ROUNDS) {
      console.warn(
        `[leads] ${market.name}: ${rounds} rounds, leaving the rest for tonight`,
      );
      return;
    }
    await continueLater(marketId);
  } catch (error) {
    console.error(`[leads] round for ${market.name} failed:`, error);
  }
}

/**
 * Books the next round: a call to our own continue route, which answers at
 * once and does the work after. Waiting for that answer is what keeps this
 * function alive long enough for the call to be sent.
 */
async function continueLater(marketId: string) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn(
      "[leads] CRON_SECRET isn't set, so runs can't carry on by themselves.",
    );
    return;
  }
  try {
    const res = await fetch(
      url(`/api/leads/continue?market=${encodeURIComponent(marketId)}`),
      {
        headers: { authorization: `Bearer ${secret}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!res.ok) console.warn(`[leads] the continue route said ${res.status}`);
  } catch (error) {
    console.warn("[leads] couldn't book the next round:", error);
  }
}

/** How far a market's first load has got, for the "on the way" page. */
export async function loadProgress(marketId: string) {
  const run = await unfinished(marketId);
  if (!run) return undefined;
  const [full] = await db
    .select({
      counts: s.leadsRuns.counts,
      lockedUntil: s.leadsRuns.lockedUntil,
    })
    .from(s.leadsRuns)
    .where(eq(s.leadsRuns.id, run.id))
    .limit(1);
  return {
    stepsDone: run.cursor.done.length,
    steps: STEP_COUNT,
    accounts: full?.counts.placesSeen ?? 0,
    working: Boolean(full?.lockedUntil && full.lockedUntil > new Date()),
  };
}
