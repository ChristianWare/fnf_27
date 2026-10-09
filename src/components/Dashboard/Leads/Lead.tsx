"use client";

// One lead, account or event: why it's worth it, who to contact, the
// brief, the scripts, and everything you've done with it. Opening it is
// free. Saving it finds the decision-maker and writes the scripts.

import Link from "next/link";
import { useCallback, useState } from "react";
import Icon, { type IconName } from "../icons";
import { Pill, ui } from "../ui/ui";
import { useToast } from "../Toast/Toast";
import { useLeads } from "./Store";
import {
  Img,
  kindOf,
  NoImage,
  Reasons,
  SaveButton,
  ScoreBadge,
  StagePill,
  WinDialog,
} from "./bits";
import Lightbox from "./Lightbox";
import styles from "./Leads.module.css";
import { briefFor, eventDates, writeScripts } from "@/lib/leads/advice";
import { CATEGORIES, EVENT_TYPES, SOURCES, STAGES } from "@/lib/leads/catalog";
import { scoreOf, timingOf, type ScoreFactor } from "@/lib/leads/score";
import type { ActivityKind, LeadExtras, LeadStage } from "@/lib/leads/types";
import {
  dayKey,
  fmtAgo,
  fmtShort,
  fmtTime,
  fmtWeekday,
  initials,
  money,
} from "@/lib/dashboard/format";

type ScriptTab = "email" | "text" | "call";

const activityIcon: Record<ActivityKind, IconName> = {
  SAVED: "plus",
  FOUND: "user",
  EMAIL: "mail",
  TEXT: "message",
  CALL: "phone",
  MET: "users",
  NOTE: "pen",
  STAGE: "arrow",
  WON: "star",
};

const DAY = 86_400_000;

const withScheme = (url: string) =>
  /^https?:/i.test(url) ? url : `https://${url}`;

/** "Venue, address", without the venue twice when the address starts with it. */
const whereOf = (venue: string, place?: string) =>
  venue && place?.toLowerCase().startsWith(venue.toLowerCase())
    ? place
    : [venue, place].filter(Boolean).join(", ");

/** "car service and size". */
const listOf = (items: string[]) =>
  items.length > 1
    ? `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`
    : (items[0] ?? "");

