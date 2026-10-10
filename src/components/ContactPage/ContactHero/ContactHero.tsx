"use client";

// The contact page's hero: a photo with Barry's quote on the left, the
// form on the right. The form checks the fields, sends the message to the
// studio inbox (sendInquiry), says how it went in a toast, and shows a
// thank-you. Bots are turned away by the server; see lib/server/spam.ts.

import { useState, type FormEvent } from "react";
import Image from "next/image";
import styles from "./ContactHero.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import Turnstile from "@/components/shared/Turnstile/Turnstile";
import { ToastProvider, useToast } from "@/components/Dashboard/Toast/Toast";
import { STAMP_FIELD, TRAP_FIELD } from "@/lib/forms/fields";
import { sendInquiry } from "@/app/contact/actions";
import HeroImg from "../../../../public/images/newHero.png";
import Barry from "../../../../public/images/barry.png";

type Field = "name" | "email" | "company" | "role" | "message";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Props = {
  /** Cloudflare's site key; without one there's no box. */
  siteKey?: string;
  /** When the page was drawn, signed by the server. */
  stamp: string;
};

export default function ContactHero(props: Props) {
  return (
    <ToastProvider>
      <Hero {...props} />
    </ToastProvider>
  );
}

function Hero({ siteKey, stamp }: Props) {
  const toast = useToast();
  const [values, setValues] = useState<Record<Field, string>>({
    name: "",
    email: "",
    company: "",
    role: "",
    message: "",
  });
  const [error, setError] = useState<{ field?: Field; text: string } | null>(
    null,
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  // Counts the failed sends, so the box asks for a fresh token each time.
  const [failed, setFailed] = useState(0);

  function set(field: Field) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
  }

  const invalid = (field: Field) => error?.field === field || undefined;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!values.name.trim()) {
      setError({ field: "name", text: "Enter your name." });
      return;
    }
    if (!EMAIL_RE.test(values.email.trim())) {
      setError({ field: "email", text: "Enter a valid email address." });
      return;
    }
    if (values.message.trim().length < 10) {
      setError({
        field: "message",
        text: "Tell us a little about what you need.",
      });
      return;
    }
    setError(null);
    setSending(true);
    try {
      // Everything in the form, the hidden fields and Cloudflare's token
      // included.
      const result = await sendInquiry(new FormData(form));
      if (result.ok) {
        setSent(true);
        toast("Message sent", {
          detail: `We'll reply to ${values.email.trim()} within 24 hours.`,
        });
      } else {
        setError({ text: result.error });
        setFailed((n) => n + 1);
        toast("That didn't send", { tone: "error", detail: result.error });
      }
    } catch {
      const text = "That didn't send. Check your connection and try again.";
      setError({ text });
      setFailed((n) => n + 1);
      toast("That didn't send", { tone: "error", detail: text });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className={styles.container}>
      <div className={styles.photo}>
        <Image
          src={HeroImg}
          alt='A coordinator on the phone, taking notes at her desk'
          fill
          sizes='(max-width: 968px) 100vw, 50vw'
          loading='eager'
          fetchPriority='high'
          className={styles.img}
        />
        <figure className={styles.quote}>
          <blockquote className={styles.quoteText}>
            &ldquo;Fonts &amp; Footers built us a direct booking platform that
            looks better than anything our competitors are running, and our
            clients actually use it.&rdquo;
          </blockquote>
          <figcaption className={styles.quoteBy}>
            <span className={styles.quoteAvatar}>
              <Image
                src={Barry}
                alt=''
                fill
                sizes='36px'
                className={styles.quoteAvatarImg}
              />
            </span>
            <span className={styles.quoteWho}>
              <span className={styles.quoteName}>Barry LaNier</span>
              <span className={styles.quoteRole}>
                Owner, Nier Transportation
              </span>
            </span>
          </figcaption>
        </figure>
      </div>

      <div className={styles.textCard}>
        <Reveal onLoad step={150} />
        <div className={styles.top}>
          <EyeBrow text='Contact' />
          <h1
            className={`${styles.heading} heading2`}
            data-reveal
            data-reveal-style='fade'
          >
            Ready to get started?
          </h1>
          <p className={styles.copy} data-reveal>
            Send us a few details about your operation. We&apos;ll look it over
            and get back within 24 hours to set up a 20-minute call.
          </p>
        </div>

        {sent ? (
          <div className={styles.thanks} role='status'>
            <span className={styles.label}>Sent</span>
            <p className={styles.thanksText}>
              Thanks, {values.name.trim().split(" ")[0]}. We&apos;ll reply to{" "}
              {values.email.trim()} within 24 hours.
            </p>
          </div>
        ) : (
          <form
            className={styles.form}
            onSubmit={onSubmit}
            noValidate
            data-reveal
          >
            <div className={styles.group}>
              <span className={styles.label}>Contact information</span>
              <div className={styles.fields}>
                <label className={styles.field}>
                  <span className={styles.srOnly}>Full name</span>
                  <input
                    className={styles.input}
                    type='text'
                    name='name'
                    autoComplete='name'
                    placeholder='Full name'
                    value={values.name}
                    onChange={set("name")}
                    aria-invalid={invalid("name")}
                    disabled={sending}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.srOnly}>Email address</span>
                  <input
                    className={styles.input}
                    type='email'
                    name='email'
                    inputMode='email'
                    autoComplete='email'
                    placeholder='Email address'
                    value={values.email}
                    onChange={set("email")}
                    aria-invalid={invalid("email")}
                    disabled={sending}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.srOnly}>Company name</span>
                  <input
                    className={styles.input}
                    type='text'
                    name='company'
                    autoComplete='organization'
                    placeholder='Company name'
                    value={values.company}
                    onChange={set("company")}
                    disabled={sending}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.srOnly}>Your role</span>
                  <input
                    className={styles.input}
                    type='text'
                    name='role'
                    autoComplete='organization-title'
                    placeholder='Role, e.g. Owner'
                    value={values.role}
                    onChange={set("role")}
                    disabled={sending}
                  />
                </label>
              </div>
            </div>

            <div className={styles.group}>
              <span className={styles.label}>Description</span>
              <label className={styles.field}>
                <span className={styles.srOnly}>How can we help?</span>
                <textarea
                  className={`${styles.input} ${styles.textarea}`}
                  name='message'
                  placeholder='How can we help?'
                  rows={4}
                  value={values.message}
                  onChange={set("message")}
                  aria-invalid={invalid("message")}
                  disabled={sending}
                />
              </label>
            </div>

            {/* For bots only: a person never sees this field, so a value
                in it means a bot filled the form. */}
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

            <Turnstile siteKey={siteKey} resetKey={failed} />

            <p className={styles.fine}>
              *By submitting this form, you agree to receive helpful resources
              and updates. No spam, and you can opt out anytime.
            </p>

            {error && (
              <p className={styles.error} role='alert'>
                {error.text}
              </p>
            )}

            <div className={styles.submit}>
              <Button
                type='submit'
                btnType='black'
                text={sending ? "Sending…" : "Book a demo"}
                disabled={sending}
                arrow
              />
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
