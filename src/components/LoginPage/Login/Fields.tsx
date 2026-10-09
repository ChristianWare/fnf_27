"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import styles from "./Login.module.css";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Shown after the label, on the right. */
  extra?: ReactNode;
  help?: string;
};

export function Field({ label, extra, help, ...input }: InputProps) {
  return (
    <label className={styles.field}>
      <span className={styles.labelRow}>
        <span className={styles.label}>{label}</span>
        {extra}
      </span>
      <input className={styles.input} {...input} />
      {help && <span className={styles.help}>{help}</span>}
    </label>
  );
}

export function PasswordField({ label, extra, help, ...input }: InputProps) {
  const [show, setShow] = useState(false);
  return (
    <div className={styles.field}>
      <span className={styles.labelRow}>
        <label className={styles.label} htmlFor={input.id ?? input.name}>
          {label}
        </label>
        {extra}
      </span>
      <span className={styles.passwordWrap}>
        <input
          id={input.id ?? input.name}
          className={styles.input}
          type={show ? "text" : "password"}
          required
          {...input}
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
      {help && <span className={styles.help}>{help}</span>}
    </div>
  );
}
