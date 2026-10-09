import type { Metadata } from "next";
import ClientsTable, {
  type ClientRow,
} from "@/components/Admin/Clients/ClientsTable";
import { PageHead } from "@/components/Dashboard/ui/ui";
import {
  adminQueue,
  clientKind,
  clientMrr,
  clientStage,
  getAdmin,
  getArchived,
  kindLabel,
  lastActivity,
  studioStats,
  waitingOnClients,
} from "@/lib/admin";
import { money } from "@/lib/dashboard/format";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const { clients, now } = await getAdmin();
  const archived = await getArchived();
  const queue = adminQueue(clients, now);
  const waiting = waitingOnClients(clients);
  const stats = studioStats(clients);

  const rows: ClientRow[] = [...clients, ...archived].map((c) => {
    const kind = clientKind(c);
    const next = queue.find((item) => item.clientId === c.id);
    return {
      id: c.id,
      business: c.business,
      city: c.city,
      contact: c.contact.name,
      email: c.contact.email,
      kind,
      kindLabel: kindLabel[kind],
      stage: clientStage(c),
      mrr: clientMrr(c),
      pastDue: c.website?.status === "PAST_DUE",
      next: next && { title: next.title, href: next.href },
      waitingOnThem:
        waiting.find((w) => w.client.id === c.id)?.waiting.length ?? 0,
      lastActive: lastActivity(c),
      archived: archived.includes(c),
    };
  });

  return (
    <>
      <PageHead
        crumb='Studio'
        title='Clients'
        text={`${clients.length} clients, ${money(stats.mrr)} a month. Clients sign themselves up; website plans wait here for your approval.`}
      />
      <ClientsTable rows={rows} now={now} />
    </>
  );
}
