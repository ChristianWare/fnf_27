"use client";

// Everything in the client's market, in two lists: accounts (the
// businesses that book again and again) and events (dates with an
// organizer to pitch). Best first, with the reasons in plain words.
// Opening one costs nothing; saving one finds the contact and writes the
// scripts.

import Link from "next/link";
import { useMemo, useState } from "react";
import Icon from "../icons";
import { PageHead, ui } from "../ui/ui";
import { useLeads } from "./Store";
import { kindOf, Reasons, SaveButton, ScoreBadge, Thumb } from "./bits";
import NotReady from "./NotReady";
import styles from "./Leads.module.css";
import { daysUntil, eventDates } from "@/lib/leads/advice";
import { CATEGORIES, EVENT_TYPES, SOURCES } from "@/lib/leads/catalog";
import { scoreOf } from "@/lib/leads/score";
import type {
  AccountCategory,
  EventType,
  Located,
  SourceId,
} from "@/lib/leads/types";

type Tab = "accounts" | "events";

const RADII = [10, 25, 50, 75];
const WINDOWS = [
  { days: 14, label: "Next 2 weeks" },
  { days: 30, label: "Next 30 days" },
  { days: 90, label: "Next 90 days" },
];

export default function Find({ initialTab }: { initialTab: Tab }) {
  const {
    now,
    settings,
    accounts,
    events,
    href,
    market,
    where,
    access,
    trialEndsAt,
    newSince,
  } = useLeads();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const [radius, setRadius] = useState(settings.radius);
  const [category, setCategory] = useState<AccountCategory | "ALL">("ALL");
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [span, setSpan] = useState(90);
  const [type, setType] = useState<EventType | "ALL">("ALL");
  const [source, setSource] = useState<SourceId | "ALL">("ALL");
  const [eventOrder, setEventOrder] = useState<"best" | "soon">("best");

  const q = query.trim().toLowerCase();
  const matches = (name: string, ...more: string[]) =>
    !q || [name, ...more].some((s) => s.toLowerCase().includes(q));

  const nearAccounts = useMemo(
    () =>
      accounts.filter(
        (a) => a.miles <= radius && settings.categories.includes(a.category),
      ),
    [accounts, radius, settings.categories],
  );
  const nearEvents = useMemo(
    () =>
      events.filter(
        (e) => e.miles <= radius && settings.eventTypes.includes(e.type),
      ),
    [events, radius, settings.eventTypes],
  );

  // Every lead's score, once.
  const scores = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of [...nearAccounts, ...nearEvents] as Located[])
      map.set(t.id, scoreOf(t, now, newSince).score);
    return map;
  }, [nearAccounts, nearEvents, now, newSince]);
  const scoreFor = (id: string) => scores.get(id) ?? 0;

  const shownAccounts = nearAccounts
    .filter((a) => category === "ALL" || a.category === category)
    .filter((a) => !open || a.carService === "NONE")
    .filter((a) => !ready || a.contact?.verified)
    .filter((a) => matches(a.name, a.city, CATEGORIES[a.category].label))
    .sort((a, b) => scoreFor(b.id) - scoreFor(a.id));

  const shownEvents = nearEvents
    .filter((e) => daysUntil(e.date, now) <= span)
    .filter((e) => type === "ALL" || e.type === type)
    .filter((e) => source === "ALL" || e.source === source)
    .filter((e) => matches(e.name, e.venue, e.organizer, e.city))
    .sort((a, b) =>
      eventOrder === "best"
        ? scoreFor(b.id) - scoreFor(a.id) || a.date.localeCompare(b.date)
        : a.date.localeCompare(b.date),
    );

  const categoryCounts = (Object.keys(CATEGORIES) as AccountCategory[])
    .filter((c) => settings.categories.includes(c))
    .map((c) => ({
      id: c,
      count: nearAccounts.filter((a) => a.category === c).length,
    }))
    .filter((c) => c.count > 0);
  const typeCounts = (Object.keys(EVENT_TYPES) as EventType[])
    .map((t) => ({
      id: t,
      count: nearEvents.filter((e) => e.type === t).length,
    }))
    .filter((t) => t.count > 0);

  // Before the market's first run brings anything in, say so (rather than
  // "nothing matches").
  if (!market.ready && !accounts.length && !events.length) {
    return (
      <NotReady
        state='LOADING'
        title='Find leads'
        market={settings.base.city}
        trialEndsAt={access === "TRIAL" ? trialEndsAt : undefined}
        action={
          where === "studio"
            ? { href: "/admin/leads-tool", label: "Run the market now" }
            : { href: href("settings"), label: "Lead settings" }
        }
      />
    );
  }

  const switchTab = (next: Tab) => {
    setTab(next);
    setQuery("");
    // Keep the address in step, so back and refresh land on the same list.
    history.replaceState(null, "", `?tab=${next}`);
  };

  return (
    <>
      <PageHead
        crumb='Leads'
        title='Find leads'
        text={
          market.ready
            ? `Everything within ${radius} miles of ${settings.base.city}. Open any of them for free; saving one finds the decision-maker and writes your scripts.`
            : `Still loading the area around ${settings.base.city}: here's what's in so far, and the rest is here by tomorrow morning.`
        }
      />

      <section className={ui.panel}>
        <div className={styles.findTop}>
          <div className={styles.tabs} role='tablist' aria-label='Lead type'>
            {(
              [
                ["accounts", "Accounts", nearAccounts.length, "home"],
                ["events", "Events", nearEvents.length, "bell"],
              ] as const
            ).map(([key, label, n, icon]) => (
              <button
                key={key}
                type='button'
                role='tab'
                aria-selected={tab === key}
                className={`${styles.tab} ${tab === key ? styles.tabOn : ""}`}
                onClick={() => switchTab(key)}
              >
                <Icon name={icon} />
                {label}
                <span className={styles.tabCount}>{n}</span>
              </button>
            ))}
          </div>
          <label className={styles.radius}>
            <span className={ui.monoMuted}>Within</span>
            <select
              className={ui.select}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
            >
              {RADII.map((r) => (
                <option key={r} value={r}>
                  {r} miles
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={styles.search}>
          <Icon name='search' className={styles.searchIcon} />
          <span className={ui.srOnly}>Search</span>
          <input
            className={ui.input}
            type='search'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              tab === "accounts"
                ? "Search hotels, venues, companies…"
                : "Search events, venues, organizers…"
            }
          />
        </label>

        {tab === "accounts" ? (
          <div className={styles.filters}>
            <div
              className={ui.chips}
              role='group'
              aria-label='Kind of business'
            >
              <button
                type='button'
                className={ui.chip}
                aria-pressed={category === "ALL"}
                onClick={() => setCategory("ALL")}
              >
                All
                <span className={styles.count}>{nearAccounts.length}</span>
              </button>
              {categoryCounts.map((c) => (
                <button
                  key={c.id}
                  type='button'
                  className={ui.chip}
                  aria-pressed={category === c.id}
                  onClick={() => setCategory(c.id)}
                >
                  {CATEGORIES[c.id].label}
                  <span className={styles.count}>{c.count}</span>
                </button>
              ))}
            </div>
            <div className={ui.chips} role='group' aria-label='Only show'>
              <button
                type='button'
                className={`${ui.chip} ${styles.toggle}`}
                aria-pressed={open}
                onClick={() => setOpen((v) => !v)}
              >
                {open && <Icon name='check' />}
                No car service yet
              </button>
              <button
                type='button'
                className={`${ui.chip} ${styles.toggle}`}
                aria-pressed={ready}
                onClick={() => setReady((v) => !v)}
              >
                {ready && <Icon name='check' />}
                Contact ready
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.filters}>
            <div className={ui.chips} role='group' aria-label='When'>
              {WINDOWS.map((w) => (
                <button
                  key={w.days}
                  type='button'
                  className={ui.chip}
                  aria-pressed={span === w.days}
                  onClick={() => setSpan(w.days)}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <div className={styles.filterRow}>
              <div className={ui.chips} role='group' aria-label='Kind of event'>
                <button
                  type='button'
                  className={ui.chip}
                  aria-pressed={type === "ALL"}
                  onClick={() => setType("ALL")}
                >
                  All
                </button>
                {typeCounts.map((t) => (
                  <button
                    key={t.id}
                    type='button'
                    className={ui.chip}
                    aria-pressed={type === t.id}
                    onClick={() => setType(t.id)}
                  >
                    {EVENT_TYPES[t.id].label}
                    <span className={styles.count}>{t.count}</span>
                  </button>
                ))}
              </div>
              <label className={styles.sourcePick}>
                <span className={ui.srOnly}>Source</span>
                <select
                  className={ui.select}
                  value={source}
                  onChange={(e) =>
                    setSource(e.target.value as SourceId | "ALL")
                  }
                >
                  <option value='ALL'>Every source</option>
                  {(Object.keys(SOURCES) as SourceId[]).map((s) => (
                    <option key={s} value={s}>
                      {SOURCES[s].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}

        <div className={styles.resultsHead}>
          <span className={ui.monoMuted}>
            {tab === "accounts"
              ? `${shownAccounts.length} ${shownAccounts.length === 1 ? "account" : "accounts"} · highest score first`
              : `${shownEvents.length} ${shownEvents.length === 1 ? "event" : "events"} · ${eventOrder === "best" ? "highest score first" : "soonest first"}`}
          </span>
          {tab === "events" && (
            <div
              className={styles.segmented}
              role='radiogroup'
              aria-label='Order'
            >
              {(
                [
                  ["best", "Best first"],
                  ["soon", "Soonest first"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type='button'
                  role='radio'
                  aria-checked={eventOrder === key}
                  className={`${styles.segment} ${eventOrder === key ? styles.segmentOn : ""}`}
                  onClick={() => setEventOrder(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {tab === "accounts" ? (
          shownAccounts.length ? (
            <ul className={styles.results}>
              {shownAccounts.map((a) => (
                <li key={a.id} className={styles.result}>
                  <Link href={href(a.id)} className={styles.resultMain}>
                    <Thumb target={a} />
                    <span className={styles.itemText}>
                      <span className={styles.itemName}>{a.name}</span>
                      <span className={styles.itemKind}>
                        {kindOf(a)}
                        {a.rating ? ` · ${a.rating.toFixed(1)} stars` : ""}
                      </span>
                      <Reasons target={a} now={now} />
                    </span>
                  </Link>
                  <span className={styles.resultSide}>
                    <ScoreBadge score={scoreFor(a.id)} />
                    <SaveButton id={a.id} from='Find' />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Nothing
              onReset={() => {
                setCategory("ALL");
                setOpen(false);
                setReady(false);
                setQuery("");
                setRadius(75);
              }}
            />
          )
        ) : shownEvents.length ? (
          <ul className={styles.results}>
            {shownEvents.map((e) => (
              <li key={e.id} className={styles.result}>
                <Link href={href(e.id)} className={styles.resultMain}>
                  <Thumb target={e} />
                  <span className={styles.itemText}>
                    <span className={styles.itemName}>{e.name}</span>
                    <span className={styles.itemKind}>
                      {[
                        eventDates(e),
                        [e.venue, e.city].filter(Boolean).join(", "),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <Reasons target={e} now={now} />
                  </span>
                  <span className={styles.sourceTag}>
                    {SOURCES[e.source].label}
                  </span>
                </Link>
                <span className={styles.resultSide}>
                  <ScoreBadge score={scoreFor(e.id)} />
                  <SaveButton id={e.id} from='Find' />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Nothing
            onReset={() => {
              setType("ALL");
              setSource("ALL");
              setQuery("");
              setSpan(90);
              setRadius(75);
            }}
          />
        )}
        <p className={styles.credit}>
          {tab === "accounts"
            ? "Places, photos and ratings from Google"
            : "Events from the sources above · Venue photos from Google"}
        </p>
      </section>
    </>
  );
}

function Nothing({ onReset }: { onReset: () => void }) {
  return (
    <div className={styles.nothing}>
      <span className={styles.clearIcon}>
        <Icon name='search' />
      </span>
      <p>Nothing matches. Try fewer filters or a wider radius.</p>
      <button
        type='button'
        className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
        onClick={onReset}
      >
        Show everything
      </button>
    </div>
  );
}
