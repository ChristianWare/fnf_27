import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import ProspectPage from "@/components/Admin/Prospects/ProspectPage";
import {
  azDayStart,
  callsSince,
  dailyGoal,
  getProspect,
  listProspects,
  queueOf,
} from "@/lib/prospects/store";
import { prospectViews } from "@/lib/prospects/view";
import { toPreviewView } from "@/lib/demos/preview";
import {
  NOT_SET_UP,
  PlatformError,
  platformReady,
  previewForProspect,
} from "@/lib/demos/platform";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getProspect((await params).id);
  return { title: found?.row.business ?? "Prospect" };
}

export default async function Page({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const found = await getProspect(id);
  if (!found) notFound();

  const now = new Date();
  const [rows, goal, today, [view]] = await Promise.all([
    listProspects(),
    dailyGoal(),
    callsSince(azDayStart(now)),
    prospectViews([found.row]),
  ]);

  // Today's list, so "Save and next" knows who's after this one.
  const { due, fresh } = queueOf(rows, now, goal);
  const order = [...due, ...fresh].map((r) => r.id);
  const at = order.indexOf(id);
  const nextId = at >= 0 ? (order[at + 1] ?? null) : null;

  // Their preview, from the demo platform. If it can't be reached, the
  // page still works and says why.
  let preview = null;
  let previewIssue: string | null = null;
  if (!platformReady()) {
    previewIssue = NOT_SET_UP;
  } else {
    try {
      const demo = await previewForProspect(id);
      preview = demo ? toPreviewView(demo, now) : null;
    } catch (e) {
      previewIssue =
        e instanceof PlatformError ? e.message : "Their preview couldn't be loaded.";
    }
  }

  return (
    <ProspectPage
      p={view}
      now={now.toISOString()}
      timeline={found.activity.map(({ a, by }) => ({
        id: a.id,
        kind: a.kind,
        outcome: a.outcome,
        text: a.text,
        by,
        at: a.at.toISOString(),
      }))}
      queue={{
        inQueue: at >= 0,
        nextId,
        calledToday: today.length,
        goal,
        left: order.length,
      }}
      preview={preview}
      previewIssue={previewIssue}
    />
  );
}
