"use client";

// The Leads Tool's engine room: each market's runs (and "Run now"), the
// calendars it reads, who has the tool switched on, and what it costs.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Dashboard/icons";
import { Pill, ui } from "@/components/Dashboard/ui/ui";
import { useAction } from "@/components/Dashboard/useAction";
import {
  addMarket,
  addSource,
  removeSource,
  runMarketNow,
  setClientLeads,
  setMarketPaused,
  setSourceEnabled,
  testSource,
  type SourceTest,
} from "@/app/admin/leads-actions";
import type {
  AdminMarket,
  AdminRun,
  AdminSource,
  LeadsAdmin,
} from "@/lib/leads/admin";
import { EVENT_TYPES, SOURCES } from "@/lib/leads/catalog";
import { CALENDAR_SOURCES, EVENT_KINDS } from "@/lib/leads/kinds";
import type { CalendarSource, EventType } from "@/lib/leads/types";
import {
  dayKey,
  fmtAgo,
  fmtDate,
  fmtShort,
  fmtTime,
  money,
} from "@/lib/dashboard/format";
import styles from "./LeadsToolAdmin.module.css";

const STEPS = 11;
/** Rounds of "Run now" this page carries on by itself, per market. */
const MAX_ROUNDS = 8;

/** "just now", "3 hours ago", "yesterday", or "on Oct 2", for mid-sentence. */
const ago = (value: string, now: string) => {
  const text = fmtAgo(value, now);
  return /^[A-Z][a-z]{2} \d/.test(text)
    ? `on ${text}`
    : text.charAt(0).toLowerCase() + text.slice(1);
};

const COUNT_NAMES: [string, string][] = [
  ["placesNew", "new accounts"],
  ["details", "details"],
  ["researched", "websites read"],
  ["eventsNew", "new events"],
  ["eventsUpdated", "events updated"],
  ["eventsExpired", "past events cleared"],
  ["news", "in the news"],
];

