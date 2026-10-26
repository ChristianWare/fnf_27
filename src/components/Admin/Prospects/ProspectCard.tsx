"use client";

// One prospect, in a dialog: tap to call, log how it went, send the trial
// link, run their audit, and everything that's happened with them.

import Link from "next/link";
import { useEffect, useState } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "@/components/Dashboard/icons";
import { Pill, btn, ui } from "@/components/Dashboard/ui/ui";
import { useAction } from "@/components/Dashboard/useAction";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { fmtAgo, fmtDate, fmtTime } from "@/lib/dashboard/format";
import {
  PICK_OUTCOMES,
  OUTCOME_LABELS,
  PROSPECT_STAGES,
  STAGE_LABELS,
  type CallOutcome,
  type ProspectStage,
} from "@/lib/prospects/kinds";
import {
  addNote,
  auditProspect,
  deleteProspect,
  inviteLinkFor,
  logCall,
  prospectTimeline,
  saveProspect,
  sendInvite,
  setFollowUpAt,
  setStage,
  type TimelineItem,
} from "@/app/admin/prospects/actions";
import type { ProspectView } from "./Prospects";
import { stageTone } from "./tones";
import styles from "./ProspectCard.module.css";

/** "2026-10-26T09:00" in Arizona, for a datetime-local input. */
function azLocal(d: Date) {
  const az = new Date(d.getTime() - 7 * 3_600_000);
  return az.toISOString().slice(0, 16);
}

const tomorrowNine = (now: string) => {
  const d = new Date(new Date(now).getTime() + 86_400_000);
  return `${azLocal(d).slice(0, 10)}T09:00`;
};

const KIND_LABEL: Record<string, string> = {
  CALL: "Call",
  NOTE: "Note",
  EMAIL: "Email",
  STAGE: "Stage",
  IMPORT: "Added",
  SIGNUP: "Signed up",
};

