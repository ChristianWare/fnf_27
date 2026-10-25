// The report's "Search deep-dive", from the Semrush exports the studio
// added: what Google sends them and what it's worth, who those visitors
// are, the ride searches closest to the top, traffic over time, who's
// ahead, the searches they're missing and who links to them. Every number
// is Semrush's estimate, and the section says so.

import type { SemrushData } from "@/lib/audit/semrush/types";
import {
  monthName,
  monthShort,
  pagePath,
  placeOf,
  semrushInsights,
  usd,
} from "@/lib/audit/semrush/insights";
import styles from "./SemrushDeepDive.module.css";

const n = (v: number) => Math.round(v).toLocaleString("en-US");

export default function SemrushDeepDive({ data }: { data: SemrushData }) {
  const p = data.positions;
  const t = data.trend;
  const insights = semrushInsights(data);
  const db = p?.database ?? t?.database;
  const asOf = data.files
    .map((f) => f.uploadedAt)
    .sort()
    .at(-1);
  const pages = data.pages?.length ? data.pages : (p?.pages ?? []);
  const maxMonth = Math.max(1, ...(t?.months ?? []).map((m) => m.traffic));
  const mix = p
    ? [
        { key: "ride", label: "Looking for a ride", value: p.money.traffic, className: styles.mixRide },
        { key: "name", label: "Your name", value: p.branded.traffic, className: styles.mixName },
        { key: "other", label: "Everything else", value: p.other.traffic, className: styles.mixOther },
      ]
    : [];
  const mixTotal = mix.reduce((s, m) => s + m.value, 0);

  return (
    <section className={styles.container} aria-labelledby='deep-dive'>
      <header className={styles.head}>
        <span className={styles.label}>Search deep-dive</span>
        <h3 id='deep-dive' className={`${styles.title} h5`}>
          Where your Google traffic comes from, and where it could
        </h3>
        <p className={styles.note}>
          From Semrush
          {db ? `'s ${db === "US" ? "US" : db} database` : ""}
          {asOf ? `, ${monthName(asOf.slice(0, 7))}` : ""}. These are
          estimates: useful for comparing and for spotting trends, not an
          exact count of visits.
        </p>
      </header>

      {p && (
        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt>Visits a month from Google</dt>
            <dd>{n(p.traffic)}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Searches you show up for</dt>
            <dd>{n(p.keywords)}</dd>
          </div>
          <div className={styles.stat}>
            <dt>On page one</dt>
            <dd>{n(p.top10)}</dd>
          </div>
          <div className={`${styles.stat} ${styles.statDark}`}>
            <dt>What that traffic is worth</dt>
            <dd>
              {usd(p.value)}
              <span className={styles.per}>/mo</span>
            </dd>
          </div>
        </dl>
      )}

      {insights.length > 0 && (
        <ul className={styles.insights}>
          {insights.map((i) => (
            <li key={i.title} className={styles.insight}>
              <span className={styles.label}>{i.title}</span>
              <p>{i.text}</p>
            </li>
          ))}
        </ul>
      )}

      {p && mixTotal > 0 && (
        <div className={styles.card}>
          <h4 className={styles.cardTitle}>Who your visitors are</h4>
          <div className={styles.mixBar} role='img' aria-label={mix.map((m) => `${m.label}: ${n(m.value)} visits`).join(", ")}>
            {mix
              .filter((m) => m.value > 0)
              .map((m) => (
                <span
                  key={m.key}
                  className={`${styles.mixPart} ${m.className}`}
                  style={{ flexGrow: m.value }}
                  title={`${m.label}: ${n(m.value)} visits a month`}
                />
              ))}
          </div>
          <ul className={styles.legend}>
            {mix.map((m) => (
              <li key={m.key}>
                <span className={`${styles.swatch} ${m.className}`} aria-hidden='true' />
                {m.label}
                <span className={styles.legendValue}>
                  {n(m.value)} · {Math.round((m.value / mixTotal) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {p && p.close.length > 0 && (
        <div className={styles.card}>
          <h4 className={styles.cardTitle}>Ride searches closest to the top</h4>
          <p className={styles.cardText}>
            You&apos;re on page one or two for these, but below the top three.
            Moving them up is the fastest way to more bookings.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope='col'>Search</th>
                  <th scope='col'>You</th>
                  <th scope='col'>A month</th>
                  <th scope='col'>Ad price</th>
                  <th scope='col'>Page</th>
                </tr>
              </thead>
              <tbody>
                {p.close.map((k) => (
                  <tr key={k.keyword}>
                    <td>{k.keyword}</td>
                    <td>{placeOf(k)}</td>
                    <td>{n(k.volume)}</td>
                    <td>{k.cpc ? `$${k.cpc.toFixed(2)}` : "–"}</td>
                    <td className={styles.path}>{pagePath(k.url)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {t && t.months.length > 1 && (
        <div className={styles.card}>
          <h4 className={styles.cardTitle}>Visits from Google, the last {t.months.length} months</h4>
          <div className={styles.chart}>
            {t.months.map((m) => (
              <div
                key={m.month}
                className={styles.col}
                title={`${monthName(m.month)}: about ${n(m.traffic)} visits`}
              >
                <span
                  className={styles.bar}
                  style={{ height: `${Math.max(2, (m.traffic / maxMonth) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className={styles.axis} aria-hidden='true'>
            <span>{monthShort(t.months[0].month)} {t.months[0].month.slice(0, 4)}</span>
            <span>
              {monthShort(t.months.at(-1)!.month)} {t.months.at(-1)!.month.slice(0, 4)}
            </span>
          </div>
          <table className={styles.srOnly}>
            <caption>Visits from Google by month</caption>
            <tbody>
              {t.months.map((m) => (
                <tr key={m.month}>
                  <th scope='row'>{monthName(m.month)}</th>
                  <td>{n(m.traffic)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {p && p.top.length > 0 && (
        <div className={styles.card}>
          <h4 className={styles.cardTitle}>The searches that send you the most</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope='col'>Search</th>
                  <th scope='col'>You</th>
                  <th scope='col'>A month</th>
                  <th scope='col'>Visits</th>
                </tr>
              </thead>
              <tbody>
                {p.top.map((k) => (
                  <tr key={k.keyword}>
                    <td>{k.keyword}</td>
                    <td>#{k.position}</td>
                    <td>{n(k.volume)}</td>
                    <td>{n(k.traffic)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pages.length > 0 && (
        <div className={styles.card}>
          <h4 className={styles.cardTitle}>Your pages Google sends people to</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope='col'>Page</th>
                  <th scope='col'>Searches</th>
                  <th scope='col'>Visits</th>
                </tr>
              </thead>
              <tbody>
                {pages.slice(0, 8).map((pg) => (
                  <tr key={pg.url}>
                    <td className={styles.path}>{pagePath(pg.url)}</td>
                    <td>{n(pg.keywords)}</td>
                    <td>{n(pg.traffic)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.competitors && data.competitors.length > 0 && (
        <div className={styles.card}>
          <h4 className={styles.cardTitle}>Who you&apos;re up against on Google</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope='col'>Site</th>
                  <th scope='col'>Shared searches</th>
                  <th scope='col'>Their searches</th>
                  <th scope='col'>Their visits</th>
                  <th scope='col'>Worth</th>
                </tr>
              </thead>
              <tbody>
                {p && (
                  <tr className={styles.you}>
                    <td>You</td>
                    <td>–</td>
                    <td>{n(p.keywords)}</td>
                    <td>{n(p.traffic)}</td>
                    <td>{usd(p.value)}</td>
                  </tr>
                )}
                {data.competitors.slice(0, 8).map((c) => (
                  <tr key={c.domain}>
                    <td>{c.domain}</td>
                    <td>{n(c.common)}</td>
                    <td>{n(c.keywords)}</td>
                    <td>{n(c.traffic)}</td>
                    <td>{usd(c.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.gap && data.gap.missing.length > 0 && (
        <div className={styles.card}>
          <h4 className={styles.cardTitle}>Searches they rank for and you don&apos;t</h4>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope='col'>Search</th>
                  <th scope='col'>A month</th>
                  <th scope='col'>Who&apos;s there</th>
                </tr>
              </thead>
              <tbody>
                {data.gap.missing.map((k) => (
                  <tr key={k.keyword}>
                    <td>{k.keyword}</td>
                    <td>{n(k.volume)}</td>
                    <td>
                      {k.domain} (#{k.position})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.links && (
        <div className={styles.card}>
          <h4 className={styles.cardTitle}>Sites that link to you</h4>
          <dl className={styles.linkStats}>
            <div>
              <dt>Linking sites</dt>
              <dd>{n(data.links.domains)}</dd>
            </div>
            {data.links.follow !== undefined && (
              <div>
                <dt>Count toward rankings</dt>
                <dd>{data.links.follow}%</dd>
              </div>
            )}
            <div>
              <dt>Look like spam</dt>
              <dd>{n(data.links.spamCount)}</dd>
            </div>
          </dl>
          {data.links.top.length > 0 && (
            <p className={styles.cardText}>
              The strongest: {data.links.top.slice(0, 5).map((d) => d.domain).join(", ")}.
            </p>
          )}
          {data.links.spam.length > 0 && (
            <ul className={styles.spam}>
              {data.links.spam.slice(0, 6).map((s) => (
                <li key={s.domain}>
                  <span>{s.domain}</span>
                  <span className={styles.spamWhy}>{s.why}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
