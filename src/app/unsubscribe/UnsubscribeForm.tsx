"use client";

import Link from "next/link";
import { useActionState } from "react";
import styles from "@/components/LoginPage/Login/Login.module.css";
import { confirmUnsubscribe, type UnsubscribeState } from "./actions";

export default function UnsubscribeForm({
  u,
  k,
  s,
  what,
}: {
  u: string;
  k: string;
  s: string;
  what: string;
}) {
  const [state, action, pending] = useActionState<UnsubscribeState, FormData>(
    confirmUnsubscribe,
    {},
  );
  if (state.done) {
    return (
      <div className={styles.form}>
        <p className={styles.notice} role='status'>
          Done. You won&apos;t get emails about {what} anymore.
        </p>
        <p className={styles.small}>
          Changed your mind? Turn them back on from{" "}
          <Link href='/dashboard/profile#emails'>your profile</Link>.
        </p>
      </div>
    );
  }
  return (
    <form action={action} className={styles.form}>
      <input type='hidden' name='u' value={u} />
      <input type='hidden' name='k' value={k} />
      <input type='hidden' name='s' value={s} />
      {state.error && (
        <p className={styles.error} role='alert'>
          {state.error}
        </p>
      )}
      <button type='submit' className={styles.submit} disabled={pending}>
        {pending ? "Saving…" : "Unsubscribe"}
      </button>
      <p className={styles.small}>
        Or choose exactly which emails you get from{" "}
        <Link href='/dashboard/profile#emails'>your profile</Link>.
      </p>
    </form>
  );
}
