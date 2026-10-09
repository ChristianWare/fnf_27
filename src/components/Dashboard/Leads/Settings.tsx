"use client";

// Where the client works, what they're after, how their scripts introduce
// them, and the morning email. SAMPLE: saving keeps the changes until you
// reload; after the move it saves them.

import Link from "next/link";
import { useMemo, useState } from "react";
import Icon from "../icons";
import { PageHead, ui } from "../ui/ui";
import { useToast } from "../Toast/Toast";
import { useLeads } from "./Store";
import styles from "./Leads.module.css";
import { locate, rank, writeScripts } from "@/lib/leads/advice";
import { CATEGORIES, EVENT_TYPES, SOURCES } from "@/lib/leads/catalog";
import { CITIES } from "@/lib/leads/market";
import type {
  AccountCategory,
  EventType,
  LeadsSettings,
  SourceId,
} from "@/lib/leads/types";
import { fmtDate, money } from "@/lib/dashboard/format";

const RADII = [10, 25, 50, 75];

export default function Settings() {
  const leads = useLeads();
  const { now, access, trialEndsAt, monthly } = leads;
  const toast = useToast();
  const [draft, setDraft] = useState<LeadsSettings>(leads.settings);
  const changed = JSON.stringify(draft) !== JSON.stringify(leads.settings);

  const set = (patch: Partial<LeadsSettings>) =>
    setDraft((d) => ({ ...d, ...patch }));
  const setOp = (patch: Partial<LeadsSettings["operator"]>) =>
    setDraft((d) => ({ ...d, operator: { ...d.operator, ...patch } }));

  // What the draft would find, so the numbers move as they change it.
  const inRange = useMemo(() => {
    const accounts = locate(leads.accounts, draft.base).filter(
      (a) => a.miles <= draft.radius && draft.categories.includes(a.category),
    );
    const events = locate(leads.events, draft.base).filter(
      (e) => e.miles <= draft.radius && draft.eventTypes.includes(e.type),
    );
    return { accounts, events };
  }, [leads.accounts, leads.events, draft]);

  const sample = [...inRange.accounts].sort(
    (a, b) => rank(b, now) - rank(a, now),
  )[0];
  const preview = sample
    ? writeScripts(sample, draft)
        .email.body.split("\n\n")
        .slice(0, 3)
        .join("\n\n")
    : undefined;

  const toggle = <T extends string>(list: T[], item: T) =>
    list.includes(item) ? list.filter((i) => i !== item) : [...list, item];

  const trialDays = trialEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(trialEndsAt).getTime() - new Date(now).getTime()) /
            86_400_000,
        ),
      )
    : 0;

  return (
    <>
      <PageHead
        crumb='Leads'
        title='Lead settings'
        text='Where you work, what you’re after, and how your scripts introduce you.'
      >
        {changed && (
          <>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light}`}
              onClick={() => setDraft(leads.settings)}
            >
              Undo
            </button>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black}`}
              disabled={!draft.categories.length && !draft.eventTypes.length}
              onClick={() => {
                leads.updateSettings(draft);
                toast("Settings saved", {
                  detail: `${inRange.accounts.length} accounts and ${inRange.events.length} events in range. Tomorrow's email uses them.`,
                });
              }}
            >
              Save changes
              <Icon name='check' className={ui.btnIcon} />
            </button>
          </>
        )}
      </PageHead>

      <div className={styles.grid}>
        <div className={styles.column}>
          {/* ── Market ── */}
          <section className={ui.panel}>
            <div className={ui.panelHead}>
              <div className={ui.panelTitles}>
                <h2 className={ui.panelTitle}>Your market</h2>
                <p>
                  Leads are matched by distance from your base, so nearby cities
                  count too.
                </p>
              </div>
              <span className={styles.rangeTag}>
                {inRange.accounts.length} accounts · {inRange.events.length}{" "}
                events
              </span>
            </div>
            <div className={styles.formRow}>
              <label className={ui.field}>
                <span className={ui.label}>Your base</span>
                <select
                  className={ui.select}
                  value={draft.base.city}
                  onChange={(e) =>
                    set({
                      base: { city: e.target.value, ...CITIES[e.target.value] },
                    })
                  }
                >
                  {Object.keys(CITIES).map((city) => (
                    <option key={city} value={city}>
                      {city}, AZ
                    </option>
                  ))}
                </select>
              </label>
              <div className={ui.field}>
                <span className={ui.label}>How far you&apos;ll drive</span>
                <div className={ui.chips} role='radiogroup' aria-label='Radius'>
                  {RADII.map((r) => (
                    <button
                      key={r}
                      type='button'
                      role='radio'
                      aria-checked={draft.radius === r}
                      className={ui.chip}
                      onClick={() => set({ radius: r })}
                    >
                      {r} mi
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── What to find ── */}
          <section className={ui.panel}>
            <div className={ui.panelTitles}>
              <h2 className={ui.panelTitle}>What to find</h2>
              <p>
                Turn off anything you don&apos;t want in your list or email.
              </p>
            </div>
            <div className={ui.field}>
              <span className={ui.label}>Accounts</span>
              <div className={ui.chips}>
                {(Object.keys(CATEGORIES) as AccountCategory[]).map((c) => (
                  <button
                    key={c}
                    type='button'
                    className={`${ui.chip} ${styles.toggle}`}
                    aria-pressed={draft.categories.includes(c)}
                    onClick={() =>
                      set({ categories: toggle(draft.categories, c) })
                    }
                  >
                    {draft.categories.includes(c) && <Icon name='check' />}
                    {CATEGORIES[c].label}
                  </button>
                ))}
              </div>
            </div>
            <div className={ui.field}>
              <span className={ui.label}>Events</span>
              <div className={ui.chips}>
                {(Object.keys(EVENT_TYPES) as EventType[]).map((t) => (
                  <button
                    key={t}
                    type='button'
                    className={`${ui.chip} ${styles.toggle}`}
                    aria-pressed={draft.eventTypes.includes(t)}
                    onClick={() =>
                      set({ eventTypes: toggle(draft.eventTypes, t) })
                    }
                  >
                    {draft.eventTypes.includes(t) && <Icon name='check' />}
                    {EVENT_TYPES[t].label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* ── Your business ── */}
          <section className={ui.panel}>
            <div className={ui.panelTitles}>
              <h2 className={ui.panelTitle}>Your business</h2>
              <p>
                Every email, text and call opener introduces you with these.
              </p>
            </div>
            <div className={styles.formGrid}>
              <label className={ui.field}>
                <span className={ui.label}>Company</span>
                <input
                  className={ui.input}
                  value={draft.operator.company}
                  onChange={(e) => setOp({ company: e.target.value })}
                />
              </label>
              <label className={ui.field}>
                <span className={ui.label}>Your name</span>
                <input
                  className={ui.input}
                  value={draft.operator.name}
                  onChange={(e) => setOp({ name: e.target.value })}
                />
              </label>
              <label className={`${ui.field} ${styles.wide}`}>
                <span className={ui.label}>Your fleet</span>
                <input
                  className={ui.input}
                  value={draft.operator.fleet}
                  onChange={(e) => setOp({ fleet: e.target.value })}
                  placeholder='e.g. two Escalades and a Sprinter'
                />
              </label>
              <label className={`${ui.field} ${styles.wide}`}>
                <span className={ui.label}>What you&apos;re best at</span>
                <input
                  className={ui.input}
                  value={draft.operator.strength}
                  onChange={(e) => setOp({ strength: e.target.value })}
                  placeholder='e.g. airport runs and corporate accounts'
                />
              </label>
              <label className={ui.field}>
                <span className={ui.label}>Phone</span>
                <input
                  className={ui.input}
                  value={draft.operator.phone}
                  onChange={(e) => setOp({ phone: e.target.value })}
                />
              </label>
              <label className={ui.field}>
                <span className={ui.label}>Website</span>
                <input
                  className={ui.input}
                  value={draft.operator.website ?? ""}
                  onChange={(e) => setOp({ website: e.target.value })}
                />
              </label>
            </div>
            {preview && sample && (
              <div className={styles.preview}>
                <span className={ui.monoMuted}>
                  How an email to {sample.name} opens
                </span>
                <p>{preview}</p>
              </div>
            )}
          </section>
        </div>

        <div className={styles.column}>
          {/* ── Morning email ── */}
          <section className={ui.panel}>
            <div className={styles.switchRow}>
              <div className={ui.panelTitles}>
                <h2 className={ui.panelTitle}>Morning email</h2>
                <p>Every day at 6:00 AM, Arizona time.</p>
              </div>
              <button
                type='button'
                role='switch'
                aria-checked={draft.morningEmail}
                aria-label='Morning email'
                className={ui.switch}
                onClick={() => set({ morningEmail: !draft.morningEmail })}
              />
            </div>
            <ul className={styles.ticks}>
              <li>
                <Icon name='check' />
                Who to reach out to and follow up with today
              </li>
              <li>
                <Icon name='check' />
                New accounts and events found overnight
              </li>
              <li>
                <Icon name='check' />
                Events coming up in the next two weeks
              </li>
              <li>
                <Icon name='check' />A one-click unsubscribe in every email
              </li>
            </ul>
          </section>

          {/* ── Sources ── */}
          <section className={ui.panel}>
            <div className={ui.panelTitles}>
              <h2 className={ui.panelTitle}>Where events come from</h2>
              <p>Checked every night. In range for you right now:</p>
            </div>
            <ul className={styles.sources}>
              {(Object.keys(SOURCES) as SourceId[]).map((s) => {
                const n = inRange.events.filter((e) => e.source === s).length;
                return (
                  <li key={s} className={styles.source}>
                    <span className={styles.sourceIcon}>
                      <Icon name={SOURCES[s].icon} />
                    </span>
                    <span className={styles.itemText}>
                      <span className={styles.itemName}>
                        {SOURCES[s].label}
                      </span>
                      <span className={styles.rowMeta}>{SOURCES[s].text}</span>
                    </span>
                    <span className={styles.sourceCount}>{n}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ── Plan ── */}
          <section className={ui.panel}>
            <div className={ui.panelTitles}>
              <h2 className={ui.panelTitle}>Your plan</h2>
              <p>
                {access === "INCLUDED"
                  ? "The Leads Tool is included with your Full Platform plan."
                  : access === "TRIAL"
                    ? `Free trial, ${trialDays} ${trialDays === 1 ? "day" : "days"} left${trialEndsAt ? `, until ${fmtDate(trialEndsAt)}` : ""}. To keep it, add a card: the first charge covers the rest of that month, then ${money(monthly)} on the 1st.`
                    : `${money(monthly)} a month, billed on the 1st. Cancel anytime.`}
              </p>
            </div>
            {access !== "INCLUDED" && (
              <Link
                href='/dashboard/billing#leads'
                className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall} ${styles.selfStart}`}
              >
                {access === "TRIAL" ? "Add a card" : "Billing"}
                <Icon name='arrow' className={ui.btnIcon} />
              </Link>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
