"use client";

// A prospect's preview (their demo site), on their page. Before one is
// made: what it is and "Make a preview". After: the link and the text to
// send them, whether they've opened it and what they did, the logins for
// a walkthrough, and how long it has left.
//
// Screens only for now: previews aren't built yet, so the one shown is a
// sample and its buttons just say so.

import { Panel, Pill, ButtonLink, Notice, btn } from "@/components/Dashboard/ui/ui";
import Icon from "@/components/Dashboard/icons";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { daysBetween, fmtAgo, fmtDate, fmtTime } from "@/lib/dashboard/format";
import type { ProspectView } from "@/lib/prospects/view";
import { previewText, type PreviewView } from "@/lib/demos/sample";
import { STATUS_LABEL, statusTone } from "./status";
import styles from "./Previews.module.css";

export default function PreviewPanel({
  p,
  preview,
  now,
}: {
  p: ProspectView;
  preview: PreviewView | null;
  now: string;
}) {
  const toast = useToast();
  const notYet = () =>
    toast("Not live yet", {
      detail: "Previews are screens only for now. This is how it will work.",
    });

  if (!preview) {
    return (
      <Panel
        title='Their preview'
        text={`A working copy of a black car site made for ${p.business}: booking, payments, and an admin they can log into. Live for 30 days.`}
        action={
          <ButtonLink href={`/admin/prospects/${p.id}/preview`} icon='sparkle'>
            Make a preview
          </ButtonLink>
        }
      >
        <ul className={styles.steps}>
          <li>
            <span className={styles.stepNum}>1</span>
            Pick their market, services and vehicles. Their name and phone are
            filled in from here.
          </li>
          <li>
            <span className={styles.stepNum}>2</span>
            Text them the link from your phone.
          </li>
          <li>
            <span className={styles.stepNum}>3</span>
            You get an email when they open it, and see what they did here.
          </li>
        </ul>
      </Panel>
    );
  }

  const daysLeft = Math.max(0, daysBetween(now, preview.expiresAt));
  const host = preview.url.replace(/^https:\/\//, "");

  return (
    <Panel
      title='Their preview'
      action={
        <Pill tone={statusTone[preview.status]} dot>
          {STATUS_LABEL[preview.status]}
        </Pill>
      }
    >
      <Notice>Sample. This is how their preview will look here once previews are built.</Notice>

      <div className={styles.linkBox}>
        <span className={styles.linkText}>{host}</span>
        <div className={styles.linkActions}>
          <button type='button' className={btn("light", true)} onClick={notYet}>
            <Icon name='copy' className={styles.btnIcon} />
            Copy link
          </button>
          <button type='button' className={btn("light", true)} onClick={notYet}>
            Open
            <Icon name='arrowUpRight' className={styles.btnIcon} />
          </button>
        </div>
      </div>

      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>Made</dt>
          <dd>{fmtDate(preview.createdAt)}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Opened</dt>
          <dd>
            {preview.views ? `${preview.views} time${preview.views === 1 ? "" : "s"}` : "Not yet"}
          </dd>
        </div>
        <div className={styles.stat}>
          <dt>Last seen</dt>
          <dd>{preview.lastSeenAt ? fmtAgo(preview.lastSeenAt, now) : "—"}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Days left</dt>
          <dd className={daysLeft <= 5 ? styles.soon : undefined}>
            {daysLeft} <span className={styles.statNote}>until {fmtDate(preview.expiresAt)}</span>
          </dd>
        </div>
      </dl>

      <div className={styles.block}>
        <h3 className={styles.blockTitle}>Send it</h3>
        <p className={styles.message}>{previewText({ ...p, url: preview.url })}</p>
        <div className={styles.row}>
          {p.phone && (
            <button type='button' className={btn("black")} onClick={notYet}>
              <Icon name='message' className={styles.btnIcon} />
              Text from my phone
            </button>
          )}
          <button type='button' className={btn("light")} onClick={notYet}>
            <Icon name='copy' className={styles.btnIcon} />
            Copy text
          </button>
        </div>
      </div>

      <div className={styles.block}>
        <h3 className={styles.blockTitle}>What they did</h3>
        {preview.events.length ? (
          <ol className={styles.events}>
            {preview.events.map((e) => (
              <li key={`${e.at}-${e.text}`} className={styles.eventRow}>
                <span className={styles.eventDot} aria-hidden='true' />
                <span className={styles.eventText}>{e.text}</span>
                <span className={styles.eventWhen}>
                  {fmtDate(e.at)}, {fmtTime(e.at)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.muted}>Not opened yet. You&apos;ll get an email the moment they do.</p>
        )}
      </div>

      <div className={styles.block}>
        <h3 className={styles.blockTitle}>Logins for the walkthrough</h3>
        <ul className={styles.logins}>
          {[
            ["Admin", "Their dashboard: bookings, dispatch, payments"],
            ["Driver", "The driver's app: today's trips"],
            ["Rider", "A customer account: book and pay"],
          ].map(([who, what]) => (
            <li key={who} className={styles.login}>
              <span className={styles.loginWho}>{who}</span>
              <span className={styles.loginWhat}>{what}</span>
              <button type='button' className={btn("light", true)} onClick={notYet}>
                Log in as {who.toLowerCase()}
                <Icon name='arrowUpRight' className={styles.btnIcon} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.footRow}>
        <button type='button' className={btn("light")} onClick={notYet}>
          <Icon name='clock' className={styles.btnIcon} />
          Extend 14 days
        </button>
        <button type='button' className={`${btn("outline")} ${styles.danger}`} onClick={notYet}>
          <Icon name='trash' className={styles.btnIcon} />
          Delete now
        </button>
      </div>
    </Panel>
  );
}
