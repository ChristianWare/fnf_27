"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import styles from "./Login.module.css";
import Turnstile from "@/components/shared/Turnstile/Turnstile";
import { STAMP_FIELD, TRAP_FIELD } from "@/lib/forms/fields";
import { register, type RegisterState } from "@/app/login/actions";
import { Field, PasswordField } from "./Fields";

export type PlanCard = {
  id: "FULL_PLATFORM" | "WEBSITE_ONLY" | "LEADS";
  name: string;
  price: string;
  note: string;
  blurb: string;
};

export default function RegisterForm({
  plans,
  initialPlan,
  siteKey,
  stamp,
}: {
  plans: PlanCard[];
  initialPlan?: PlanCard["id"];
  siteKey?: string;
  /** When the form was drawn, signed: a bot posts in under a second. */
  stamp: string;
}) {
  const [state, action, pending] = useActionState<RegisterState, FormData>(
    register,
    {},
  );
  const [attempts, setAttempts] = useState(0);
  const v = state.values ?? {};
  const [plan, setPlan] = useState<PlanCard["id"]>(
    (v.plan as PlanCard["id"]) || initialPlan || "FULL_PLATFORM",
  );

  return (
    <form
      action={(data) => {
        setAttempts((n) => n + 1);
        return action(data);
      }}
      className={styles.form}
      noValidate
    >
      <fieldset className={styles.planSet}>
        <legend className={styles.label}>What would you like?</legend>
        <div className={styles.planPick}>
          {plans.map((p) => (
            <label
              key={p.id}
              className={`${styles.planCard} ${plan === p.id ? styles.planOn : ""}`}
            >
              <input
                type='radio'
                name='plan'
                value={p.id}
                checked={plan === p.id}
                onChange={() => setPlan(p.id)}
                className={styles.srOnly}
              />
              <span className={styles.planTop}>
                <span className={styles.planName}>{p.name}</span>
                <span className={styles.planRadio} aria-hidden='true' />
              </span>
              <span className={styles.planPrice}>{p.price}</span>
              <span className={styles.planNote}>{p.note}</span>
              <p>{p.blurb}</p>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.row2}>
        <Field
          label='Your name'
          name='name'
          autoComplete='name'
          defaultValue={v.name}
          required
        />
        <Field
          label='Business name'
          name='business'
          autoComplete='organization'
          defaultValue={v.business}
          required
        />
      </div>
      <div className={styles.row2}>
        <Field
          label='Email'
          type='email'
          name='email'
          autoComplete='email'
          placeholder='you@company.com'
          defaultValue={v.email}
          required
        />
        <Field
          label='Phone'
          type='tel'
          name='phone'
          autoComplete='tel'
          placeholder='Optional'
          defaultValue={v.phone}
        />
      </div>
      <div className={styles.row2}>
        <Field
          label='City'
          name='city'
          autoComplete='address-level2'
          placeholder='e.g. Scottsdale, AZ'
          defaultValue={v.city}
          required
        />
        <Field
          label='Your website'
          name='website'
          autoComplete='url'
          placeholder='Optional'
          defaultValue={v.website}
        />
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Anything we should know?</span>
        <textarea
          className={styles.textarea}
          name='message'
          placeholder='Your fleet, the rides you want more of, the software you use today…'
          defaultValue={v.message}
        />
      </label>

      <PasswordField
        label='Choose a password'
        name='password'
        autoComplete='new-password'
        placeholder='At least 8 characters'
        minLength={8}
      />

      {/* For bots only: a person never sees this field, so a value in it
          means a bot filled the form. */}
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

      <Turnstile
        siteKey={siteKey}
        resetKey={state.error ? attempts : 0}
        className={styles.turnstile}
      />

      {state.error && (
        <p className={styles.error} role='alert'>
          {state.error}
        </p>
      )}

      <button type='submit' className={styles.submit} disabled={pending}>
        {pending ? "Creating your account…" : "Create my account"}
        <svg viewBox='0 0 24 24' aria-hidden='true'>
          <path d='M5 12h14m-6-6 6 6-6 6' />
        </svg>
      </button>

      <p className={styles.small}>
        By signing up you agree to our <Link href='/terms'>Terms</Link> and{" "}
        <Link href='/privacy'>Privacy policy</Link>. Already have an account?{" "}
        <Link href='/login'>Sign in</Link>.
      </p>
    </form>
  );
}
