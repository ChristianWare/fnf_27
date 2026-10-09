import type { Metadata } from "next";
import Inbox, { type ThreadRow } from "@/components/Admin/Messages/Inbox";
import Stats from "@/components/Admin/Stats/Stats";
import { PageHead } from "@/components/Dashboard/ui/ui";
import { clientKind, getAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Messages" };

const HOUR = 3_600_000;

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string | string[] }>;
}) {
  const { thread } = await searchParams;
  const { clients, now } = await getAdmin();
  const openKey = typeof thread === "string" ? thread : undefined;

  const rows: ThreadRow[] = clients.flatMap((c) =>
    c.threads.map((t) => ({
      ...t,
      key: `${c.id}.${t.id}`,
      clientId: c.id,
      business: c.business,
      kind: clientKind(c),
      contact: c.contact.name,
      email: c.contact.email,
    })),
  );

  const waiting = rows.filter(
    (t) => t.status === "OPEN" && t.messages.at(-1)?.from === "you",
  );
  const oldest = waiting
    .map((t) => t.messages.at(-1)!.at)
    .sort()
    .at(0);

  // How long clients wait for a first answer.
  const waits = rows.flatMap((t) => {
    const asked = t.messages.find((m) => m.from === "you");
    const answered =
      asked && t.messages.find((m) => m.from === "us" && m.at > asked.at);
    return asked && answered
      ? [
          (new Date(answered.at).getTime() - new Date(asked.at).getTime()) /
            HOUR,
        ]
      : [];
  });
  const average = waits.length
    ? waits.reduce((sum, h) => sum + h, 0) / waits.length
    : undefined;

  const hoursAgo = oldest
    ? Math.max(
        1,
        Math.round(
          (new Date(now).getTime() - new Date(oldest).getTime()) / HOUR,
        ),
      )
    : 0;

  return (
    <>
      <PageHead
        crumb='Studio'
        title='Messages'
        text='Everything clients send from their Support page, in one inbox. Your replies go to them by email and show up in their dashboard.'
      />
      <Stats
        items={[
          {
            label: "Needs a reply",
            value: String(waiting.length),
            note: oldest
              ? `Oldest waiting ${hoursAgo < 48 ? `${hoursAgo}h` : `${Math.round(hoursAgo / 24)} days`}`
              : "Nobody's waiting",
            tone: waiting.length ? "yellow" : undefined,
          },
          {
            label: "Open",
            value: String(rows.filter((t) => t.status !== "CLOSED").length),
            note: "Conversations still going",
          },
          {
            label: "Closed",
            value: String(rows.filter((t) => t.status === "CLOSED").length),
            note: `${rows.length} conversations in all`,
          },
          {
            label: "First reply",
            value:
              average === undefined
                ? "–"
                : average < 1
                  ? "< 1h"
                  : average < 48
                    ? `${Math.round(average)}h`
                    : `${Math.round(average / 24)} days`,
            note: "How long clients wait, on average",
            tone: "black",
          },
        ]}
      />
      <Inbox
        key={openKey ?? "inbox"}
        initial={rows}
        now={now}
        openKey={openKey}
      />
    </>
  );
}
