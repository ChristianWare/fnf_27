import type { Metadata } from "next";
import Header from "@/components/Admin/Client/Header";
import Tabs, { type Tab, type TabKey } from "@/components/Admin/Client/Tabs";
import Overview from "@/components/Admin/Client/Overview";
import BlueprintEditor from "@/components/Admin/Client/BlueprintEditor";
import Files from "@/components/Admin/Client/Files";
import GrowthSetup from "@/components/Admin/Client/GrowthSetup";
import ClientBilling from "@/components/Admin/Client/ClientBilling";
import RequestsBoard from "@/components/Admin/Requests/RequestsBoard";
import Inbox from "@/components/Admin/Messages/Inbox";
import styles from "@/components/Admin/Client/Client.module.css";
import { clientKind, getAdminClient } from "@/lib/admin";
import { nextFirst } from "@/lib/dashboard/billing";
import { blueprintCounts, isLive } from "@/lib/dashboard/helpers";
import { questionnaireFor } from "@/lib/dashboard/questionnaire";
import { url } from "@/lib/server/config";
import { loadGrowthAdmin } from "@/lib/growth/load";
import { domainOf } from "@/lib/growth/searchConsole";

// "Pull now" on the Growth tab reads up to 16 months from Google.
export const maxDuration = 120;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { client } = await getAdminClient((await params).id);
  return { title: client.business };
}

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const { client, now, user } = await getAdminClient(id);
  const kind = clientKind(client);
  const first = client.contact.name.split(" ")[0];
  const w = client.website;

  const open =
    client.changes.filter(
      (c) => c.status === "PENDING" || c.status === "IN_PROGRESS",
    ).length +
    client.threads.filter(
      (t) => t.status === "OPEN" && t.messages.at(-1)?.from === "you",
    ).length;

  const tabs: Tab[] = [
    { key: "overview", label: "Overview", icon: "home" },
    ...(w
      ? ([
          {
            key: "blueprint",
            label: "Blueprint",
            icon: "blueprint",
            badge: blueprintCounts(client.blueprint).review || undefined,
          },
          { key: "files", label: "Files", icon: "file" },
          { key: "growth", label: "Growth", icon: "chart" },
        ] satisfies Tab[])
      : []),
    {
      key: "conversations",
      label: "Conversations",
      icon: "message",
      badge: open || undefined,
    },
    { key: "billing", label: "Billing", icon: "card" },
  ];
  const active: TabKey = tabs.find((t) => t.key === tab)?.key ?? "overview";
  const growthAdmin =
    active === "growth" && w
      ? await loadGrowthAdmin(client.id, now)
      : undefined;

  const who = {
    clientId: client.id,
    business: client.business,
    kind,
    firstName: first,
    email: client.contact.email,
  };

  return (
    <>
      <Header client={client} />
      <Tabs clientId={client.id} tabs={tabs} active={active} />

      {active === "overview" && <Overview client={client} now={now} />}

      {active === "blueprint" && w && (
        <BlueprintEditor
          clientId={client.id}
          initial={client.blueprint}
          firstName={first}
          you={user.name}
        />
      )}

      {active === "files" && w && (
        <Files
          clientId={client.id}
          firstName={first}
          email={client.contact.email}
          sections={questionnaireFor(w.plan)}
          answers={client.answers}
          submittedAt={w.facts.questionnaireSubmittedAt}
          assets={client.assets}
          designs={client.designs}
          documents={client.documents}
        />
      )}

      {active === "growth" && w && growthAdmin && (
        <GrowthSetup
          clientId={client.id}
          growth={client.growth}
          live={isLive(client)}
          launchedAt={w.facts.launchedAt}
          firstName={first}
          business={client.business}
          city={client.city}
          domain={domainOf({
            domain: w.domain ?? null,
            liveUrl: w.liveUrl ?? null,
          })}
          admin={growthAdmin}
          now={now}
        />
      )}

      {active === "conversations" && (
        <div className={styles.stackPage}>
          <section className={styles.sectionTitle}>
            <h2 className={styles.heading}>Change requests</h2>
            <p>
              {w?.facts.launchedAt
                ? `Unlimited for ${first}. Open one to move it along and reply.`
                : `They open on launch day. Until then, ${first} comments on the blueprint.`}
            </p>
          </section>
          <RequestsBoard
            initial={client.changes.map((c) => ({
              ...c,
              ...who,
              key: `${client.id}.${c.id}`,
            }))}
            now={now}
            showClient={false}
          />
          <section className={styles.sectionTitle}>
            <h2 className={styles.heading}>Messages</h2>
            <p>Everything {first} has sent from their Support page.</p>
          </section>
          <Inbox
            initial={client.threads.map((t) => ({
              ...t,
              key: `${client.id}.${t.id}`,
              clientId: client.id,
              business: client.business,
              kind,
              contact: client.contact.name,
              email: client.contact.email,
            }))}
            now={now}
            showClient={false}
            you={user.name}
          />
        </div>
      )}

      {active === "billing" && (
        <ClientBilling
          clientId={client.id}
          firstName={first}
          email={client.contact.email}
          website={
            w && {
              plan: w.plan,
              monthly: w.monthly,
              setupFee: w.setupFee,
              status: w.status,
              nextBillingAt: w.nextBillingAt,
              setupPaidAt: w.facts.setupFeePaidAt,
            }
          }
          leads={client.leads}
          card={client.card}
          invoices={client.invoices}
          nextFirst={nextFirst(now)}
          cardLink={url("/dashboard/billing/card")}
          stripeLinked={Boolean(client.stripeLinked)}
        />
      )}
    </>
  );
}
