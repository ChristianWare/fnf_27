import type { Metadata } from "next";
import Link from "next/link";
import Stats from "@/components/Admin/Stats/Stats";
import CardLink from "@/components/Admin/Billing/CardLink";
import Invoices from "@/components/Admin/Billing/Invoices";
import t from "@/components/Admin/Today/Today.module.css";
import b from "@/components/Admin/Billing/Billing.module.css";
import Icon from "@/components/Dashboard/icons";
import { ButtonLink, PageHead } from "@/components/Dashboard/ui/ui";
import {
  allInvoices,
  billingAttention,
  clientKind,
  clientMrr,
  getAdmin,
  nextBillingRun,
  planMix,
  revenueByMonth,
  studioStats,
} from "@/lib/admin";
import {
  fmtMonth,
  fmtMonthLong,
  fmtShort,
  money,
} from "@/lib/dashboard/format";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const { clients, now } = await getAdmin();
  const stats = studioStats(clients);
  const run = nextBillingRun(clients, now);
  const year = revenueByMonth(clients, now, 12);
  const flags = billingAttention(clients, now);
  const mix = planMix(clients);
  const kinds = new Map(clients.map((c) => [c.id, clientKind(c)]));
  const invoices = allInvoices(clients).map((i) => ({
    ...i,
    kind: kinds.get(i.clientId)!,
  }));

  const thisMonth = year.at(-1)!;
  const lastMonth = year.at(-2)!;
  const collected = (m: (typeof year)[number]) =>
    Math.round(m.recurring + m.setup);
  const top = Math.max(...year.map(collected), 1);
  const yearMonthly = year.reduce((sum, m) => sum + m.recurring, 0);
  const yearSetup = year.reduce((sum, m) => sum + m.setup, 0);
  const due = invoices.filter((i) => i.status === "DUE");
  const paying = clients.filter((c) => clientMrr(c) > 0).length;
  const mixTotal = mix.reduce((sum, line) => sum + line.mrr, 0);

  return (
    <>
      <PageHead
        crumb='Money'
        title='Billing'
        text='Stripe charges every client on the 1st, midnight Arizona time. The $500 setup fee is the only thing paid up front.'
      >
        <ButtonLink
          href='/admin/settings'
          variant='light'
          small
          icon='settings'
        >
          How billing works
        </ButtonLink>
      </PageHead>

      <Stats
        items={[
          {
            label: "Monthly revenue",
            value: money(stats.mrr),
            note: `From ${paying} paying client${paying === 1 ? "" : "s"}`,
            tone: "black",
          },
          {
            label: `Collected in ${fmtMonth(thisMonth.month)}`,
            value: money(collected(thisMonth)),
            note: `${money(collected(lastMonth))} in ${fmtMonthLong(lastMonth.month).split(" ")[0]}`,
          },
          {
            label: `Next run, ${fmtShort(run.date)}`,
            value: money(run.total),
            note: `${run.lines.length} charge${run.lines.length === 1 ? "" : "s"} on the 1st`,
            tone: "lime",
          },
          {
            label: "Failed payments",
            value: String(stats.pastDue),
            note: due.length
              ? `${money(due.reduce((sum, i) => sum + i.amount, 0))} due`
              : "Everyone's paid up",
            tone: stats.pastDue ? "red" : undefined,
          },
        ]}
      />

      <div className={t.grid}>
        {/* ── Needs a look ── */}
        <section className={t.panel}>
          <div className={t.panelHead}>
            <div className={t.titles}>
              <h2 className={t.heading}>Needs a look</h2>
              <p>
                Failed payments, unpaid setup fees, cards running out and trials
                ending.
              </p>
            </div>
          </div>
          {flags.length ? (
            <ul className={b.flags}>
              {flags.map((flag) => {
                const client = clients.find((c) => c.id === flag.clientId)!;
                return (
                  <li key={flag.id} className={b.flag}>
                    <span className={`${b.flagIcon} ${t[`tone_${flag.tone}`]}`}>
                      <Icon name={flag.icon} />
                    </span>
                    <span className={b.flagText}>
                      <span className={b.flagBiz}>{flag.business}</span>
                      <span className={b.flagTitle}>{flag.title}</span>
                      <p>{flag.detail}</p>
                    </span>
                    <span className={b.flagActions}>
                      {flag.cardLink && (
                        <CardLink
                          clientId={flag.clientId}
                          firstName={client.contact.name.split(" ")[0]}
                        />
                      )}
                      <ButtonLink href={flag.href} small icon='arrow'>
                        Open
                      </ButtonLink>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={b.allClear}>
              <span className={b.allClearIcon}>
                <Icon name='check' />
              </span>
              <p>Nothing to chase. Every card works and every bill is paid.</p>
            </div>
          )}
        </section>

        {/* ── The next billing run ── */}
        <section className={t.run}>
          <div className={t.runTop}>
            <span className={t.runLabel}>Next billing run</span>
            <span className={t.runLabel}>Midnight, Arizona</span>
          </div>
          <div className={t.runDate}>
            <span className={t.runMonth}>{fmtMonth(run.date)}</span>
            <span className={t.runDay}>1</span>
          </div>
          <span className={t.runTotal}>{money(run.total)}</span>
          <ul className={t.runLines}>
            {run.lines.map((line) => (
              <li key={`${line.clientId}-${line.label}`} className={t.runLine}>
                <Link
                  href={`/admin/clients/${line.clientId}?tab=billing`}
                  className={t.runBiz}
                >
                  {line.business}
                  {line.retry && <span className={t.retry}>Retry</span>}
                </Link>
                <span className={t.runAmount}>{money(line.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* ── A year of revenue ── */}
      <section className={t.panel}>
        <div className={t.panelHead}>
          <div className={t.titles}>
            <h2 className={t.heading}>Collected</h2>
            <p>The last twelve months: monthly fees, and setup fees on top.</p>
          </div>
          <div className={t.keys}>
            <span className={t.key}>
              <i className={t.keyMonthly} />
              Monthly
            </span>
            <span className={t.key}>
              <i className={t.keySetup} />
              Setup
            </span>
          </div>
        </div>
        <ol className={`${t.chart} ${b.chart12}`}>
          {year.map((m) => (
            <li
              key={m.month}
              className={t.col}
              aria-label={`${fmtMonthLong(m.month)}: ${money(collected(m))}`}
            >
              <span className={t.colValue}>{money(collected(m))}</span>
              <span className={t.colBars}>
                <span
                  className={t.colSetup}
                  style={{ height: `${(m.setup / top) * 100}%` }}
                />
                <span
                  className={t.colMonthly}
                  style={{ height: `${(m.recurring / top) * 100}%` }}
                />
              </span>
              <span className={t.colMonth}>{fmtMonth(m.month)}</span>
            </li>
          ))}
        </ol>
        <div className={b.yearNote}>
          <p>
            Twelve months:{" "}
            <strong>{money(Math.round(yearMonthly + yearSetup))}</strong>
          </p>
          <p>
            Monthly fees: <strong>{money(Math.round(yearMonthly))}</strong>
          </p>
          <p>
            Setup fees: <strong>{money(Math.round(yearSetup))}</strong>
          </p>
        </div>
      </section>

      {/* ── Where it comes from ── */}
      <section className={t.panel}>
        <div className={t.panelHead}>
          <div className={t.titles}>
            <h2 className={t.heading}>Where it comes from</h2>
            <p>
              Monthly revenue by plan. The Full Platform includes the Leads
              Tool.
            </p>
          </div>
          <span className={b.mixTotal}>
            <span className={b.mixAmount}>{money(mixTotal)}</span>
            <span className={b.mixMeta}>a month</span>
          </span>
        </div>
        <div className={b.mixBar} aria-hidden='true'>
          {mix
            .filter((line) => line.mrr > 0)
            .map((line) => (
              <span
                key={line.key}
                className={`${b.mixSeg} ${b[`mix_${line.key}`]}`}
                style={{ flexGrow: line.mrr }}
              />
            ))}
        </div>
        <ul className={b.mixList}>
          {mix.map((line) => (
            <li key={line.key} className={b.mixRow}>
              <span className={`${b.mixSwatch} ${b[`mix_${line.key}`]}`} />
              <span className={b.mixName}>
                {line.label}
                <span className={b.mixMeta}>
                  {line.clients} client{line.clients === 1 ? "" : "s"}
                  {line.clients
                    ? ` · ${money(Math.round(line.mrr / line.clients))} average`
                    : ""}
                </span>
              </span>
              <span className={b.mixValue}>
                {money(line.mrr)}
                <span className={b.mixMeta}>
                  {mixTotal ? Math.round((line.mrr / mixTotal) * 100) : 0}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Invoices rows={invoices} />
    </>
  );
}