export default function LeadsToolAdmin({ data }: { data: LeadsAdmin }) {
  const router = useRouter();

  // A "Run now" takes a few rounds of about four minutes to load a market
  // the first time. While this page is open it starts the next round
  // itself; closed, the run finishes tonight.
  const today = dayKey(data.now);
  const resting = data.markets
    .filter((m) => {
      const latest = m.runs[0];
      return (
        !m.paused &&
        latest?.status === "RUNNING" &&
        latest.trigger === "MANUAL" &&
        !latest.working &&
        latest.day === today
      );
    })
    .map((m) => m.id)
    .join(" ");
  const running =
    Boolean(resting) ||
    data.markets.some((m) =>
      m.runs.some((r) => r.status === "RUNNING" && r.working),
    );

  // While a run is going, keep the numbers fresh.
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(timer);
  }, [running, router]);

  const rounds = useRef(new Map<string, number>());
  useEffect(() => {
    if (!resting) return;
    for (const id of resting.split(" ")) {
      const done = rounds.current.get(id) ?? 0;
      if (done >= MAX_ROUNDS) continue;
      rounds.current.set(id, done + 1);
      runMarketNow(id).catch(() => undefined);
    }
    const later = setTimeout(() => router.refresh(), 3_000);
    return () => clearTimeout(later);
  }, [resting, router]);

  const clientsOn = data.clients.filter(
    (c) => c.access !== "NONE" && (c.enabled || c.access === "STUDIO"),
  ).length;

  return (
    <div className={styles.page}>
      <dl className={styles.tiles}>
        <div className={styles.tile}>
          <dt>This month, roughly</dt>
          <dd>{money(data.total)}</dd>
          <dd className={styles.tileNote}>List prices, before free tiers</dd>
        </div>
        <div className={styles.tile}>
          <dt>Markets running</dt>
          <dd>
            {data.markets.filter((m) => m.active && !m.paused).length}
            <span> of {data.markets.length}</span>
          </dd>
          <dd className={styles.tileNote}>Only markets someone uses</dd>
        </div>
        <div className={styles.tile}>
          <dt>Switched on</dt>
          <dd>{clientsOn}</dd>
          <dd className={styles.tileNote}>Including the studio</dd>
        </div>
        <div className={styles.tile}>
          <dt>In the markets</dt>
          <dd>
            {data.markets
              .reduce((n, m) => n + m.accounts, 0)
              .toLocaleString("en-US")}
            <span> accounts</span>
          </dd>
          <dd className={styles.tileNote}>
            {data.markets
              .reduce((n, m) => n + m.events, 0)
              .toLocaleString("en-US")}{" "}
            upcoming events
          </dd>
        </div>
      </dl>

      {data.markets.map((market) => (
        <Market key={market.id} market={market} now={data.now} />
      ))}

      <AddMarket />

      <Clients data={data} />

      <div className={styles.split}>
        <section className={styles.panel}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>This month, by service</h2>
            <p>
              Since {fmtDate(data.month)}. Estimates at list price:
              Google&apos;s monthly free credit, your SerpApi plan and your
              Apollo credits all bring the real numbers down.
            </p>
          </div>
          {data.apis.length ? (
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th scope='col'>Service</th>
                    <th scope='col'>Calls</th>
                    <th scope='col'>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.apis.map((a) => (
                    <tr key={a.api}>
                      <td>{a.name}</td>
                      <td>{a.calls.toLocaleString("en-US")}</td>
                      <td>{money(a.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.quiet}>Nothing used yet this month.</p>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>Services</h2>
            <p>
              Set in Vercel&apos;s environment variables. Names only, never
              values.
            </p>
          </div>
          <ul className={styles.services}>
            {data.services.map((s) => (
              <li key={s.env} className={styles.service}>
                <span className={styles.serviceText}>
                  <span className={styles.serviceName}>{s.name}</span>
                  <span className={styles.meta}>{s.env}</span>
                  <p>{s.note}</p>
                </span>
                <Pill tone={s.ready ? "lime" : "red"} dot>
                  {s.ready ? "Set" : "Missing"}
                </Pill>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ── One market ── */

function Market({ market, now }: { market: AdminMarket; now: string }) {
  const { run, pending } = useAction();
  const router = useRouter();
  const [paused, setPaused] = useState(market.paused);
  const latest = market.runs[0];
  const working = latest?.status === "RUNNING" && latest.working;
  // Part done: the round ended before the run did.
  const partDone = latest?.status === "RUNNING" && !latest.working;
  const state = paused
    ? { tone: "gray" as const, text: "Paused" }
    : working
      ? { tone: "yellow" as const, text: "Running" }
      : partDone
        ? { tone: "yellow" as const, text: "Part done" }
        : market.active
          ? { tone: "lime" as const, text: "Runs nightly" }
          : { tone: "gray" as const, text: "Nobody using it" };

  return (
    <section className={styles.panel} id={`market-${market.id}`}>
      <div className={styles.panelHead}>
        <div className={styles.titles}>
          <span className={styles.meta}>
            {market.city}, {market.state} · {market.radius} miles
          </span>
          <h2 className={styles.heading}>{market.name}</h2>
          <p>
            {market.firstLoadedAt
              ? `First loaded ${fmtDate(market.firstLoadedAt)}. Last full run ${market.lastRunAt ? ago(market.lastRunAt, now) : "not yet"}.`
              : latest?.status === "RUNNING"
                ? `Loading for the first time: step ${Math.min(latest.stepsDone + 1, STEPS)} of ${STEPS}. It works in rounds of a few minutes and carries on while this page is open; close it and it finishes tonight.`
                : "Not loaded yet: its clients see “on the way” until the first run finishes. Run it now, or it runs tonight once someone uses it."}
          </p>
        </div>
        <div className={styles.headActions}>
          <Pill tone={state.tone} dot>
            {state.text}
          </Pill>
          <button
            type='button'
            className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
            disabled={pending || working}
            onClick={() =>
              run(
                () => runMarketNow(market.id),
                () => {
                  setTimeout(() => router.refresh(), 2_000);
                  return {
                    message: `${market.name} is running`,
                    detail:
                      "It works in rounds of a few minutes and carries on while this page is open. The numbers update as it goes.",
                  };
                },
              )
            }
          >
            {working ? "Running…" : partDone ? "Keep going" : "Run now"}
            <Icon name='zap' className={ui.btnIcon} />
          </button>
        </div>
      </div>

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>Accounts</dt>
          <dd>{market.accounts.toLocaleString("en-US")}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Upcoming events</dt>
          <dd>{market.events.toLocaleString("en-US")}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Nightly runs this month</dt>
          <dd>{money(market.monthCost)}</dd>
        </div>
        <div className={styles.fact}>
          <dt>Using it</dt>
          <dd>
            {market.clients.length ? market.clients.join(", ") : "Nobody yet"}
          </dd>
        </div>
      </dl>

      <div className={styles.switchRow}>
        <span className={styles.serviceText}>
          <span className={styles.serviceName}>Nightly runs</span>
          <p>Pause to stop its runs, even with clients in it.</p>
        </span>
        <button
          type='button'
          role='switch'
          aria-checked={!paused}
          aria-label={`Nightly runs for ${market.name}`}
          className={ui.switch}
          disabled={pending}
          onClick={() => {
            const next = !paused;
            setPaused(next);
            run(
              () => setMarketPaused(market.id, next),
              () => ({
                message: next
                  ? `${market.name} paused`
                  : `${market.name} runs nightly again`,
                tone: "info",
              }),
              () => setPaused(!next),
            );
          }}
        />
      </div>

      <Runs runs={market.runs} now={now} />

      <Sources market={market} now={now} />
    </section>
  );
}

function Runs({ runs, now }: { runs: AdminRun[]; now: string }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!runs.length)
    return <p className={styles.quiet}>No runs in the last two weeks.</p>;
  return (
    <div className={styles.block}>
      <span className={styles.blockTitle}>Recent runs</span>
      <ul className={styles.runs}>
        {runs.map((r) => {
          const found = COUNT_NAMES.filter(([key]) => r.counts[key])
            .map(
              ([key, label]) =>
                `${r.counts[key].toLocaleString("en-US")} ${label}`,
            )
            .join(" · ");
          return (
            <li key={r.id} className={styles.run}>
              <div className={styles.runTop}>
                <span className={styles.runWhen}>
                  {fmtShort(r.startedAt)}, {fmtTime(r.startedAt)}
                  <span className={styles.meta}>
                    {r.trigger === "MANUAL" ? "Run now" : "Nightly"}
                  </span>
                </span>
                <Pill
                  tone={
                    r.status === "DONE"
                      ? "lime"
                      : r.status === "RUNNING"
                        ? "yellow"
                        : "red"
                  }
                  dot
                >
                  {r.status === "DONE"
                    ? r.finishedAt
                      ? `Done ${ago(r.finishedAt, now)}`
                      : "Done"
                    : r.status === "RUNNING"
                      ? `Step ${Math.min(r.stepsDone + 1, STEPS)} of ${STEPS}`
                      : "Stopped"}
                </Pill>
              </div>
              <p className={styles.runFound}>{found || "Nothing new found."}</p>
              {r.errors.length > 0 && (
                <>
                  <button
                    type='button'
                    className={styles.linkButton}
                    onClick={() => setOpen(open === r.id ? null : r.id)}
                  >
                    {open === r.id
                      ? "Hide problems"
                      : `${r.errors.length} ${r.errors.length === 1 ? "problem" : "problems"}`}
                  </button>
                  {open === r.id && (
                    <ul className={styles.errors}>
                      {r.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── A market's calendars ── */

const KIND_LABEL = (k: CalendarSource) => SOURCES[k].label;

function TestResult({ result }: { result: SourceTest }) {
  return (
    <div className={styles.test}>
      <p>
        <strong>{result.format}.</strong> {result.found} upcoming{" "}
        {result.found === 1 ? "event" : "events"}, {result.kept} we&apos;d keep
        (the rest aren&apos;t a kind we pitch).
      </p>
      {result.sample.length > 0 && (
        <ul className={styles.sample}>
          {result.sample.map((e, i) => (
            <li key={i}>
              <span className={styles.meta}>{fmtShort(e.date)}</span>
              <span>
                {e.name}
                {e.venue ? `, ${e.venue}` : ""}
              </span>
              <span className={styles.meta}>
                {e.type ? EVENT_TYPES[e.type].short : "Skipped"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Sources({ market, now }: { market: AdminMarket; now: string }) {
  const { run, pending } = useAction();
  const [list, setList] = useState(market.sources);
  const [from, setFrom] = useState(market.sources);
  const [tests, setTests] = useState<Record<string, SourceTest>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    label: "",
    url: "",
    source: "TOURISM" as CalendarSource,
    eventType: "" as EventType | "",
  });

  if (from !== market.sources) {
    setFrom(market.sources);
    setList(market.sources);
  }

  const test = (
    key: string,
    input: Pick<typeof draft, "url" | "source" | "eventType">,
  ) => {
    setTesting(key);
    run(
      () => testSource(input),
      (result) => {
        setTesting(null);
        if (result) setTests((t) => ({ ...t, [key]: result }));
      },
      () => setTesting(null),
    );
  };

  return (
    <div className={styles.block}>
      <span className={styles.blockTitle}>Calendars it reads</span>
      <p className={styles.blockText}>
        iCal files, RSS feeds or event pages (with schema.org event data, or
        read by the AI). Checked every night, next to Ticketmaster, Eventbrite
        and Google Events.
      </p>
      {list.length ? (
        <ul className={styles.sources}>
          {list.map((src: AdminSource) => (
            <li key={src.id} className={styles.source}>
              <div className={styles.sourceTop}>
                <span className={styles.serviceText}>
                  <span className={styles.serviceName}>{src.label}</span>
                  <a
                    href={src.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className={styles.url}
                  >
                    {src.url.replace(/^https?:\/\//, "")}
                  </a>
                  <span className={styles.meta}>
                    {KIND_LABEL(src.source)}
                    {src.eventType
                      ? ` · ${EVENT_TYPES[src.eventType].label}`
                      : ""}
                    {src.lastRunAt
                      ? src.lastError
                        ? ` · failed ${ago(src.lastRunAt, now)}`
                        : ` · ${src.lastCount ?? 0} found ${ago(src.lastRunAt, now)}`
                      : " · not run yet"}
                  </span>
                  {src.lastError && (
                    <p className={styles.error}>{src.lastError}</p>
                  )}
                </span>
                <div className={styles.sourceActions}>
                  <button
                    type='button'
                    className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                    disabled={pending}
                    onClick={() =>
                      test(src.id, {
                        url: src.url,
                        source: src.source,
                        eventType: src.eventType ?? "",
                      })
                    }
                  >
                    {testing === src.id ? "Testing…" : "Test"}
                  </button>
                  <button
                    type='button'
                    role='switch'
                    aria-checked={src.enabled}
                    aria-label={`Read ${src.label} nightly`}
                    className={ui.switch}
                    disabled={pending}
                    onClick={() => {
                      const next = !src.enabled;
                      setList((l) =>
                        l.map((x) =>
                          x.id === src.id ? { ...x, enabled: next } : x,
                        ),
                      );
                      run(
                        () => setSourceEnabled(src.id, next),
                        () => ({
                          message: next
                            ? `${src.label} is on`
                            : `${src.label} is off`,
                          tone: "info",
                        }),
                        () =>
                          setList((l) =>
                            l.map((x) =>
                              x.id === src.id ? { ...x, enabled: !next } : x,
                            ),
                          ),
                      );
                    }}
                  />
                  <button
                    type='button'
                    className={styles.iconButton}
                    aria-label={
                      removing === src.id
                        ? `Click again to remove ${src.label}`
                        : `Remove ${src.label}`
                    }
                    title={
                      removing === src.id ? "Click again to remove" : "Remove"
                    }
                    onBlur={() => setRemoving(null)}
                    onClick={() => {
                      if (removing !== src.id) {
                        setRemoving(src.id);
                        return;
                      }
                      run(
                        () => removeSource(src.id),
                        () => {
                          setList((l) => l.filter((x) => x.id !== src.id));
                          return {
                            message: `Removed ${src.label}`,
                            tone: "info",
                          };
                        },
                      );
                    }}
                  >
                    <Icon name='trash' />
                    {removing === src.id && <span>Remove?</span>}
                  </button>
                </div>
              </div>
              {tests[src.id] && <TestResult result={tests[src.id]} />}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.quiet}>No calendars yet.</p>
      )}

      <form
        className={styles.addSource}
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => addSource(market.id, draft),
            (data) => {
              if (data?.id)
                setList((l) => [
                  ...l,
                  {
                    id: data.id,
                    label: draft.label,
                    url: draft.url,
                    source: draft.source,
                    eventType: draft.eventType || undefined,
                    enabled: true,
                  },
                ]);
              setDraft({
                label: "",
                url: "",
                source: draft.source,
                eventType: "",
              });
              setTests((t) => {
                const next = { ...t };
                delete next.draft;
                return next;
              });
              return {
                message: `Added ${draft.label}`,
                detail: "It's read with tonight's run.",
              };
            },
          );
        }}
      >
        <span className={styles.blockTitle}>Add a calendar</span>
        <div className={styles.formGrid}>
          <label className={ui.field}>
            <span className={ui.label}>Name</span>
            <input
              className={ui.input}
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder='Tempe Chamber'
            />
          </label>
          <label className={`${ui.field} ${styles.wide}`}>
            <span className={ui.label}>Address</span>
            <input
              className={ui.input}
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              placeholder='https://… (an .ics file, an RSS feed, or an events page)'
              inputMode='url'
            />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Kind</span>
            <select
              className={ui.select}
              value={draft.source}
              onChange={(e) =>
                setDraft({ ...draft, source: e.target.value as CalendarSource })
              }
            >
              {CALENDAR_SOURCES.map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL(k)}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Events are</span>
            <select
              className={ui.select}
              value={draft.eventType}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  eventType: e.target.value as EventType | "",
                })
              }
            >
              <option value=''>Worked out from each title</option>
              {EVENT_KINDS.map((t) => (
                <option key={t} value={t}>
                  {EVENT_TYPES[t].label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.formActions}>
          <button
            type='button'
            className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
            disabled={pending || !draft.url.trim()}
            onClick={() => test("draft", draft)}
          >
            {testing === "draft" ? "Testing…" : "Test this address"}
          </button>
          <button
            type='submit'
            className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
            disabled={pending || !draft.url.trim() || !draft.label.trim()}
          >
            Add calendar
            <Icon name='plus' className={ui.btnIcon} />
          </button>
        </div>
        {tests.draft && <TestResult result={tests.draft} />}
      </form>
    </div>
  );
}

function AddMarket() {
  const { run, pending } = useAction();
  const router = useRouter();
  const [city, setCity] = useState("");
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div className={styles.titles}>
          <h2 className={styles.heading}>Add a market</h2>
          <p>
            Markets are added on their own when someone sets a base far from the
            others. Add one ahead of time to load it before they sign up.
          </p>
        </div>
      </div>
      <form
        className={styles.inline}
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => addMarket(city),
            () => {
              setCity("");
              router.refresh();
              return {
                message: "Market added",
                detail: "Run it now, or add its calendars first.",
              };
            },
          );
        }}
      >
        <input
          className={ui.input}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder='City, State (e.g. Dallas, TX)'
          aria-label='City'
        />
        <button
          type='submit'
          className={`${ui.btn} ${ui.btn_black}`}
          disabled={pending || !city.trim()}
        >
          Add market
        </button>
      </form>
    </section>
  );
}

/* ── Who has it ── */

function Clients({ data }: { data: LeadsAdmin }) {
  const { run, pending } = useAction();
  const [on, setOn] = useState<Record<string, boolean>>(
    Object.fromEntries(data.clients.map((c) => [c.id, c.enabled])),
  );
  return (
    <section className={styles.panel}>
      <div className={styles.titles}>
        <h2 className={styles.heading}>Who has it</h2>
        <p>
          Switched off, a client sees “being set up” instead of the tool. Turn
          Full Platform clients on once their market&apos;s first run is in.
          Costs: what their own saves used (contacts, scripts, drive times),
          plus an even share of their market&apos;s nightly runs.
        </p>
      </div>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th scope='col'>Business</th>
              <th scope='col'>Plan</th>
              <th scope='col'>Market</th>
              <th scope='col'>Saved</th>
              <th scope='col'>This month</th>
              <th scope='col'>Cost</th>
              <th scope='col'>On</th>
            </tr>
          </thead>
          <tbody>
            {data.clients.map((c) => (
              <tr key={c.id}>
                <td>{c.business}</td>
                <td>
                  <span className={styles.meta}>{c.status}</span>
                </td>
                <td>{c.market ?? "Not set up"}</td>
                <td>{c.saved}</td>
                <td>{c.savesThisMonth} saved</td>
                <td>
                  {money(Math.round((c.direct + c.marketShare) * 100) / 100)}
                </td>
                <td>
                  {c.access === "STUDIO" ? (
                    <span className={styles.meta}>Always</span>
                  ) : (
                    <button
                      type='button'
                      role='switch'
                      aria-checked={on[c.id]}
                      aria-label={`Leads Tool for ${c.business}`}
                      className={ui.switch}
                      disabled={pending || c.access === "NONE"}
                      onClick={() => {
                        const next = !on[c.id];
                        setOn((v) => ({ ...v, [c.id]: next }));
                        run(
                          () => setClientLeads(c.id, next),
                          () => ({
                            message: next
                              ? `${c.business} can use the Leads Tool`
                              : `${c.business}'s Leads Tool is off`,
                            tone: next ? "success" : "info",
                          }),
                          () => setOn((v) => ({ ...v, [c.id]: !next })),
                        );
                      }}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
