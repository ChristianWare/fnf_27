"use client";

// Asking for the full report: a name and an email, and the report opens on
// the page and goes to their inbox as a PDF. The same quiet bot checks as
// the other public forms.

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/shared/Button/Button";
import { STAMP_FIELD, TRAP_FIELD } from "@/lib/forms/fields";
import { track } from "@/lib/analytics";
import { emailFullReport } from "@/app/audit/actions";
import styles from "./AuditReport.module.css";

const inside = [
  "What we found on every check, and the fix for each",
  "You against the top operators near you",
  "The searches riders make in your city, and where you show up",
];
const PHONE = "Your homepage as riders see it on a phone";

export default function FullReportForm({
  id,
  stamp,
  hasSite,
}: {
  id: string;
  stamp: string;
  hasSite: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<{
    field?: "name" | "email";
    text: string;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError({ field: "name", text: "Enter your name." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError({
        field: "email",
        text: "Enter the email address to send the report to.",
      });
      return;
    }
    setError(null);
    setSending(true);
    try {
      const result = await emailFullReport(
        id,
        new FormData(event.currentTarget),
      );
      if (!result.ok) {
        setError({ field: result.field, text: result.error });
        router.refresh();
        return;
      }
      setSent(true);
      track("Audit report");
      router.refresh();
    } catch {
      setError({
        text: "That didn't send. Check your connection and try again.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.unlock} id='full-report'>
      <div className={styles.unlockText}>
        <span className={styles.label}>The full report</span>
        <h2 className={styles.unlockHeading}>
          Every check, every fix, and how you compare
        </h2>
        <ul className={styles.unlockList}>
          {(hasSite ? [...inside, PHONE] : inside).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {sent ? (
        <p className={styles.unlockSent} role='status'>
          On its way to {email.trim()}. The full report is opening below.
        </p>
      ) : (
        <form className={styles.unlockForm} onSubmit={onSubmit} noValidate>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Your name*</span>
            <input
              className={styles.input}
              type='text'
              name='name'
              autoComplete='name'
              placeholder='Enter your name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={error?.field === "name" ? true : undefined}
              disabled={sending}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Email address*</span>
            <input
              className={styles.input}
              type='email'
              name='email'
              inputMode='email'
              autoComplete='email'
              placeholder='you@yourcompany.com'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error?.field === "email" ? true : undefined}
              disabled={sending}
            />
          </label>
          <div className={styles.srOnly} aria-hidden='true'>
            <label>
              Leave this empty
              <input
                type='text'
                name={TRAP_FIELD}
                tabIndex={-1}
                autoComplete='off'
                defaultValue=''
              />
            </label>
          </div>
          <input type='hidden' name={STAMP_FIELD} value={stamp} />
          {error && (
            <p className={styles.error} role='alert'>
              {error.text}
            </p>
          )}
          <div className={styles.submit}>
            <Button
              type='submit'
              btnType='black'
              text={
                sending ? "Sending your report…" : "Email me the full report"
              }
              disabled={sending}
              arrow
            />
          </div>
          <p className={styles.unlockNote}>
            It comes as a PDF you can forward, and opens on this page too. I
            read every audit that comes through. No pitch if it&apos;s not a
            fit.
          </p>
        </form>
      )}
    </div>
  );
}
