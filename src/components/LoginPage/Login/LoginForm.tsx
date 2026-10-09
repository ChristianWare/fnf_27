"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import styles from "./Login.module.css";
import {
  resendVerification,
  signIn,
  type ResendState,
  type SignInState,
} from "@/app/login/actions";
import { Field, PasswordField } from "./Fields";

export default function LoginForm({
  next,
  email: initialEmail = "",
  notice,
}: {
  next?: string;
  email?: string;
  notice?: { tone: "good" | "bad"; text: string };
}) {
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signIn,
    {},
  );
  const [resent, resend, resending] = useActionState<ResendState, FormData>(
    resendVerification,
    {},
  );
  const [email, setEmail] = useState(initialEmail);

  return (
    <form action={action} className={styles.form} noValidate>
      {next && <input type='hidden' name='next' value={next} />}

      {notice && !state.error && (
        <p
          className={notice.tone === "good" ? styles.notice : styles.error}
          role='status'
        >
          {notice.text}
        </p>
      )}

      <Field
        label='Email'
        type='email'
        name='email'
        autoComplete='email'
        placeholder='you@company.com'
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <PasswordField
        label='Password'
        name='password'
        autoComplete='current-password'
        placeholder='Your password'
        extra={
          <Link href='/forgot-password' className={styles.forgot}>
            Forgot it?
          </Link>
        }
      />

      {state.error && (
        <div className={styles.error} role='alert'>
          <p>{state.error}</p>
          {state.unverified &&
            (resent.sent ? (
              <p className={styles.errorNote}>
                Sent. Check your inbox (and spam) for a new link.
              </p>
            ) : (
              <button
                type='submit'
                formAction={resend}
                className={styles.inlineBtn}
                disabled={resending}
              >
                {resending ? "Sending…" : "Send me the link again"}
              </button>
            ))}
          {resent.error && <p className={styles.errorNote}>{resent.error}</p>}
        </div>
      )}

      <button type='submit' className={styles.submit} disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <path d='M5 12h14m-6-6 6 6-6 6' />
        </svg>
      </button>

      <p className={styles.small}>
        New to Fonts & Footers? <Link href='/register'>Create an account</Link>.
      </p>
    </form>
  );
}
