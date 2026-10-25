"use client";

// Where the client works, what they're after, how their scripts introduce
// them, and the morning email.

import Link from "next/link";
import { useMemo, useState } from "react";
import Icon from "../icons";
import { PageHead, ui } from "../ui/ui";
import { useToast } from "../Toast/Toast";
import { useLeads } from "./Store";
import styles from "./Leads.module.css";
import { locate, rank, writeScripts } from "@/lib/leads/advice";
import { CATEGORIES, EVENT_TYPES, SOURCES } from "@/lib/leads/catalog";
import AreaPicker from "./AreaPicker";
import { radiiFor, radiusLabel } from "@/lib/leads/areas";
import type {
  AccountCategory,
  EventType,
  LeadsSettings,
  SourceId,
} from "@/lib/leads/types";
import { prorate } from "@/lib/dashboard/billing";
import { fmtDate, money } from "@/lib/dashboard/format";


export default function Settings() {
  const leads = useLeads();
  const { now, access, trialEndsAt, monthly, billing, readOnly } = leads;
  const toast = useToast();
  const [draft, setDraft] = useState<LeadsSettings>(leads.settings);
  const [saving, setSaving] = useState(false);
  // Their state and city: the picker starts over after undo or save.
  const areas = leads.areas;
  const [pickerKey, setPickerKey] = useState(0);
  const [state, setState] = useState(leads.market.state ?? "");
  const resetPlace = () => {
    setState(leads.market.state ?? "");
    setPickerKey((k) => k + 1);
  };
  const radii = radiiFor(state);
  const changed = JSON.stringify(draft) !== JSON.stringify(leads.settings);
  // Cleared while they type a new one: no counts until it's picked.
  const located = Boolean(draft.base.city.trim());

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
              onClick={() => {
                setDraft(leads.settings);
                resetPlace();
              }}
            >
              Undo
            </button>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black}`}
              disabled={
                saving ||
                readOnly ||
                !draft.base.city.trim() ||
                (!draft.categories.length && !draft.eventTypes.length)
              }
              onClick={async () => {
                setSaving(true);
                const saved = await leads.updateSettings(draft);
                setSaving(false);
                if (!saved) return;
                setDraft(saved);
                resetPlace();
                toast("Settings saved", {
                  detail:
                    saved.base.city !== leads.settings.base.city
                      ? `Your base is ${saved.base.city} now. Your lists are catching up.`
                      : `${inRange.accounts.length} accounts and ${inRange.events.length} events in range. Tomorrow's email uses them.`,
                });
              }}
            >
              {saving ? "Saving…" : "Save changes"}
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
                  Your state and your city in it. Leads are matched by
                  distance from your city.
                </p>
              </div>
              <span className={styles.rangeTag}>
                {located
                  ? `${inRange.accounts.length} accounts · ${inRange.events.length} events`
                  : "Pick your city"}
              </span>
            </div>
            <div className={styles.formRow}>
              <div className={styles.placeFields}>
                <AreaPicker
                  key={pickerKey}
                  areas={areas}
                  initialState={leads.market.state}
                  initialCity={leads.settings.base.city}
                  disabled={readOnly}
                  idPrefix='lead-base'
                  onChange={(choice) => {
                    if (!choice) return;
                    setState(choice.state);
                    const { city, area } = choice;
                    set({
                      // Their city, or the area's center ("use it anyway").
                      base: city
                        ? { city: city.text, lat: city.lat, lng: city.lng }
                        : {
                            city: area.state
                              ? `${area.city}, ${area.state}`
                              : area.city,
                            lat: area.lat,
                            lng: area.lng,
                          },
                      ...(radiiFor(choice.state).includes(draft.radius)
                        ? {}
                        : { radius: 50 }),
                    });
                  }}
                />
              </div>
              <div className={ui.field}>
                <span className={ui.label}>How far you&apos;ll drive</span>
                <div className={ui.chips} role='radiogroup' aria-label='Radius'>
                  {radii.map((r) => (
                    <button
                      key={r}
                      type='button'
                      role='radio'
                      aria-checked={draft.radius === r}
                      className={ui.chip}
                      onClick={() => set({ radius: r })}
                    >
                      {radiusLabel(r, state)}
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
              <h2 className={ui.panelTitle}>
                {access === "STUDIO" ? "The studio's Leads Tool" : "Your plan"}
              </h2>
              <p>
                {access === "STUDIO"
                  ? "Free for admins and always on: your own market, your own saved leads, separate from every client's."
                  : access === "INCLUDED"
                    ? "The Leads Tool is included with your Full Platform plan."
                    : access === "TRIAL"
                      ? billing.subscribed && trialEndsAt
                        ? `Free trial, ${trialDays} ${trialDays === 1 ? "day" : "days"} left. Your card is set up: on ${fmtDate(trialEndsAt)} it's charged ${money(prorate(monthly, trialEndsAt))} for the rest of that month, then ${money(monthly)} on the 1st.`
                        : `Free trial, ${trialDays} ${trialDays === 1 ? "day" : "days"} left${trialEndsAt ? `, until ${fmtDate(trialEndsAt)}` : ""}. To keep it, add a card: the first charge covers the rest of that month, then ${money(monthly)} on the 1st.`
                      : billing.raw === "CANCELLING"
                        ? `Cancelled. It runs until ${billing.nextBillingAt ? fmtDate(billing.nextBillingAt) : "the end of the month"}, and nothing more is charged.`
                        : billing.raw === "PAST_DUE"
                          ? "Your last payment didn't go through. Update your card to keep it."
                          : `${money(monthly)} a month, billed on the 1st. Cancel anytime.`}
              </p>
            </div>
            {access === "TRIAL" && !billing.subscribed && !readOnly ? (
              <a
                href='/dashboard/billing/leads'
                className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall} ${styles.selfStart}`}
                data-no-transition
              >
                Add a card
                <Icon name='arrow' className={ui.btnIcon} />
              </a>
            ) : access === "TRIAL" || access === "ACTIVE" ? (
              <Link
                href='/dashboard/billing#leads'
                className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall} ${styles.selfStart}`}
              >
                Billing
                <Icon name='arrow' className={ui.btnIcon} />
              </Link>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}
