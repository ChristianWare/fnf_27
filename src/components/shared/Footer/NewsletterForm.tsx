"use client";

import { useState, type FormEvent } from "react";
import styles from "./Footer.module.css";
import Arrow from "../icons/Arrow/Arrow";

// Paste your Mailchimp form's "action" URL here to switch the signup on.
// Until then, the form shows a short note and sends nothing.
const NEWSLETTER_ACTION = "";

export default function NewsletterForm() {
  const [note, setNote] = useState("");

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    if (NEWSLETTER_ACTION) return; // let the form post to Mailchimp
    e.preventDefault();
    setNote(
      "Signup opens soon. Email hello@fontsandfooters.com and we'll add you.",
    );
  }

  return (
    <>
      <form
        className={styles.form}
        action={NEWSLETTER_ACTION || undefined}
        method='post'
        target='_blank'
        onSubmit={onSubmit}
      >
        <input
          type='email'
          name='EMAIL'
          required
          placeholder='Your email address'
          aria-label='Email address'
          className={styles.input}
        />
        <button type='submit' className={styles.submit} aria-label='Subscribe'>
          <Arrow className={styles.submitArrow} aria-hidden='true' />
        </button>
      </form>
      {note && (
        <p className={styles.formNote} role='status'>
          {note}
        </p>
      )}
    </>
  );
}
