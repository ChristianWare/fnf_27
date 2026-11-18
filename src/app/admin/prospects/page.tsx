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

  const view = await prospectViews(rows);

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