/** A sentence on what a score is made of. */
function scoreSummary(score: number, factors: ScoreFactor[]) {
  const share = (f: ScoreFactor) => f.points / f.max;
  const strong = factors
    .filter((f) => share(f) >= 0.75)
    .sort((a, b) => b.max - a.max)
    .slice(0, 2)
    .map((f) => f.label.toLowerCase());
  const weak = factors
    .filter((f) => share(f) < 0.4 && f.max >= 10)
    .sort((a, b) => b.max - a.max)[0];
  return [
    score >= 75
      ? "One of your best."
      : score >= 55
        ? "Worth a look."
        : "A long shot.",
    strong.length ? `Strongest on ${listOf(strong)}.` : "",
    weak ? `Held back by ${weak.label.toLowerCase()}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export default function Lead({
  id,
  extras = {},
}: {
  id: string;
  extras?: LeadExtras;
}) {
  const leads = useLeads();
  const { now, settings, target, savedFor, href, newSince } = leads;
  const toast = useToast();
  const [tab, setTab] = useState<ScriptTab>("email");
  const [winning, setWinning] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [logNote, setLogNote] = useState("");
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  // Which photo the lightbox shows, and photos that wouldn't load.
  const [shown, setShown] = useState<number | null>(null);
  const [broken, setBroken] = useState<string[]>([]);
  const markBroken = useCallback(
    (src: string) => setBroken((b) => (b.includes(src) ? b : [...b, src])),
    [],
  );
  const closeLightbox = useCallback(() => setShown(null), []);

  const t = target(id);
  if (!t) return null;
  const photos = (extras.photos ?? []).filter((p) => !broken.includes(p.src));
  const hero = photos[0];
  const { score, factors } = scoreOf(t, now, newSince);
  const timing = t.kind === "EVENT" ? timingOf(t.date, now) : undefined;
  const lead = savedFor(id);
  const brief = briefFor(t, now);
  const scripts = lead
    ? (lead.scripts ?? writeScripts(t, settings))
    : undefined;
  const angle =
    t.kind === "ACCOUNT" ? CATEGORIES[t.category] : EVENT_TYPES[t.type];
  const first = t.contact?.name.split(" ")[0];
  const phone = t.contact?.phone ?? t.phone;
  const isNew = t.foundAt > newSince && !lead;
  // For an event happening soon, the quickest line to someone.
  const urgentLine =
    t.kind === "EVENT"
      ? (t.contact?.phone ?? t.phone ?? t.venuePhone)
      : undefined;

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${what} copied`, { detail: "Paste it wherever you send from." });
    } catch {
      toast("Couldn't copy that", { tone: "error" });
    }
  };

  /** Runs one change at a time, with its button showing it's busy. */
  const doing = async (what: string, work: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(what);
    try {
      await work();
    } finally {
      setBusy(null);
    }
  };

  const logged = (how: "EMAIL" | "TEXT" | "CALL" | "MET", note?: string) =>
    doing(`log-${how}`, async () => {
      const at = await leads.log(id, how, note);
      if (!at) return;
      setLogNote("");
      toast("Logged", {
        detail: `We'll remind you to follow up ${fmtWeekday(at)}.`,
      });
    });

  const remindIn = (days?: number) =>
    doing(`remind-${days ?? "clear"}`, async () => {
      const at =
        days === undefined
          ? undefined
          : new Date(new Date().getTime() + days * DAY).toISOString();
      if (!(await leads.remind(id, at))) return;
      toast(at ? `Reminder set for ${fmtWeekday(at)}` : "Reminder cleared", {
        tone: at ? "success" : "info",
      });
    });

  const due = lead?.remindAt
    ? dayKey(lead.remindAt) < dayKey(now)
      ? `Overdue since ${fmtWeekday(lead.remindAt)}`
      : dayKey(lead.remindAt) === dayKey(now)
        ? "Today"
        : fmtWeekday(lead.remindAt)
    : undefined;

  const drive = extras.drive
    ? [
        {
          label: "Drive",
          value: `${extras.drive.minutes} min · ${extras.drive.miles} mi from ${settings.base.city}`,
        },
      ]
    : [];

  const facts: {
    label: string;
    value: string;
    href?: string;
    /** "Live site": opens in a new tab. */
    site?: boolean;
  }[] =
    t.kind === "ACCOUNT"
      ? [
          { label: "Category", value: CATEGORIES[t.category].label },
          ...(t.rating
            ? [
                {
                  label: "Google",
                  value: `${t.rating.toFixed(1)} stars · ${(t.reviews ?? 0).toLocaleString("en-US")} reviews`,
                },
              ]
            : []),
          ...(t.phone
            ? [{ label: "Main line", value: t.phone, href: `tel:${t.phone}` }]
            : []),
          ...(t.address ? [{ label: "Address", value: t.address }] : []),
          ...drive,
          {
            label: "Car service",
            value:
              t.carService === "NONE"
                ? "None on their website"
                : t.carService === "HAS"
                  ? "They have one"
                  : "Not sure yet",
          },
          ...(t.website
            ? [
                {
                  label: "Website",
                  value: "Live site",
                  href: withScheme(t.website),
                  site: true,
                },
              ]
            : []),
        ]
      : [
          {
            label: "When",
            value: t.allDay
              ? eventDates(t)
              : `${eventDates(t)} · ${fmtTime(t.date)}`,
          },
          {
            label: "Where",
            value: whereOf(t.venue, t.address || t.city) || "Not listed",
          },
          ...(t.price ? [{ label: "Tickets", value: t.price }] : []),
          ...(t.venueRating
            ? [
                {
                  label: "Venue on Google",
                  value: `${t.venueRating.toFixed(1)} stars · ${(t.venueReviews ?? 0).toLocaleString("en-US")} reviews`,
                },
              ]
            : []),
          ...(t.venuePhone
            ? [
                {
                  label: "Venue line",
                  value: t.venuePhone,
                  href: `tel:${t.venuePhone}`,
                },
              ]
            : []),
          ...(t.organizer ? [{ label: "Organizer", value: t.organizer }] : []),
          ...(t.guests
            ? [
                {
                  label: t.type === "WEDDING_SHOW" ? "Couples" : "Guests",
                  value: t.guests.toLocaleString("en-US"),
                },
              ]
            : []),
          ...drive,
          ...(t.website
            ? [
                {
                  label: "Event page",
                  value: "Live site",
                  href: withScheme(t.website),
                  site: true,
                },
              ]
            : []),
          { label: "Found on", value: SOURCES[t.source].label },
        ];

  const script =
    scripts &&
    (tab === "email"
      ? `Subject: ${scripts.email.subject}\n\n${scripts.email.body}`
      : tab === "text"
        ? scripts.text
        : scripts.call);

  const mailto =
    scripts && t.contact?.email
      ? `mailto:${t.contact.email}?subject=${encodeURIComponent(scripts.email.subject)}&body=${encodeURIComponent(scripts.email.body)}`
      : undefined;
  const sms =
    scripts && phone
      ? `sms:${phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(scripts.text)}`
      : undefined;

  return (
    <>
      <Link
        href={href(`find${t.kind === "EVENT" ? "?tab=events" : ""}`)}
        className={styles.back}
      >
        <Icon name='arrow' className={styles.backIcon} />
        {t.kind === "EVENT" ? "All events" : "All accounts"}
      </Link>

      {/* ── Close to the date: call, don't email ── */}
      {t.kind === "EVENT" && timing?.urgent && (
        <section className={styles.urgent}>
          <span className={styles.urgentIcon}>
            <Icon name='clock' />
          </span>
          <span className={styles.urgentText}>
            <strong className={styles.urgentTitle}>
              {timing.days <= 0
                ? "It's today"
                : timing.days === 1
                  ? "Tomorrow: act today"
                  : `${timing.days} days away: act today`}
            </strong>
            <p>
              Most transport for an event this close is booked already. Call
              instead of emailing, and offer to cover whatever&apos;s still
              open.
            </p>
          </span>
          {urgentLine ? (
            <a
              href={`tel:${urgentLine}`}
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
            >
              Call {urgentLine}
              <Icon name='phone' className={ui.btnIcon} />
            </a>
          ) : t.website ? (
            <a
              href={withScheme(t.website)}
              target='_blank'
              rel='noopener noreferrer'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
            >
              Event page
              <Icon name='arrowUpRight' className={ui.btnIcon} />
            </a>
          ) : null}
        </section>
      )}

      {/* ── The lead ── */}
      <header className={styles.leadHead}>
        <figure className={styles.hero}>
          {hero ? (
            <>
              <button
                type='button'
                className={styles.heroButton}
                onClick={() => setShown(0)}
                aria-label={`See the photo of ${t.name} full size`}
              >
                <Img
                  key={hero.src}
                  src={hero.src}
                  className={styles.heroImg}
                  eager
                  onFail={() => markBroken(hero.src)}
                />
                <span className={styles.shade} aria-hidden='true' />
                <span className={styles.expand} aria-hidden='true'>
                  <Icon name='expand' />
                  Click to expand
                </span>
              </button>
              <figcaption className={styles.photoCredit}>
                {hero.creditUrl ? (
                  <a
                    href={hero.creditUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    {hero.credit}
                  </a>
                ) : (
                  hero.credit
                )}
              </figcaption>
            </>
          ) : (
            <NoImage className={styles.heroNone} />
          )}
        </figure>

        <div className={styles.leadTop}>
          <div className={styles.leadTitles}>
            <span className={ui.monoMuted}>
              {kindOf(t)} · {t.miles} mi away
              {t.kind === "EVENT" ? ` · Via ${SOURCES[t.source].label}` : ""}
            </span>
            <h1 className={`h3 ${styles.leadName}`}>{t.name}</h1>
            <div className={styles.leadPills}>
              {lead ? (
                <StagePill stage={lead.stage} />
              ) : (
                isNew && (
                  <Pill tone='lime' dot>
                    New today
                  </Pill>
                )
              )}
              {timing && (
                <Pill tone={timing.tone} dot>
                  {timing.label}
                </Pill>
              )}
              <Reasons target={t} now={now} />
            </div>
          </div>
          <div className={styles.leadActions}>
            <ScoreBadge score={score} size='lg' />
            {lead?.stage === "WON" && lead.value ? (
              <span className={styles.wonTag}>
                Won · {money(lead.value)}
                {lead.per === "MONTH" ? "/mo" : ""}
              </span>
            ) : !lead ? (
              <SaveButton id={id} from='its page' small={false} />
            ) : null}
          </div>
        </div>
        <dl className={styles.facts}>
          {facts.map((f) => (
            <div key={f.label} className={styles.fact}>
              <dt>{f.label}</dt>
              <dd>
                {f.href ? (
                  <a
                    href={f.href}
                    target={f.site ? "_blank" : undefined}
                    rel='noopener noreferrer'
                    className={f.site ? styles.siteLink : undefined}
                  >
                    {f.value}
                    {f.site && (
                      <Icon name='arrowUpRight' className={styles.siteIcon} />
                    )}
                  </a>
                ) : (
                  f.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      {/* ── Photos: an account's own, from Google ── */}
      {t.kind === "ACCOUNT" && photos.length > 1 && (
        <section className={ui.panel}>
          <div className={ui.panelHead}>
            <div className={ui.panelTitles}>
              <h2 className={ui.panelTitle}>Photos</h2>
              <p>
                {photos.length} photos of {t.name}. Click any one to see it full
                size.
              </p>
            </div>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
              onClick={() => setShown(0)}
            >
              See them all
              <Icon name='expand' className={ui.btnIcon} />
            </button>
          </div>
          <ul className={styles.photoGrid}>
            {photos.slice(1, 7).map((p, i) => (
              <li key={p.src}>
                <button
                  type='button'
                  className={styles.gridButton}
                  onClick={() => setShown(i + 1)}
                  aria-label={`See photo ${i + 2} of ${photos.length} full size`}
                >
                  <Img
                    src={p.thumb}
                    className={styles.gridImg}
                    onFail={() => markBroken(p.src)}
                  />
                  <span className={styles.shade} aria-hidden='true' />
                  <span className={styles.expandSmall} aria-hidden='true'>
                    <Icon name='expand' />
                    Click to expand
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={styles.leadGrid}>
        <div className={styles.column}>
          {/* ── Why this score ── */}
          <section className={ui.panel}>
            <div className={styles.scoreHead}>
              <div className={ui.panelTitles}>
                <h2 className={ui.panelTitle}>Why this score</h2>
                <p>{scoreSummary(score, factors)}</p>
              </div>
              <ScoreBadge score={score} />
            </div>
            <ul className={styles.factors}>
              {factors.map((f) => {
                const share = f.points / f.max;
                return (
                  <li key={f.label} className={styles.factor}>
                    <span className={styles.factorTop}>
                      <span className={styles.factorLabel}>{f.label}</span>
                      <span className={styles.factorPoints}>
                        {f.points}
                        <span>/{f.max}</span>
                      </span>
                    </span>
                    <span className={styles.factorBar} aria-hidden='true'>
                      <span
                        className={
                          share >= 0.75
                            ? styles.barHigh
                            : share >= 0.4
                              ? styles.barMid
                              : styles.barLow
                        }
                        style={{ width: `${Math.max(4, share * 100)}%` }}
                      />
                    </span>
                    <p>{f.note}</p>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ── Who to contact ── */}
          <section className={ui.panel}>
            <div className={ui.panelTitles}>
              <h2 className={ui.panelTitle}>Who to contact</h2>
              <p>The person who books the rides.</p>
            </div>
            {!lead ? (
              <div className={styles.locked}>
                <div className={styles.ghost} aria-hidden='true'>
                  <span className={styles.ghostAvatar} />
                  <span className={styles.ghostLines}>
                    <i />
                    <i />
                  </span>
                </div>
                <p>
                  Save this lead and we find the decision-maker, usually{" "}
                  {angle.who}, with a work email or phone.
                </p>
                <SaveButton id={id} from='its page' />
              </div>
            ) : t.contact ? (
              <div className={styles.person}>
                <span className={styles.avatar}>
                  {initials(t.contact.name)}
                </span>
                <span className={styles.personText}>
                  <span className={styles.personName}>{t.contact.name}</span>
                  <span className={styles.rowMeta}>
                    {t.contact.title}
                    {t.kind === "EVENT"
                      ? t.organizer
                        ? ` · ${t.organizer}`
                        : ""
                      : ` · ${t.name}`}
                  </span>
                  <span className={styles.personLinks}>
                    {t.contact.email && (
                      <a href={`mailto:${t.contact.email}`}>
                        {t.contact.email}
                      </a>
                    )}
                    {t.contact.phone && (
                      <a href={`tel:${t.contact.phone}`}>{t.contact.phone}</a>
                    )}
                  </span>
                </span>
                <Pill
                  tone={t.contact.email && t.contact.verified ? "lime" : "gray"}
                  dot
                >
                  {!t.contact.email
                    ? "No email yet"
                    : t.contact.verified
                      ? "Email verified"
                      : "Not verified"}
                </Pill>
              </div>
            ) : (
              <div className={styles.locked}>
                <p>
                  No one found yet. Call {phone ?? "their main line"} and ask
                  for {angle.who}.
                </p>
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                  >
                    Call {phone}
                    <Icon name='phone' className={ui.btnIcon} />
                  </a>
                )}
              </div>
            )}
          </section>

          {/* ── Scripts ── */}
          <section className={ui.panel}>
            <div className={ui.panelHead}>
              <div className={ui.panelTitles}>
                <h2 className={ui.panelTitle}>What to say</h2>
                <p>
                  {lead
                    ? `Written for ${t.name}, in your words.`
                    : "An email, a text and a call opener, written for this lead."}
                </p>
              </div>
              {scripts && (
                <div
                  className={styles.segmented}
                  role='tablist'
                  aria-label='Script'
                >
                  {(
                    [
                      ["email", "Email"],
                      ["text", "Text"],
                      ["call", "Call"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type='button'
                      role='tab'
                      aria-selected={tab === key}
                      className={`${styles.segment} ${tab === key ? styles.segmentOn : ""}`}
                      onClick={() => setTab(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {scripts && script ? (
              <>
                <div className={styles.script}>{script}</div>
                <div className={styles.scriptActions}>
                  <button
                    type='button'
                    className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                    onClick={() =>
                      copy(
                        tab === "email" ? scripts.email.body : script,
                        tab === "email"
                          ? "Email"
                          : tab === "text"
                            ? "Text"
                            : "Call opener",
                      )
                    }
                  >
                    Copy
                    <Icon name='copy' className={ui.btnIcon} />
                  </button>
                  {tab === "email" && mailto && (
                    <a
                      href={mailto}
                      className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                    >
                      Open in email
                      <Icon name='mail' className={ui.btnIcon} />
                    </a>
                  )}
                  {tab === "text" && sms && (
                    <a
                      href={sms}
                      className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                    >
                      Open in messages
                      <Icon name='message' className={ui.btnIcon} />
                    </a>
                  )}
                  {tab === "call" && phone && (
                    <a
                      href={`tel:${phone}`}
                      className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                    >
                      Call {first ?? phone}
                      <Icon name='phone' className={ui.btnIcon} />
                    </a>
                  )}
                  <button
                    type='button'
                    className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
                    disabled={Boolean(busy)}
                    onClick={() =>
                      logged(
                        tab === "email"
                          ? "EMAIL"
                          : tab === "text"
                            ? "TEXT"
                            : "CALL",
                      )
                    }
                  >
                    {tab === "call" ? "I called" : "I sent it"}
                    <Icon name='check' className={ui.btnIcon} />
                  </button>
                </div>
                <p className={styles.scriptNote}>
                  These introduce you as {settings.operator.company} with{" "}
                  {settings.operator.fleet}.{" "}
                  <Link href={href("settings")}>Change that</Link>
                  {" · "}
                  <button
                    type='button'
                    className={styles.linkButton}
                    disabled={Boolean(busy)}
                    onClick={() =>
                      doing("rewrite", async () => {
                        if (await leads.rewrite(id))
                          toast("New scripts written", {
                            detail: "Same lead, a fresh take.",
                          });
                      })
                    }
                  >
                    {busy === "rewrite" ? "Writing…" : "Write new ones"}
                  </button>
                </p>
              </>
            ) : (
              <div className={styles.locked}>
                <p>
                  Save this lead and we write all three, so your first message
                  reads like you already know them.
                </p>
                <SaveButton id={id} from='its page' />
              </div>
            )}
          </section>

          {/* ── The brief ── */}
          <section className={ui.panel}>
            <div className={ui.panelTitles}>
              <h2 className={ui.panelTitle}>The brief</h2>
              <p>Why they need you, and how to pitch them.</p>
            </div>
            <dl className={styles.brief}>
              {brief.map((line) => (
                <div key={line.label} className={styles.briefRow}>
                  <dt>{line.label}</dt>
                  <dd>
                    {line.label === "In the news" &&
                    t.kind === "ACCOUNT" &&
                    t.news ? (
                      <>
                        <a
                          href={t.news.url}
                          target='_blank'
                          rel='noopener noreferrer'
                        >
                          {t.news.title}
                        </a>
                        . A new opening or a move is the best time to introduce
                        yourself.
                      </>
                    ) : (
                      line.text
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* ── Getting there ── */}
          {(extras.map || extras.mapsLink) && (
            <section className={ui.panel}>
              <div className={ui.panelHead}>
                <div className={ui.panelTitles}>
                  <h2 className={ui.panelTitle}>Getting there</h2>
                  <p>
                    {extras.drive
                      ? `About ${extras.drive.minutes} minutes from ${settings.base.city}, without traffic.`
                      : `${t.miles} miles from ${settings.base.city} as the crow flies.`}
                  </p>
                </div>
                {extras.mapsLink && (
                  <a
                    href={extras.mapsLink}
                    target='_blank'
                    rel='noopener noreferrer'
                    className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                  >
                    Open in Google Maps
                    <Icon name='arrowUpRight' className={ui.btnIcon} />
                  </a>
                )}
              </div>
              {extras.map && (
                <iframe
                  title={`Map of ${t.name}`}
                  src={extras.map}
                  className={styles.map}
                  loading='lazy'
                  referrerPolicy='no-referrer-when-downgrade'
                  allowFullScreen
                />
              )}
            </section>
          )}
        </div>

        <div className={styles.column}>
          {lead ? (
            <>
              {/* ── Stage ── */}
              <section className={ui.panel}>
                <div className={ui.panelTitles}>
                  <h2 className={ui.panelTitle}>Stage</h2>
                  <p>Where this lead is.</p>
                </div>
                <div
                  className={styles.stagePick}
                  role='radiogroup'
                  aria-label='Stage'
                >
                  {STAGES.map((s) => (
                    <button
                      key={s.id}
                      type='button'
                      role='radio'
                      aria-checked={lead.stage === s.id}
                      className={`${styles.stageOption} ${lead.stage === s.id ? styles[`stageOn_${s.tone}`] : ""}`}
                      onClick={async () => {
                        if (s.id === lead.stage) return;
                        if (s.id === "WON") {
                          setWinning(true);
                          return;
                        }
                        if (await leads.setStage(id, s.id as LeadStage))
                          toast(`Moved to ${s.label}`, { tone: "info" });
                      }}
                    >
                      <span
                        className={`${styles.stageDot} ${styles[`dot_${s.tone}`]}`}
                      />
                      {s.label}
                    </button>
                  ))}
                </div>
              </section>

              {/* ── Follow up ── */}
              {lead.stage !== "WON" && lead.stage !== "NOT_NOW" && (
                <section className={ui.panel}>
                  <div className={ui.panelTitles}>
                    <h2 className={ui.panelTitle}>Follow up</h2>
                    <p>
                      {due ? (
                        <>
                          Next: <strong className={styles.strong}>{due}</strong>
                        </>
                      ) : (
                        "No reminder yet. Log what you did and we set one."
                      )}
                    </p>
                  </div>
                  <div className={ui.chips}>
                    {(
                      [
                        [1, "Tomorrow"],
                        [3, "In 3 days"],
                        [7, "Next week"],
                      ] as const
                    ).map(([days, label]) => (
                      <button
                        key={days}
                        type='button'
                        className={ui.chip}
                        disabled={Boolean(busy)}
                        onClick={() => remindIn(days)}
                      >
                        {label}
                      </button>
                    ))}
                    {lead.remindAt && (
                      <button
                        type='button'
                        className={ui.chip}
                        disabled={Boolean(busy)}
                        onClick={() => remindIn()}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </section>
              )}

              {/* ── Log it ── */}
              <section className={ui.panel}>
                <div className={ui.panelTitles}>
                  <h2 className={ui.panelTitle}>Log what you did</h2>
                  <p>We&apos;ll remind you when to follow up.</p>
                </div>
                <input
                  className={ui.input}
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  placeholder='How did it go? (optional)'
                  aria-label='How did it go?'
                />
                <div className={styles.logButtons}>
                  {(
                    [
                      ["EMAIL", "Emailed", "mail"],
                      ["TEXT", "Texted", "message"],
                      ["CALL", "Called", "phone"],
                      ["MET", "Met", "users"],
                    ] as const
                  ).map(([how, label, icon]) => (
                    <button
                      key={how}
                      type='button'
                      className={styles.logButton}
                      disabled={Boolean(busy)}
                      onClick={() => logged(how, logNote)}
                    >
                      <Icon name={icon} />
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {/* ── Activity ── */}
              <section className={ui.panel}>
                <div className={ui.panelTitles}>
                  <h2 className={ui.panelTitle}>Activity</h2>
                  <p>Saved {fmtShort(lead.savedAt)}.</p>
                </div>
                <form
                  className={styles.noteForm}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!noteText.trim()) return;
                    doing("note", async () => {
                      if (!(await leads.note(id, noteText))) return;
                      setNoteText("");
                      toast("Note added");
                    });
                  }}
                >
                  <input
                    className={ui.input}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder='Add a note…'
                    aria-label='Add a note'
                  />
                  <button
                    type='submit'
                    className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
                    disabled={!noteText.trim() || Boolean(busy)}
                  >
                    Add
                  </button>
                </form>
                <ol className={styles.feed}>
                  {lead.activity.map((a) => (
                    <li key={a.id} className={styles.feedItem}>
                      <span
                        className={`${styles.feedIcon} ${a.kind === "WON" ? styles.feedWon : ""}`}
                      >
                        <Icon name={activityIcon[a.kind]} />
                      </span>
                      <span className={styles.feedText}>
                        <p>{a.text}</p>
                        <span className={styles.rowMeta}>
                          {fmtAgo(a.at, now)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>

              <button
                type='button'
                className={styles.remove}
                onClick={() => {
                  if (!removing) {
                    setRemoving(true);
                    return;
                  }
                  doing("remove", async () => {
                    setRemoving(false);
                    if (!(await leads.remove(id))) return;
                    toast(`Removed ${t.name}`, {
                      tone: "info",
                      detail: "It's back in Find if you change your mind.",
                    });
                  });
                }}
                onBlur={() => setRemoving(false)}
              >
                <Icon name='trash' />
                {removing ? "Click again to remove it" : "Remove from my leads"}
              </button>
            </>
          ) : (
            <section className={styles.savePrompt}>
              <span className={styles.savePromptIcon}>
                <Icon name='target' />
              </span>
              <h2 className={styles.savePromptTitle}>Worth a shot?</h2>
              <p>
                Save it and we find the decision-maker, write your email, text
                and call opener, and remind you when to follow up.
              </p>
              <SaveButton id={id} from='its page' small={false} />
            </section>
          )}
        </div>
      </div>

      <Lightbox
        photos={photos}
        index={shown}
        onIndex={setShown}
        onClose={closeLightbox}
        title={t.name}
      />
      <WinDialog id={id} open={winning} onClose={() => setWinning(false)} />
    </>
  );
}
