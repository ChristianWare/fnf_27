// A client's Overview tab: approval for a new sign-up, the build, their
// Leads Tool, what's been happening, and your notes.

import styles from "./Client.module.css";
import Approve from "./Approve";
import Tracker from "./Tracker";
import { Archive, Notes, SiteLinks } from "./Details";
import Icon, { type IconName } from "@/components/Dashboard/icons";
import { Pill } from "@/components/Dashboard/ui/ui";
import { clientKind, inThirdPerson } from "@/lib/admin/derive";
import { firstOfMonth, lastDayOf, nextFirst } from "@/lib/dashboard/billing";
import { fmtAgo, fmtDate, money } from "@/lib/dashboard/format";
import { projectSteps, trialDaysLeft } from "@/lib/dashboard/helpers";
import { LEADS } from "@/lib/dashboard/plans";
import type { ActivityKind, Client } from "@/lib/dashboard/types";

const kindIcon: Record<ActivityKind, IconName> = {
  build: "status",
  change: "pen",
  document: "file",
  growth: "chart",
  invoice: "card",
  leads: "target",
  support: "message",
};

export default function Overview({
  client,
  now,
}: {
  client: Client;
  now: string;
}) {
  const first = client.contact.name.split(" ")[0];
  const w = client.website;
  const isNew = clientKind(client) === "NEW" && !client.approvedAt;

  return (
    <div className={styles.split}>
      <div className={styles.column}>
        {isNew && (
          <Approve
            business={client.business}
            name={client.contact.name}
            email={client.contact.email}
            request={client.request}
            nextFirst={nextFirst(now)}
          />
        )}

        {w && (
          <Tracker
            steps={projectSteps(client)}
            business={client.business}
            firstName={first}
          />
        )}

        {!w && client.leads.status !== "NONE" && (
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.titles}>
                <h2 className={styles.heading}>Leads Tool</h2>
                <p>
                  {client.leads.status === "TRIAL"
                    ? `Free trial, ${trialDaysLeft(client, now)} days left. ${client.card ? "Card on file, so it carries on after." : "No card yet."}`
                    : `Paying ${money(LEADS.monthly)} a month, billed on the 1st.`}
                </p>
              </div>
              <Pill
                tone={client.leads.status === "TRIAL" ? "purple" : "lime"}
                dot
              >
                {client.leads.status === "TRIAL" ? "Trial" : "Active"}
              </Pill>
            </div>
            <dl className={styles.miniFacts}>
              <div>
                <dt>Started</dt>
                <dd>
                  {client.leads.startedAt
                    ? fmtDate(client.leads.startedAt)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>
                  Trial {client.leads.status === "TRIAL" ? "ends" : "ended"}
                </dt>
                <dd>
                  {client.leads.trialEndsAt
                    ? fmtDate(client.leads.trialEndsAt)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Card</dt>
                <dd>
                  {client.card
                    ? `${client.card.brand} ${client.card.last4}`
                    : "None"}
                </dd>
              </div>
            </dl>
          </section>
        )}

        <section className={styles.card}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>Activity</h2>
            <p>What {first} has seen happen, newest first.</p>
          </div>
          {client.activity.length ? (
            <ol className={styles.feed}>
              {client.activity.map((item) => (
                <li key={item.id} className={styles.feedItem}>
                  <span className={styles.feedIcon}>
                    <Icon name={kindIcon[item.kind]} />
                  </span>
                  <p className={styles.feedText}>{inThirdPerson(item.text)}</p>
                  <span className={styles.when}>{fmtAgo(item.at, now)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className={styles.help}>Nothing yet.</p>
          )}
        </section>
      </div>

      <div className={styles.column}>
        <Notes initial={client.notes} />
        {w && (
          <SiteLinks
            domain={w.domain}
            previewUrl={w.previewUrl}
            liveUrl={w.liveUrl}
            bookingAdminUrl={w.bookingAdminUrl}
            platform={w.plan === "FULL_PLATFORM"}
          />
        )}
        <Archive
          business={client.business}
          endsOn={lastDayOf(firstOfMonth(now))}
        />
      </div>
    </div>
  );
}
