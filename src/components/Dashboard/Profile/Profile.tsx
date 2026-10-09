"use client";

import { useState, type FormEvent } from "react";
import Icon from "../icons";
import { ui } from "../ui/ui";
import { useAction } from "../useAction";
import styles from "./Profile.module.css";
import { signOut } from "@/app/login/actions";
import {
  changePassword as savePassword,
  saveProfile,
  setEmailPreference,
} from "@/app/dashboard/actions";

type Details = {
  name: string;
  email: string;
  phone: string;
  role: string;
  business: string;
  city: string;
  domain?: string;
};

export default function Profile({
  initial,
  leads,
  emails,
  pendingEmail: pendingAtStart,
}: {
  initial: Details;
  leads: boolean;
  /** Which emails they get. Missing means on. */
  emails: Record<string, boolean>;
  /** A new address waiting for them to confirm it. */
  pendingEmail?: string;
}) {
  const { run, pending } = useAction();
  const [details, setDetails] = useState(initial);
  const [pendingEmail, setPendingEmail] = useState(pendingAtStart);
  const [password, setPassword] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [passwordMsg, setPasswordMsg] = useState<{ text: string } | null>(null);
  const [notify, setNotify] = useState({
    replies: emails.replies !== false,
    changes: emails.changes !== false,
    invoices: emails.invoices !== false,
    digest: emails.digest !== false,
  });

  const edit = (key: keyof Details, value: string) =>
    setDetails((d) => ({ ...d, [key]: value }));

  const save = (part: "you" | "business") => (e: FormEvent) => {
    e.preventDefault();
    run(
      () => saveProfile(part, details),
      (data) => {
        if (data?.pendingEmail) {
          setPendingEmail(data.pendingEmail);
          setDetails((d) => ({ ...d, email: initial.email }));
          return {
            message: `Check ${data.pendingEmail}`,
            detail:
              "Click the link we sent to confirm your new email. Until then, sign in with your current one.",
          };
        }
        return {
          message:
            part === "you"
              ? "Your details are saved"
              : "Business details saved",
        };
      },
    );
  };

  const changePassword = (e: FormEvent) => {
    e.preventDefault();
    if (!password.current) {
      setPasswordMsg({ text: "Enter your current password." });
    } else if (password.next.length < 8) {
      setPasswordMsg({ text: "Use at least 8 characters." });
    } else if (password.next !== password.confirm) {
      setPasswordMsg({ text: "The new passwords don't match." });
    } else {
      setPasswordMsg(null);
      run(
        () => savePassword(password.current, password.next),
        () => {
          setPassword({ current: "", next: "", confirm: "" });
          return {
            message: "Password updated",
            detail:
              "Use it the next time you sign in. Any other devices are signed out.",
          };
        },
        (error) => setPasswordMsg({ text: error }),
      );
    }
  };

  const toggles: { key: keyof typeof notify; label: string; text: string }[] = [
    {
      key: "replies",
      label: "Replies to my messages",
      text: "When Chris answers you in Support.",
    },
    {
      key: "changes",
      label: "Change requests",
      text: "When a request is picked up and when it's done.",
    },
    {
      key: "invoices",
      label: "Invoices and receipts",
      text: "A PDF invoice each time a payment goes through.",
    },
    ...(leads
      ? [
          {
            key: "digest" as const,
            label: "Leads digest",
            text: "Fresh leads, every morning at 6am.",
          },
        ]
      : []),
  ];

  return (
    <div className={styles.grid}>
      <form className={styles.panel} onSubmit={save("you")}>
        <h2 className={styles.heading}>You</h2>
        <div className={styles.fields}>
          <label className={ui.field}>
            <span className={ui.label}>Name</span>
            <input
              className={ui.input}
              value={details.name}
              onChange={(e) => edit("name", e.target.value)}
              autoComplete='name'
            />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Role</span>
            <input
              className={ui.input}
              value={details.role}
              onChange={(e) => edit("role", e.target.value)}
            />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Email</span>
            <input
              className={ui.input}
              type='email'
              value={details.email}
              onChange={(e) => edit("email", e.target.value)}
              autoComplete='email'
            />
            {pendingEmail && (
              <p className={ui.help}>
                Waiting for you to confirm {pendingEmail}: check that inbox for
                our link.
              </p>
            )}
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Phone</span>
            <input
              className={ui.input}
              type='tel'
              value={details.phone}
              onChange={(e) => edit("phone", e.target.value)}
              autoComplete='tel'
            />
          </label>
        </div>
        <div className={styles.actions}>
          <button type='submit' className={`${ui.btn} ${ui.btn_black}`}>
            Save
          </button>
        </div>
      </form>

      <form className={styles.panel} onSubmit={save("business")}>
        <h2 className={styles.heading}>Your business</h2>
        <div className={styles.fields}>
          <label className={ui.field}>
            <span className={ui.label}>Business name</span>
            <input
              className={ui.input}
              value={details.business}
              onChange={(e) => edit("business", e.target.value)}
              autoComplete='organization'
            />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>City</span>
            <input
              className={ui.input}
              value={details.city}
              onChange={(e) => edit("city", e.target.value)}
            />
          </label>
          {details.domain && (
            <label className={`${ui.field} ${styles.wide}`}>
              <span className={ui.label}>Domain</span>
              <input className={ui.input} value={details.domain} disabled />
              <p className={ui.help}>
                Moving your domain? Message us first, so your site and email
                stay up.
              </p>
            </label>
          )}
        </div>
        <div className={styles.actions}>
          <button type='submit' className={`${ui.btn} ${ui.btn_black}`}>
            Save
          </button>
        </div>
      </form>

      <form className={styles.panel} onSubmit={changePassword}>
        <h2 className={styles.heading}>Password</h2>
        <div className={styles.fields}>
          <label className={`${ui.field} ${styles.wide}`}>
            <span className={ui.label}>Current password</span>
            <input
              className={ui.input}
              type='password'
              value={password.current}
              onChange={(e) =>
                setPassword((p) => ({ ...p, current: e.target.value }))
              }
              autoComplete='current-password'
            />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>New password</span>
            <input
              className={ui.input}
              type='password'
              value={password.next}
              onChange={(e) =>
                setPassword((p) => ({ ...p, next: e.target.value }))
              }
              autoComplete='new-password'
            />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>New password, again</span>
            <input
              className={ui.input}
              type='password'
              value={password.confirm}
              onChange={(e) =>
                setPassword((p) => ({ ...p, confirm: e.target.value }))
              }
              autoComplete='new-password'
            />
          </label>
        </div>
        <div className={styles.actions}>
          {passwordMsg && (
            <p className={styles.error} role='alert'>
              {passwordMsg.text}
            </p>
          )}
          <button
            type='submit'
            className={`${ui.btn} ${ui.btn_black}`}
            disabled={pending}
          >
            Update password
          </button>
        </div>
      </form>

      <section id='emails' className={styles.panel}>
        <h2 className={styles.heading}>Email me about</h2>
        <ul className={styles.toggles}>
          {toggles.map((toggle) => (
            <li key={toggle.key} className={styles.toggle}>
              <span className={styles.toggleText}>
                <span className={styles.toggleLabel}>{toggle.label}</span>
                <p>{toggle.text}</p>
              </span>
              <button
                type='button'
                role='switch'
                aria-checked={notify[toggle.key]}
                aria-label={toggle.label}
                className={ui.switch}
                onClick={() => {
                  const on = !notify[toggle.key];
                  setNotify((n) => ({ ...n, [toggle.key]: on }));
                  run(
                    () => setEmailPreference(toggle.key, on),
                    () => ({
                      message: on
                        ? `You'll get emails about ${toggle.label.toLowerCase()}`
                        : `No more emails about ${toggle.label.toLowerCase()}`,
                      tone: "info",
                    }),
                    () => setNotify((n) => ({ ...n, [toggle.key]: !on })),
                  );
                }}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className={`${styles.panel} ${styles.signOutPanel}`}>
        <div className={styles.signOutText}>
          <h2 className={styles.heading}>Sign out</h2>
          <p>
            Signs you out on this device. You&apos;ll stay signed in for 7 days
            otherwise.
          </p>
        </div>
        <form action={signOut}>
          <button type='submit' className={`${ui.btn} ${ui.btn_outline}`}>
            Sign out
            <Icon name='logout' className={ui.btnIcon} />
          </button>
        </form>
      </section>
    </div>
  );
}
