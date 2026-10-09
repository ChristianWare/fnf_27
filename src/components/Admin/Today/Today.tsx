// The admin's home: everything that needs you across the studio, the next
// billing run, where each client is, and what's been happening.

import Link from "next/link";
import styles from "./Today.module.css";
import Mark from "../Mark";
import Nudge from "../Nudge";
import Icon from "@/components/Dashboard/icons";
import { ButtonLink, Pill } from "@/components/Dashboard/ui/ui";
import {
  adminQueue,
  clientKind,
  inThirdPerson,
  nextBillingRun,
  revenueByMonth,
  studioStats,
  waitingOnClients,
  type QueueItem,
} from "@/lib/admin/derive";
import {
  fmtAgo,
  fmtDay,
  fmtMonth,
  fmtShort,
  greeting,
  money,
} from "@/lib/dashboard/format";
import type { Client } from "@/lib/dashboard/types";

const groups: { priority: QueueItem["priority"]; title: string }[] = [
  { priority: 1, title: "Today" },
  { priority: 2, title: "This week" },
  { priority: 3, title: "When you can" },
];

export default function Today({
  clients,
  name,
  now,
}: {
  clients: Client[];
  name: string;
  now: string;
}) {
  const stats = studioStats(clients);
  const queue = adminQueue(clients, now);
  const run = nextBillingRun(clients, now);
  const revenue = revenueByMonth(clients, now);
  const waiting = waitingOnClients(clients);
  const today = queue.filter((item) => item.priority === 1).length;
  const thisMonth = revenue.at(-1)!;
  const lastMonth = revenue.at(-2)!;
  const revenueTop = Math.max(...revenue.map((r) => r.recurring + r.setup), 1);

  const activity = clients
    .flatMap((c) => c.activity.map((a) => ({ ...a, client: c })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  const pipeline = [
    { key: "new", label: "New", count: stats.newSignups, tone: styles.segNew },
    {
      key: "build",
      label: "In build",
      count: stats.building,
      tone: styles.segBuild,
    },
    { key: "live", label: "Live", count: stats.live, tone: styles.segLive },
    {
      key: "leads",
      label: "Leads Tool",
      count: stats.trials + stats.leads,
      tone: styles.segLeads,
    },
  ];

  return (
    <>
      {/* ── The command center ── */}
      <header className={styles.hero}>
        <div className={styles.heroTop}>
          <span className={styles.eyebrow}>{fmtDay(now)}</span>
          <div className={styles.heroActions}>
            <ButtonLink
              href='/admin/clients'
              variant='white'
              small
              icon='arrow'
            >
              All clients
            </ButtonLink>
          </div>
        </div>
        <h1 className={`h3 ${styles.hello}`}>
          {greeting(now)}, {name.split(" ")[0]}
        </h1>
        <p className={styles.summary}>
          {today
            ? `${today} thing${today === 1 ? " needs" : "s need"} you today.`
            : "Nothing urgent today."}{" "}
          The next billing run is {fmtShort(run.date)}: {money(run.total)} from{" "}
          {run.lines.length} charge{run.lines.length === 1 ? "" : "s"}.
        </p>

        <dl className={styles.kpis}>
          <div className={styles.kpi}>
            <dt className={styles.kpiLabel}>Monthly revenue</dt>
            <dd className={styles.kpiValue}>{money(stats.mrr)}</dd>
            <dd className={styles.kpiNote}>
              {money(Math.round(thisMonth.recurring + thisMonth.setup))}{" "}
              collected in {fmtMonth(thisMonth.month)}
            </dd>
          </div>
          <div className={styles.kpi}>
            <dt className={styles.kpiLabel}>Clients</dt>
            <dd className={styles.kpiValue}>{stats.clients}</dd>
            <dd className={styles.kpiNote}>
              {stats.newSignups
                ? `${stats.newSignups} new sign-up${stats.newSignups === 1 ? "" : "s"}`
                : "No new sign-ups"}
            </dd>
          </div>
          <div className={styles.kpi}>
            <dt className={styles.kpiLabel}>In build</dt>
            <dd className={styles.kpiValue}>{stats.building}</dd>
            <dd className={styles.kpiNote}>
              {stats.reviewSections} section
              {stats.reviewSections === 1 ? "" : "s"} out for review
            </dd>
          </div>
          <div className={styles.kpi}>
            <dt className={styles.kpiLabel}>Live sites</dt>
            <dd className={styles.kpiValue}>{stats.live}</dd>
            <dd className={styles.kpiNote}>
              {stats.pastDue
                ? `${stats.pastDue} payment${stats.pastDue === 1 ? "" : "s"} failed`
                : "All payments on time"}
            </dd>
          </div>
        </dl>
      </header>

      <div className={styles.grid}>
        {/* ── Needs you ── */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div className={styles.titles}>
              <h2 className={styles.heading}>Needs you</h2>
              <p>Everything waiting on you, across every client.</p>
            </div>
            <Pill tone={queue.length ? "yellow" : "lime"} dot>
              {queue.length ? `${queue.length} open` : "All clear"}
            </Pill>
          </div>

          {queue.length === 0 && (
            <p className={styles.clear}>
              Nothing needs you right now. Enjoy it.
            </p>
          )}

          {groups.map((group) => {
            const items = queue.filter((i) => i.priority === group.priority);
            if (!items.length) return null;
            return (
              <div key={group.priority} className={styles.group}>
                <span className={styles.groupTitle}>{group.title}</span>
                <ul className={styles.queue}>
                  {items.map((item) => (
                    <li key={item.id}>
                      <Link href={item.href} className={styles.item}>
                        <span
                          className={`${styles.itemIcon} ${styles[`tone_${item.tone}`]}`}
                        >
                          <Icon name={item.icon} />
                        </span>
                        <span className={styles.itemText}>
                          <span className={styles.itemTitle}>{item.title}</span>
                          <p>{item.detail}</p>
                        </span>
                        <span className={styles.itemMeta}>
                          <span className={styles.when}>
                            {item.at > now
                              ? fmtShort(item.at)
                              : fmtAgo(item.at, now)}
                          </span>
                          <span className={styles.cta}>
                            {item.cta}
                            <Icon name='arrow' className={styles.ctaIcon} />
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>

        <div className={styles.side}>
          {/* ── The next billing run ── */}
          <section className={styles.run}>
            <div className={styles.runTop}>
              <span className={styles.runLabel}>Next billing run</span>
              <Link href='/admin/billing' className={styles.runLink}>
                Billing
                <Icon name='arrow' />
              </Link>
            </div>
            <div className={styles.runDate}>
              <span className={styles.runMonth}>{fmtMonth(run.date)}</span>
              <span className={styles.runDay}>1</span>
            </div>
            <span className={styles.runTotal}>{money(run.total)}</span>
            <ul className={styles.runLines}>
              {run.lines.map((line) => (
                <li
                  key={`${line.clientId}-${line.label}`}
                  className={styles.runLine}
                >
                  <span className={styles.runBiz}>
                    {line.business}
                    {line.retry && <span className={styles.retry}>Retry</span>}
                  </span>
                  <span className={styles.runAmount}>{money(line.amount)}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ── Pipeline ── */}
          <section className={styles.panel}>
            <div className={styles.titles}>
              <h2 className={styles.heading}>Pipeline</h2>
              <p>Where every client is right now.</p>
            </div>
            <div className={styles.bar} aria-hidden='true'>
              {pipeline
                .filter((p) => p.count > 0)
                .map((p) => (
                  <span
                    key={p.key}
                    className={`${styles.seg} ${p.tone}`}
                    style={{ flexGrow: p.count }}
                  />
                ))}
            </div>
            <ul className={styles.legend}>
              {pipeline.map((p) => (
                <li key={p.key} className={styles.legendItem}>
                  <span className={`${styles.swatch} ${p.tone}`} />
                  <span className={styles.legendLabel}>{p.label}</span>
                  <span className={styles.legendCount}>{p.count}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ── Waiting on clients ── */}
          {waiting.length > 0 && (
            <section className={styles.panel}>
              <div className={styles.titles}>
                <h2 className={styles.heading}>Waiting on clients</h2>
                <p>Their turn. A nudge keeps the build moving.</p>
              </div>
              <ul className={styles.waiting}>
                {waiting.map(({ client, waiting: list }) => (
                  <li key={client.id} className={styles.waitRow}>
                    <Link
                      href={`/admin/clients/${client.id}`}
                      className={styles.waitWho}
                    >
                      <Mark
                        business={client.business}
                        kind={clientKind(client)}
                        size='sm'
                      />
                      <span className={styles.waitText}>
                        <span className={styles.waitName}>
                          {client.business}
                        </span>
                        <p>
                          {list.length} thing{list.length === 1 ? "" : "s"}:{" "}
                          {list.slice(0, 2).join(", ")}
                          {list.length > 2 ? "…" : ""}
                        </p>
                      </span>
                    </Link>
                    <Nudge
                      name={client.contact.name}
                      email={client.contact.email}
                      what={list.join(", ")}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        {/* ── Revenue ── */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div className={styles.titles}>
              <h2 className={styles.heading}>Collected</h2>
              <p>The last six months: monthly fees, and setup fees on top.</p>
            </div>
            <div className={styles.keys}>
              <span className={styles.key}>
                <i className={styles.keyMonthly} />
                Monthly
              </span>
              <span className={styles.key}>
                <i className={styles.keySetup} />
                Setup
              </span>
            </div>
          </div>
          <ol className={styles.chart}>
            {revenue.map((r) => {
              const total = r.recurring + r.setup;
              return (
                <li
                  key={r.month}
                  className={styles.col}
                  aria-label={`${fmtMonth(r.month)}: ${money(total)}`}
                >
                  <span className={styles.colValue}>
                    {money(Math.round(total))}
                  </span>
                  <span className={styles.colBars}>
                    <span
                      className={styles.colSetup}
                      style={{ height: `${(r.setup / revenueTop) * 100}%` }}
                    />
                    <span
                      className={styles.colMonthly}
                      style={{ height: `${(r.recurring / revenueTop) * 100}%` }}
                    />
                  </span>
                  <span className={styles.colMonth}>{fmtMonth(r.month)}</span>
                </li>
              );
            })}
          </ol>
          <p className={styles.chartNote}>
            {fmtMonth(lastMonth.month)}:{" "}
            {money(Math.round(lastMonth.recurring + lastMonth.setup))}.{" "}
            {fmtMonth(thisMonth.month)} so far:{" "}
            {money(Math.round(thisMonth.recurring + thisMonth.setup))}.
          </p>
        </section>

        {/* ── Activity ── */}
        <section className={styles.panel}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>Lately</h2>
            <p>The latest from every client.</p>
          </div>
          <ol className={styles.feed}>
            {activity.map((item) => (
              <li key={`${item.client.id}-${item.id}`}>
                <Link
                  href={`/admin/clients/${item.client.id}`}
                  className={styles.feedItem}
                >
                  <Mark
                    business={item.client.business}
                    kind={clientKind(item.client)}
                    size='sm'
                  />
                  <span className={styles.feedText}>
                    <span className={styles.feedBiz}>
                      {item.client.business}
                    </span>
                    <p>{inThirdPerson(item.text)}</p>
                  </span>
                  <span className={styles.when}>{fmtAgo(item.at, now)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
