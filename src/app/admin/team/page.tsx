import type { Metadata } from "next";
import Team from "@/components/Admin/Team/Team";
import { PageHead } from "@/components/Dashboard/ui/ui";
import { clientKind, getAdmin } from "@/lib/admin";

export const metadata: Metadata = { title: "Team and roles" };

export default async function TeamPage() {
  const { user, team, clients, now } = await getAdmin();
  const kinds = new Map(clients.map((c) => [c.id, clientKind(c)]));

  return (
    <>
      <PageHead
        crumb='Settings'
        title='Team and roles'
        text='Who can sign in, and what they see. Bring on another admin by inviting them, or by switching someone’s role.'
      />
      <Team
        initial={team.map((m) => ({
          ...m,
          kind: m.clientId ? kinds.get(m.clientId) : undefined,
        }))}
        meId={user.id}
        now={now}
      />
    </>
  );
}
