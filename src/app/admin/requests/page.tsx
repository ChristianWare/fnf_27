import type { Metadata } from "next";
import RequestsBoard, {
  type RequestRow,
} from "@/components/Admin/Requests/RequestsBoard";
import Stats from "@/components/Admin/Stats/Stats";
import { PageHead } from "@/components/Dashboard/ui/ui";
import { clientKind, getAdmin } from "@/lib/admin";
import { firstOfMonth } from "@/lib/dashboard/billing";
import { fmtMonthLong } from "@/lib/dashboard/format";

export const metadata: Metadata = { title: "Change requests" };

const DAY = 86_400_000;

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string | string[] }>;
}) {
  const { open } = await searchParams;
  const { clients, now } = await getAdmin();
  const openKey = typeof open === "string" ? open : undefined;

  const rows: RequestRow[] = clients.flatMap((c) =>
    c.changes.map((change) => ({
      ...change,
      key: `${c.id}.${change.id}`,
      clientId: c.id,
      business: c.business,
      kind: clientKind(c),
      firstName: c.contact.name.split(" ")[0],
      email: c.contact.email,
    })),
  );

  const received = rows.filter((r) => r.status === "PENDING").length;
  const doing = rows.filter((r) => r.status === "IN_PROGRESS").length;
  const month = firstOfMonth(now);
  const done = rows.filter((r) => r.status === "COMPLETED");
  const doneThisMonth = done.filter(
    (r) => (r.updatedAt ?? r.submittedAt) >= month,
  ).length;
  const days = done
    .filter((r) => r.updatedAt)
    .map(
      (r) =>
        (new Date(r.updatedAt!).getTime() - new Date(r.submittedAt).getTime()) /
        DAY,
    );
  const average = days.length
    ? days.reduce((sum, d) => sum + d, 0) / days.length
    : undefined;
  const live = clients.filter((c) => c.website?.facts.launchedAt).length;

  return (
    <>
      <PageHead
        crumb='Studio'
        title='Change requests'
        text={`Every request from ${live} live site${live === 1 ? "" : "s"}, on one board. Open one to move it along and reply; the client gets an email each time.`}
      />
      <Stats
        items={[
          {
            label: "Received",
            value: String(received),
            note: received ? "Waiting for you to start" : "Nothing new",
            tone: received ? "yellow" : undefined,
          },
          {
            label: "In progress",
            value: String(doing),
            note: "Being worked on now",
            tone: doing ? "mint" : undefined,
          },
          {
            label: `Done in ${fmtMonthLong(month).split(" ")[0]}`,
            value: String(doneThisMonth),
            note: `${done.length} done in all`,
          },
          {
            label: "Turnaround",
            value:
              average === undefined
                ? "–"
                : average < 1
                  ? "Same day"
                  : `${average.toFixed(1)} days`,
            note: "From request to done, on average",
            tone: "black",
          },
        ]}
      />
      <RequestsBoard
        key={openKey ?? "board"}
        initial={rows}
        now={now}
        openKey={openKey}
      />
    </>
  );
}
