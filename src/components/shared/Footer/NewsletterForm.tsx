"use client";

// The footer's "One email a month" sign-up. It adds the email to the
// Mailchimp list (joinNewsletter), and Mailchimp sends a confirmation
// email first. The footer only shows this when Mailchimp is set up; see
// lib/server/mailchimp.ts.

import { useState, type FormEvent } from "react";
import styles from "./Footer.module.css";
import Arrow from "../icons/Arrow/Arrow";
import { TRAP_FIELD } from "@/lib/forms/fields";
import { track } from "@/lib/analytics";
import { joinNewsletter } from "./actions";

export default function NewsletterForm() {
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);
  const [sending, setSending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSending(true);
    try {
      const result = await joinNewsletter(new FormData(form));
      setNote({ text: result.message, ok: result.ok });
      if (result.ok) form.reset();
      if (result.joined) track("Newsletter");
    } catch {
      setNote({
        text: "That didn't go through. Check your connection and try again.",
        ok: false,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <input
          type='email'
          name='email'
          inputMode='email'
          autoComplete='email'
          placeholder='Your email address'
          aria-label='Email address'
          className={styles.input}
          disabled={sending}
        />
        {/* For bots only: a person never sees this field. */}
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
        <button
          type='submit'
          className={styles.submit}
          aria-label='Subscribe'
          disabled={sending}
        >
          <Arrow className={styles.submitArrow} aria-hidden='true' />
        </button>
      </form>
      {note && (
        <p className={styles.formNote} role={note.ok ? "status" : "alert"}>
          {note.text}
        </p>
      )}
    </>
  );
}
