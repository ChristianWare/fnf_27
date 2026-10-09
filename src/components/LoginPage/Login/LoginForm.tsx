"use client";

import { useActionState, useState } from "react";
import styles from "./Login.module.css";
import { signIn, type SignInState } from "@/app/login/actions";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";
const EMAIL = "hello@fontsandfooters.com";
// SAMPLE: shown while the sample accounts exist. Remove with them.
const SAMPLE_PASSWORD = "fonts2026";

type Sample = { email: string; name: string; label: string };

export default function LoginForm({
  next,
  samples,
}: {
  next?: string;
  samples: Sample[];
}) {
  const [state, action, pending] = useActionState<SignInState, FormData>(
    signIn,
    {},
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  const fillSample = (sample: Sample) => {
    setEmail(sample.email);
    setPassword(SAMPLE_PASSWORD);
  };

  return (
    <>
      <form action={action} className={styles.form} noValidate>
        {next && <input type='hidden' name='next' value={next} />}

        <label className={styles.field}>
          <span className={styles.label}>Email</span>
          <input
            className={styles.input}
            type='email'
            name='email'
            autoComplete='email'
            placeholder='you@company.com'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Password</span>
          <span className={styles.passwordWrap}>
            <input
              className={styles.input}
              type={show ? "text" : "password"}
              name='password'
              autoComplete='current-password'
              placeholder='Your password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type='button'
              className={styles.eye}
              onClick={() => setShow((value) => !value)}
              aria-label={show ? "Hide password" : "Show password"}
              aria-pressed={show}
            >
              {show ? (
                <svg viewBox='0 0 24 24' aria-hidden='true'>
                  <path d='M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.2A9.6 9.6 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.6 3.7M6.5 6.6C4.5 8 3.2 10 2 12c1 2.5 5 7 10 7 1.6 0 3-.4 4.3-1' />
                </svg>
              ) : (
                <svg viewBox='0 0 24 24' aria-hidden='true'>
                  <path d='M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12Z' />
                  <circle cx='12' cy='12' r='3' />
                </svg>
              )}
            </button>
          </span>
        </label>

        {state.error && (
          <p className={styles.error} role='alert'>
            {state.error}
          </p>
        )}

        <button type='submit' className={styles.submit} disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
          <svg viewBox='0 0 24 24' aria-hidden='true'>
            <path d='M5 12h14m-6-6 6 6-6 6' />
          </svg>
        </button>

        <p className={styles.small}>
          Forgot your password?{" "}
          <a href={`mailto:${EMAIL}?subject=Dashboard%20password`}>Email us</a>.
          Not a client yet?{" "}
          <a href={CALENDAR} target='_blank' rel='noopener noreferrer'>
            Book a call
          </a>
          .
        </p>
      </form>

      {samples.length > 0 && (
        <div className={styles.samples}>
          <div className={styles.samplesHead}>
            <span className={styles.mono}>Sample accounts</span>
            <p>
              Password for every account: <strong>{SAMPLE_PASSWORD}</strong>
            </p>
          </div>
          <ul className={styles.sampleList}>
            {samples.map((sample) => (
              <li key={sample.email} className={styles.sample}>
                <div className={styles.sampleText}>
                  <span className={styles.sampleLabel}>{sample.label}</span>
                  <p>{sample.email}</p>
                </div>
                <button
                  type='button'
                  className={styles.use}
                  onClick={() => fillSample(sample)}
                  aria-label={`Use the ${sample.label} sample account`}
                >
                  Use
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
