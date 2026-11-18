"use client";

// A prospect's preview (their demo site), on their page. Before one is
// made: what it is and "Make a preview". After: the link and the text to
// send them, whether they've opened it and what they did, the logins for
// a walkthrough, and how long it has left, with Extend and Delete.
//
// Links you open from here add ?ff=owner, so your own visits never count
// as theirs.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel, Pill, ButtonLink, Notice, btn } from "@/components/Dashboard/ui/ui";
import Icon from "@/components/Dashboard/icons";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { useAction } from "@/components/Dashboard/useAction";
import ConfirmDialog from "@/components/Dashboard/ConfirmDialog/ConfirmDialog";
import { daysBetween, fmtAgo, fmtDate, fmtTime } from "@/lib/dashboard/format";
import type { ProspectView } from "@/lib/prospects/view";
import { ownerUrl, previewText, type PreviewView } from "@/lib/demos/preview";
import { deletePreview, extendPreview } from "@/app/admin/demos/actions";
import { STATUS_LABEL, statusTone } from "./status";
import styles from "./Previews.module.css";

export default function PreviewPanel({
  p,
  preview,
  issue,
  now,
}: {
  p: ProspectView;
  preview: PreviewView | null;
  /** Why their preview couldn't be loaded (the platform is down or not set up). */
  issue?: string | null;
  now: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const { run, pending } = useAction();
  const [asking, setAsking] = useState(false);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${what} copied`);
    } catch {
      toast("Couldn't copy. Select it and copy instead.", { tone: "error" });
    }
  };

  const makeButton = (
    <ButtonLink href={`/admin/prospects/${p.id}/preview`} icon='sparkle'>
      {preview ? "Make a new one" : "Make a preview"}
    </ButtonLink>
  );

  if (!preview || !preview.live) {
    return (
      <Panel
        title='Their preview'
        text={`A working copy of a black car site made for ${p.business}: booking, payments, and an admin they can log into. Live for 30 days.`}
        action={makeButton}
      >
        {issue && <Notice>{issue}</Notice>}
        {preview && !preview.live && (
          <p className={styles.muted}>
            Their last preview ended {fmtDate(preview.expiresAt)}, after{" "}
            {preview.views ? `${preview.views} visit${preview.views === 1 ? "" : "s"}` : "no visits"}.
          </p>
        )}
        <ul className={styles.steps}>
          <li>
            <span className={styles.stepNum}>1</span>
            Pick their market and photos. Their name and phone are filled in
            from here.
          </li>
          <li>
            <span className={styles.stepNum}>2</span>
            Text them the link from your phone.
          </li>
          <li>
            <span className={styles.stepNum}>3</span>
            See here when they open it and what they look at.
          </li>
        </ul>
      </Panel>
    );
  }

  const daysLeft = Math.max(0, daysBetween(now, preview.expiresAt));
  const host = preview.url.replace(/^https:\/\//, "");
  const message = previewText({ ...p, url: preview.url });
  const digits = p.phone.replace(/\D/g, "");

  const extend = () =>
    run(
      () => extendPreview(preview.id, 14),
      () => {
        router.refresh();
        return { message: "14 more days added" };
      },
    );

  const remove = () =>
    run(
      () => deletePreview(preview.id),
      () => {
        setAsking(false);
        router.refresh();
        return { message: "Preview deleted", detail: "Its address now shows that it has ended." };
      },
    );

  return (
    <Panel
      title='Their preview'
      action={
        <Pill tone={statusTone[preview.status]} dot>
          {STATUS_LABEL[preview.status]}
        </Pill>
      }
    >
      {issue && <Notice>{issue}</Notice>}

      <div className={styles.linkBox}>
        <span className={styles.linkText}>{host}</span>
        <div className={styles.linkActions}>
          <button type='button' className={btn("light", true)} onClick={() => copy(preview.url, "Link")}>
            <Icon name='copy' className={styles.btnIcon} />
            Copy link
          </button>
          <a
            href={ownerUrl(preview.url)}
            target='_blank'
            rel='noopener noreferrer'
            className={btn("light", true)}
          >
            Open
            <Icon name='arrowUpRight' className={styles.btnIcon} />
          </a>
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
        <p className={styles.message}>{message}</p>
        <div className={styles.row}>
          {digits && (
            <a href={`sms:${digits}?&body=${encodeURIComponent(message)}`} className={btn("black")}>
              <Icon name='message' className={styles.btnIcon} />
              Text from my phone
            </a>
          )}
          <button type='button' className={btn("light")} onClick={() => copy(message, "Text")}>
            <Icon name='copy' className={styles.btnIcon} />
            Copy text
          </button>
        </div>
      </div>

      <div className={styles.block}>
        <h3 className={styles.blockTitle}>What they did</h3>
        {preview.events.length ? (
          <ol className={styles.events}>
            {preview.events.map((e, i) => (
              <li key={`${e.at}-${i}`} className={styles.eventRow}>
                <span className={styles.eventDot} aria-hidden='true' />
                <span className={styles.eventText}>{e.text}</span>
                <span className={styles.eventWhen}>
                  {fmtDate(e.at)}, {fmtTime(e.at)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.muted}>Not opened yet. Their visits show here as they happen.</p>
        )}
      </div>

      <div className={styles.block}>
        <h3 className={styles.blockTitle}>Logins for the walkthrough</h3>
        <p className={styles.muted}>
          One password for all three:{" "}
          <button type='button' className={styles.inlineCopy} onClick={() => copy(preview.logins.password, "Password")}>
            <span className={styles.secret}>{preview.logins.password}</span>
            <Icon name='copy' className={styles.btnIcon} />
          </button>
        </p>
        <ul className={styles.logins}>
          {(
            [
              ["Admin", "Their dashboard: bookings, dispatch, payments", preview.logins.admin],
              ["Driver", "The driver's app: today's trips", preview.logins.driver],
              ["Rider", "A customer account: book and pay", preview.logins.rider],
            ] as const
          ).map(([who, what, email]) => (
            <li key={who} className={styles.login}>
              <span className={styles.loginWho}>{who}</span>
              <span className={styles.loginWhat}>
                {what}
                <button type='button' className={styles.inlineCopy} onClick={() => copy(email, "Email")}>
                  <span className={styles.loginEmail}>{email}</span>
                  <Icon name='copy' className={styles.btnIcon} />
                </button>
              </span>
              <a
                href={ownerUrl(preview.url, "/login")}
                target='_blank'
                rel='noopener noreferrer'
                className={btn("light", true)}
              >
                Log in
                <Icon name='arrowUpRight' className={styles.btnIcon} />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.footRow}>
        <button type='button' className={btn("light")} onClick={extend} disabled={pending}>
          <Icon name='clock' className={styles.btnIcon} />
          Extend 14 days
        </button>
        <button
          type='button'
          className={`${btn("outline")} ${styles.danger}`}
          onClick={() => setAsking(true)}
          disabled={pending}
        >
          <Icon name='trash' className={styles.btnIcon} />
          Delete now
        </button>
      </div>

      <ConfirmDialog
        open={asking}
        tone='danger'
        icon='trash'
        title={`Delete the preview for ${p.business}?`}
        text="Its bookings, logins and photos are deleted, and the link shows that the preview has ended. This can't be undone."
        confirmLabel='Delete'
        cancelLabel='Keep it'
        pendingLabel='Deleting…'
        pending={pending}
        onConfirm={remove}
        onClose={() => setAsking(false)}
      />
    </Panel>
  );
}
