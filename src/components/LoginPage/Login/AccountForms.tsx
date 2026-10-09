"use client";

// The small account forms: forgot password, a new password (from a reset
// or an invite link), and sending the confirm-your-email link again.

import Link from "next/link";
import { useActionState } from "react";
import styles from "./Login.module.css";
import {
  forgotPassword,
  resendVerification,
  setNewPassword,
  type ForgotState,
  type PasswordState,
  type ResendState,
} from "@/app/login/actions";
import { Field, PasswordField } from "./Fields";

const Arrow = () => (
  <svg viewBox='0 0 24 24' aria-hidden='true'>
    <path d='M5 12h14m-6-6 6 6-6 6' />
  </svg>
);

export function ForgotForm({ email = "" }: { email?: string }) {
  const [state, action, pending] = useActionState<ForgotState, FormData>(
    forgotPassword,
    {},
  );

  if (state.sent) {
    return (
      <div className={styles.form}>
        <p className={styles.notice} role='status'>
          If there&apos;s an account for {state.email}, a link to choose a new
          password is on its way. It works for one hour.
        </p>
        <p className={styles.small}>
          Nothing after a few minutes? Check your spam folder, or{" "}
          <Link href='/forgot-password'>try another email</Link>.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className={styles.form} noValidate>
      <Field
        label='Email'
        type='email'
        name='email'
        autoComplete='email'
        placeholder='you@company.com'
        defaultValue={state.email ?? email}
        required
      />
      {state.error && (
        <p className={styles.error} role='alert'>
          {state.error}
        </p>
      )}
      <button type='submit' className={styles.submit} disabled={pending}>
        {pending ? "Sending…" : "Email me a link"}
        <Arrow />
      </button>
      <p className={styles.small}>
        Remembered it? <Link href='/login'>Sign in</Link>.
      </p>
    </form>
  );
}

export function PasswordForm({
  token,
  kind,
}: {
  token: string;
  kind: "reset" | "invite";
}) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(
    setNewPassword,
    {},
  );

  return (
    <form action={action} className={styles.form} noValidate>
      <input type='hidden' name='token' value={token} />
      <PasswordField
        label={kind === "invite" ? "Choose a password" : "New password"}
        name='password'
        autoComplete='new-password'
        placeholder='At least 8 characters'
        minLength={8}
      />
      <PasswordField
        label='The same again'
        name='confirm'
        autoComplete='new-password'
        placeholder='Type it once more'
        minLength={8}
      />
      {state.error && (
        <div className={styles.error} role='alert'>
          <p>{state.error}</p>
          {/expired/.test(state.error) && (
            <Link href='/forgot-password' className={styles.inlineBtn}>
              Send me a new link
            </Link>
          )}
        </div>
      )}
      <button type='submit' className={styles.submit} disabled={pending}>
        {pending
          ? "Saving…"
          : kind === "invite"
            ? "Set password and sign in"
            : "Save and sign in"}
        <Arrow />
      </button>
    </form>
  );
}

export function ResendForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<ResendState, FormData>(
    resendVerification,
    {},
  );
  return (
    <form action={action} className={styles.form}>
      <input type='hidden' name='email' value={email} />
      {state.sent && (
        <p className={styles.notice} role='status'>
          Sent again. Give it a minute, and check your spam folder too.
        </p>
      )}
      {state.error && (
        <p className={styles.error} role='alert'>
          {state.error}
        </p>
      )}
      <button
        type='submit'
        className={`${styles.submit} ${styles.submitLight}`}
        disabled={pending || state.sent}
      >
        {pending ? "Sending…" : "Send the link again"}
      </button>
      <p className={styles.small}>
        Wrong email? <Link href='/register'>Start again</Link>. Already
        confirmed? <Link href='/login'>Sign in</Link>.
      </p>
    </form>
  );
}
