import type { Metadata } from "next";
import { PageHead } from "@/components/Dashboard/ui/ui";
import Stats from "@/components/Admin/Stats/Stats";
import Prospects from "@/components/Admin/Prospects/Prospects";
import { getAdmin } from "@/lib/admin";
import {
  azDayStart,
  callsSince,
  dailyGoal,
  listProspects,
  markWon,
  queueOf,
} from "@/lib/prospects/store";
import { prospectViews } from "@/lib/prospects/view";
import { and, eq } from "drizzle-orm";
import { db, schema as s } from "@/db";
import { isGone, listPlatformDemos, platformReady } from "@/lib/demos/platform";
import type { PlatformDemo } from "@/lib/demos/preview";

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

  const [rows, goal, week] = await Promise.all([
    listProspects(),
    dailyGoal(),
    callsSince(weekStart),
  ]);
  await markWon(rows);

  const [base, demos, sentRows] = await Promise.all([
    prospectViews(rows),
    platformReady() ? listPlatformDemos().catch(() => [] as PlatformDemo[]) : Promise.resolve([] as PlatformDemo[]),
    db
      .select({ prospectId: s.prospectActivity.prospectId, text: s.prospectActivity.text })
      .from(s.prospectActivity)
      .where(and(eq(s.prospectActivity.kind, "PREVIEW"))),
  ]);

  // Each prospect's newest live preview: opened, sent, or just made.
  const sent = new Set(sentRows.map((r) => `${r.prospectId} ${r.text.split(": ").pop()}`));
  const newest = new Map<string, PlatformDemo>();
  for (const d of demos) {
    if (isGone(d) || d.status !== "live" || !d.ref) continue;
    const cur = newest.get(d.ref);
    if (!cur || d.createdAt > cur.createdAt) newest.set(d.ref, d);
  }
  const view = base.map((v) => {
    const d = newest.get(v.id);
    if (!d) return { ...v, preview: null };
    const state = d.firstOpenedAt ? "opened" : sent.has(`${v.id} ${d.url}`) ? "sent" : "made";
    return { ...v, preview: { state, views: d.views } as const };
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
