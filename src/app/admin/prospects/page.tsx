import type { Metadata } from "next";
import { inArray } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { PageHead } from "@/components/Dashboard/ui/ui";
import Stats from "@/components/Admin/Stats/Stats";
import Prospects, {
  type ProspectView,
} from "@/components/Admin/Prospects/Prospects";
import { getAdmin } from "@/lib/admin";
import { statewide, stateName } from "@/lib/leads/areas";
import { openAreas } from "@/lib/leads/workspace";
import {
  azDayStart,
  callsSince,
  dailyGoal,
  listProspects,
  markWon,
  queueOf,
  type ProspectRow,
} from "@/lib/prospects/store";

export const metadata: Metadata = { title: "Prospects" };

const DAY = 86_400_000;

export default async function ProspectsPage() {
  const { now: nowIso } = await getAdmin();
  const now = new Date(nowIso);
  const today = azDayStart(now);
  // The week starts on Monday.
  const weekStart = new Date(
    today.getTime() - ((new Date(today.getTime() - 7 * 3_600_000).getUTCDay() + 6) % 7) * DAY,
  );

  const [rows, goal, week, areas] = await Promise.all([
    listProspects(),
    dailyGoal(),
    callsSince(weekStart),
    openAreas(),
  ]);
  await markWon(rows);

  const auditIds = rows.map((r) => r.auditId).filter((x): x is string => Boolean(x));
  const audits = auditIds.length
    ? await db
        .select({ id: s.audits.id, score: s.audits.score, status: s.audits.status })
        .from(s.audits)
        .where(inArray(s.audits.id, auditIds))
    : [];
  const auditById = new Map(audits.map((a) => [a.id, a]));

  // Whether the Leads Tool has their area: the whole state, a city we
  // have an area for, or a state we don't cover yet.
  const coverage = (r: ProspectRow): ProspectView["coverage"] => {
    if (!r.state) return { tone: "gray", label: "Area unknown" };
    if (statewide(r.state)) return { tone: "lime", label: `Covered: all of ${stateName(r.state)}` };
    const inState = areas.filter((a) => a.state === r.state);
    if (!inState.length) return { tone: "red", label: `No leads in ${stateName(r.state)} yet` };
    const city = r.city?.toLowerCase();
    const match = inState.find((a) => a.city.toLowerCase().startsWith(city ?? "~"));
    return match
      ? { tone: "lime", label: `Covered: ${match.name}` }
      : { tone: "yellow", label: `Check: near ${inState.map((a) => a.name).join(" or ")}?` };
  };

  const view: ProspectView[] = rows.map((r) => {
    const audit = r.auditId ? auditById.get(r.auditId) : undefined;
    return {
      id: r.id,
      business: r.business,
      contactName: r.contactName ?? "",
      phone: r.phone ?? "",
      email: r.email ?? "",
      website: r.website ?? "",
      mapsUrl: r.mapsUrl ?? "",
      city: r.city ?? "",
      state: r.state ?? "",
      list: r.list ?? "",
      tags: r.tags,
      notes: r.notes,
      rating: r.rating,
      reviews: r.reviews,
      stage: r.stage,
      tries: r.tries,
      calls: r.calls,
      nextAt: r.nextAt?.toISOString() ?? null,
      lastCalledAt: r.lastCalledAt?.toISOString() ?? null,
      lastOutcome: r.lastOutcome,
      clientId: r.clientId,
      audit: audit
        ? { id: audit.id, score: audit.status === "DONE" ? audit.score : null }
        : null,
      inviteSentAt: r.inviteSentAt?.toISOString() ?? null,
      coverage: coverage(r),
      createdAt: r.createdAt.toISOString(),
    };
  });

  const { due, fresh } = queueOf(rows, now, goal);
  const calledToday = week.filter((c) => c.at >= today).length;
  const talks = week.filter((c) => c.outcome === "INTERESTED").length;
  const invited = rows.filter((r) => r.inviteSentAt && r.inviteSentAt >= weekStart).length;
  const signedUp = rows.filter((r) => r.clientId).length;
  const won = rows.filter((r) => r.stage === "WON").length;
  const open = rows.filter((r) => r.stage === "NEW").length;

  return (
    <>
      <PageHead
        crumb='Studio'
        title='Prospects'
        text='The operators you’re calling. Work down today’s list, log how each call went, and the next call is set up for you. Texts are yours to send from your phone.'
      />
      <Stats
        items={[
          {
            label: "Called today",
            value: `${calledToday} of ${goal}`,
            note:
              calledToday >= goal
                ? "Goal met. Nice work."
                : `${goal - calledToday} to go`,
            tone: calledToday >= goal ? "lime" : "black",
          },
          {
            label: "This week",
            value: String(week.length),
            note: `${talks} interested`,
          },
          {
            label: "Invites sent",
            value: String(invited),
            note: "This week",
          },
          {
            label: "Signed up",
            value: String(signedUp),
            note: `${won} paying · ${open} not called yet`,
            tone: signedUp ? "mint" : undefined,
          },
        ]}
      />
      <Prospects
        rows={view}
        queue={{ due: due.map((r) => r.id), fresh: fresh.map((r) => r.id) }}
        goal={goal}
        calledToday={calledToday}
        now={now.toISOString()}
        lists={[...new Set(rows.map((r) => r.list).filter((x): x is string => Boolean(x)))]}
      />
    </>
  );
}