const href = (site: string) => (/^https?:\/\//i.test(site) ? site : `https://${site}`);

export default function ProspectCard({
  prospect: p,
  now,
  onClose,
  onNext,
}: {
  prospect: ProspectView | null;
  now: string;
  onClose: () => void;
  /** In the queue: open the next one after a call is logged. */
  onNext?: () => void;
}) {
  return (
    <Modal isOpen={Boolean(p)} onClose={onClose} label={p?.business ?? "Prospect"}>
      {p && (
        <Body key={p.id} p={p} now={now} onClose={onClose} onNext={onNext} />
      )}
    </Modal>
  );
}

function Body({
  p,
  now,
  onClose,
  onNext,
}: {
  p: ProspectView;
  now: string;
  onClose: () => void;
  onNext?: () => void;
}) {
  const { run, pending } = useAction();
  const toast = useToast();
  const [timeline, setTimeline] = useState<TimelineItem[] | null>(null);
  const [version, setVersion] = useState(0);
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);
  const [note, setNote] = useState("");
  const [when, setWhen] = useState(tomorrowNine(now));
  const [email, setEmail] = useState(p.email);
  const [name, setName] = useState(p.contactName);
  const [editing, setEditing] = useState(false);
  const [jot, setJot] = useState("");
  const dnc = p.stage === "DO_NOT_CALL";

  useEffect(() => {
    let live = true;
    prospectTimeline(p.id).then((r) => {
      if (live && r.ok) setTimeline(r.data ?? []);
    });
    return () => {
      live = false;
    };
  }, [p.id, version]);

  const reload = () => setVersion((v) => v + 1);
  const needsWhen = outcome === "INTERESTED";

  const saveCall = (next: boolean) => {
    if (!outcome) return;
    run(
      () => logCall(p.id, outcome, note, needsWhen ? when : undefined),
      () => {
        setOutcome(null);
        setNote("");
        reload();
        if (next && onNext) onNext();
        return { message: `Logged: ${OUTCOME_LABELS[outcome]}` };
      },
    );
  };

  const copyLink = (thenText: boolean) =>
    run(
      () => inviteLinkFor(p.id),
      (link) => {
        if (!link) return;
        if (thenText) {
          const first = p.contactName.split(/\s+/)[0];
          const body = `${first ? `Hi ${first}, ` : ""}it's Chris from Fonts & Footers. Here's the free month of the Leads Tool we talked about: ${link}`;
          window.location.href = `sms:${p.phone.replace(/[^\d+]/g, "")}?&body=${encodeURIComponent(body)}`;
          return;
        }
        navigator.clipboard?.writeText(link).then(
          () => toast("Link copied"),
          () => toast(link),
        );
      },
    );

  return (
    <div className={ui.modalBody}>
      <header className={styles.head}>
        <h2 className={ui.modalTitle}>{p.business}</h2>
        <div className={styles.pills}>
          <Pill tone={stageTone[p.stage]}>{STAGE_LABELS[p.stage]}</Pill>
          <Pill tone={p.coverage.tone}>{p.coverage.label}</Pill>
          {p.rating ? (
            <Pill tone='white'>
              ★ {p.rating.toFixed(1)}
              {p.reviews ? ` · ${p.reviews.toLocaleString("en-US")} reviews` : ""}
            </Pill>
          ) : null}
        </div>
        <p className={styles.sub}>
          {[p.contactName, [p.city, p.state].filter(Boolean).join(", "), p.list]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      {/* How to reach them. */}
      <div className={styles.reach}>
        {p.phone && !dnc ? (
          <a className={btn("black")} href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}>
            <Icon name='phone' className={styles.btnIcon} />
            {p.phone}
          </a>
        ) : p.phone ? (
          <span className={styles.dnc}>Do not call {p.phone}</span>
        ) : (
          <span className={styles.muted}>No phone yet</span>
        )}
        {p.website && (
          <a className={btn("light")} href={href(p.website)} target='_blank' rel='noopener noreferrer'>
            Website
            <Icon name='arrowUpRight' className={styles.btnIcon} />
          </a>
        )}
        {p.mapsUrl && (
          <a className={btn("light")} href={p.mapsUrl} target='_blank' rel='noopener noreferrer'>
            Google listing
            <Icon name='arrowUpRight' className={styles.btnIcon} />
          </a>
        )}
        {p.email && (
          <a className={btn("light")} href={`mailto:${p.email}`}>
            {p.email}
          </a>
        )}
      </div>

      {p.notes && <p className={styles.notes}>{p.notes}</p>}
      {p.tags.length > 0 && (
        <div className={styles.tags}>
          {p.tags.map((t) => (
            <span key={t} className={styles.tag}>
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Log the call. */}
      {!dnc && (
        <section className={styles.block}>
          <h3 className={styles.blockTitle}>How did the call go?</h3>
          <div className={ui.chips} role='radiogroup' aria-label='Outcome'>
            {PICK_OUTCOMES.map((o) => (
              <button
                key={o}
                type='button'
                role='radio'
                aria-checked={outcome === o}
                className={ui.chip}
                onClick={() => setOutcome(o)}
              >
                {OUTCOME_LABELS[o]}
              </button>
            ))}
          </div>
          {outcome && (
            <>
              {needsWhen && (
                <label className={ui.field}>
                  <span className={ui.label}>
                    Follow up (Arizona time)
                  </span>
                  <input
                    className={ui.input}
                    type='datetime-local'
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                  />
                </label>
              )}
              <label className={ui.field}>
                <span className={ui.label}>Note, optional</span>
                <textarea
                  className={ui.textarea}
                  rows={3}
                  value={note}
                  placeholder='Who you spoke to, what they said, what to bring up next time'
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              <p className={styles.help}>{outcomeHelp(outcome, p.tries)}</p>
              <div className={styles.row}>
                <button type='button' className={btn("black")} disabled={pending} onClick={() => saveCall(Boolean(onNext))}>
                  {onNext ? "Save and next" : "Save"}
                </button>
                {onNext && (
                  <button type='button' className={btn("light")} disabled={pending} onClick={() => saveCall(false)}>
                    Save and stay
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* The trial link. */}
      {!dnc && !p.clientId && (
        <section className={styles.block}>
          <h3 className={styles.blockTitle}>Send the free trial</h3>
          <p className={styles.help}>
            Their own sign-up link, with their details filled in. When they
            sign up, they&apos;re linked here and move to On a trial.
            {p.inviteSentAt
              ? ` Last sent ${fmtAgo(p.inviteSentAt, now).replace(/^J/, "j")}.`
              : ""}
          </p>
          <div className={styles.two}>
            <label className={ui.field}>
              <span className={ui.label}>Their name</span>
              <input className={ui.input} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className={ui.field}>
              <span className={ui.label}>Email</span>
              <input className={ui.input} type='email' value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          </div>
          <div className={styles.row}>
            <button
              type='button'
              className={btn("black")}
              disabled={pending || !email}
              onClick={() =>
                run(
                  () => sendInvite(p.id, email, name),
                  () => {
                    reload();
                    return { message: "Trial link sent", detail: email };
                  },
                )
              }
            >
              <Icon name='send' className={styles.btnIcon} />
              Email the link
            </button>
            <button type='button' className={btn("light")} disabled={pending} onClick={() => copyLink(false)}>
              <Icon name='copy' className={styles.btnIcon} />
              Copy link
            </button>
            {p.phone && (
              <button type='button' className={btn("light")} disabled={pending} onClick={() => copyLink(true)}>
                <Icon name='message' className={styles.btnIcon} />
                Text from my phone
              </button>
            )}
          </div>
        </section>
      )}
      {p.clientId && (
        <section className={styles.block}>
          <h3 className={styles.blockTitle}>Signed up</h3>
          <Link className={btn("light")} href={`/admin/clients/${p.clientId}`}>
            Open their account
            <Icon name='arrow' className={styles.btnIcon} />
          </Link>
        </section>
      )}

      {/* Their audit, to send after the call. */}
      <section className={styles.block}>
        <h3 className={styles.blockTitle}>Their audit</h3>
        <div className={styles.row}>
          {p.audit && (
            <Link className={btn("light")} href={`/admin/audits/${p.audit.id}`}>
              {p.audit.score !== null ? `Score ${p.audit.score}/100` : "Running…"}
              <Icon name='arrow' className={styles.btnIcon} />
            </Link>
          )}
          <button
            type='button'
            className={btn(p.audit ? "outline" : "black")}
            disabled={pending || (!p.website && !p.city)}
            onClick={() =>
              run(
                () => auditProspect(p.id),
                () => ({ message: "Audit started", detail: "It takes about a minute." }),
              )
            }
          >
            {p.audit ? "Run it again" : "Run their audit"}
          </button>
        </div>
        {!p.website && !p.city && (
          <p className={styles.help}>Add their website or city first.</p>
        )}
      </section>

      {/* Where they are, and when they come up next. */}
      <section className={styles.block}>
        <h3 className={styles.blockTitle}>Where they are</h3>
        <div className={styles.two}>
          <label className={ui.field}>
            <span className={ui.label}>Stage</span>
            <select
              className={ui.select}
              value={p.stage}
              disabled={pending}
              onChange={(e) =>
                run(
                  () => setStage(p.id, e.target.value as ProspectStage),
                  () => {
                    reload();
                    return { message: `Moved to ${STAGE_LABELS[e.target.value as ProspectStage]}` };
                  },
                )
              }
            >
              {PROSPECT_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Next call (Arizona time)</span>
            <input
              className={ui.input}
              type='datetime-local'
              defaultValue={p.nextAt ? azLocal(new Date(p.nextAt)) : ""}
              onBlur={(e) => {
                const v = e.target.value;
                const had = p.nextAt ? azLocal(new Date(p.nextAt)) : "";
                if (v !== had)
                  run(() => setFollowUpAt(p.id, v), () => ({ message: v ? "Next call set" : "Taken off the queue" }));
              }}
            />
          </label>
        </div>
        <p className={styles.help}>
          {p.calls} call{p.calls === 1 ? "" : "s"}
          {p.lastCalledAt ? `, last ${fmtAgo(p.lastCalledAt, now)}` : ""}
          {p.lastOutcome ? ` (${OUTCOME_LABELS[p.lastOutcome].toLowerCase()})` : ""}.
        </p>
      </section>

      {/* Their details. */}
      <section className={styles.block}>
        <div className={styles.blockHead}>
          <h3 className={styles.blockTitle}>Details</h3>
          <button type='button' className={btn("light", true)} onClick={() => setEditing((e) => !e)}>
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>
        {editing && (
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const v = Object.fromEntries(
                ["business", "contactName", "phone", "email", "website", "mapsUrl", "city", "state", "tags", "notes"].map(
                  (k) => [k, String(f.get(k) ?? "")],
                ),
              ) as Parameters<typeof saveProspect>[1];
              run(
                () => saveProspect(p.id, v),
                () => {
                  setEditing(false);
                  return { message: "Saved" };
                },
              );
            }}
          >
            <div className={styles.two}>
              <Input label='Business' name='business' value={p.business} />
              <Input label='Contact' name='contactName' value={p.contactName} />
              <Input label='Phone' name='phone' value={p.phone} />
              <Input label='Email' name='email' value={p.email} />
              <Input label='Website' name='website' value={p.website} />
              <Input label='Google listing link' name='mapsUrl' value={p.mapsUrl} />
              <Input label='City' name='city' value={p.city} />
              <Input label='State' name='state' value={p.state} />
            </div>
            <Input label='Tags, separated by commas' name='tags' value={p.tags.join(", ")} />
            <label className={ui.field}>
              <span className={ui.label}>About them</span>
              <textarea className={ui.textarea} name='notes' rows={3} defaultValue={p.notes} />
            </label>
            <div className={styles.row}>
              <button type='submit' className={btn("black")} disabled={pending}>
                Save details
              </button>
              <button
                type='button'
                className={btn("outline")}
                disabled={pending}
                onClick={() => {
                  if (!window.confirm(`Delete ${p.business} and their timeline?`)) return;
                  run(
                    () => deleteProspect(p.id),
                    () => {
                      onClose();
                      return { message: "Deleted" };
                    },
                  );
                }}
              >
                Delete
              </button>
            </div>
          </form>
        )}
      </section>

      {/* What's happened. */}
      <section className={styles.block}>
        <h3 className={styles.blockTitle}>Timeline</h3>
        <form
          className={styles.jot}
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => addNote(p.id, jot),
              () => {
                setJot("");
                reload();
                return { message: "Note added" };
              },
            );
          }}
        >
          <input
            className={ui.input}
            value={jot}
            placeholder='Add a note'
            aria-label='Add a note'
            onChange={(e) => setJot(e.target.value)}
          />
          <button type='submit' className={btn("light")} disabled={pending || !jot.trim()}>
            Add
          </button>
        </form>
        {timeline === null ? (
          <p className={styles.muted}>Loading…</p>
        ) : timeline.length ? (
          <ol className={styles.timeline}>
            {timeline.map((t) => (
              <li key={t.id} className={styles.event}>
                <span className={styles.eventKind}>{KIND_LABEL[t.kind] ?? t.kind}</span>
                <span className={styles.eventText}>{t.text}</span>
                <span className={styles.eventWhen}>
                  {fmtDate(t.at)}, {fmtTime(t.at)}
                  {t.by ? ` · ${t.by.split(" ")[0]}` : ""}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.muted}>Nothing yet.</p>
        )}
      </section>
    </div>
  );
}

function Input({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className={ui.field}>
      <span className={ui.label}>{label}</span>
      <input className={ui.input} name={name} defaultValue={value} />
    </label>
  );
}

function outcomeHelp(o: CallOutcome, tries: number) {
  switch (o) {
    case "NO_ANSWER":
      return tries + 1 >= 3
        ? "That's three with no answer, so they'll be parked."
        : "They'll come up again in 2 days.";
    case "VOICEMAIL":
      return "They'll come up again in 3 days.";
    case "CALLBACK":
      return "They'll be at the top of your list then.";
    case "INTERESTED":
      return "Send the trial link below, and they'll come up again for a follow-up.";
    case "NOT_INTERESTED":
      return "Moved to Not interested. They'll come up again in 90 days.";
    case "WRONG_NUMBER":
      return "Parked until you add the right number.";
    case "DO_NOT_CALL":
      return "They won't come up again, and the call button is turned off.";
  }
}
