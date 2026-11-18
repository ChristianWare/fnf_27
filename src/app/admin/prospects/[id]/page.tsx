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
import { samplePreview } from "@/lib/demos/sample";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preview?: string | string[] }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getProspect((await params).id);
  return { title: found?.row.business ?? "Prospect" };
}

export default async function Page({ params, searchParams }: Props) {
  await requireAdmin();
  const { id } = await params;
  const { preview } = await searchParams;
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

  // Previews aren't built yet: "?preview=sample" shows what one will look
  // like once it's made.
  const sample =
    preview === "sample"
      ? samplePreview(
          {
            id: view.id,
            business: view.business,
            contactName: view.contactName,
            phone: view.phone,
            state: view.state,
          },
          now,
          1,
        )
      : null;

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
      preview={sample}
    />
  );
}
