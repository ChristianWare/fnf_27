"use client";

// The contact page's hero: a photo with Barry's quote on the left, the
// form on the right. The form checks the fields and shows a thank-you;
// sending it somewhere is a PLACEHOLDER until there's an endpoint.

import { useState, type FormEvent } from "react";
import Image from "next/image";
import styles from "./ContactHero.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import HeroImg from "../../../../public/images/newHero.png";
import Barry from "../../../../public/images/barry.png";

type Field = "name" | "email" | "company" | "role" | "message";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactHero() {
  const [values, setValues] = useState<Record<Field, string>>({
    name: "",
    email: "",
    company: "",
    role: "",
    message: "",
  });
  const [error, setError] = useState<{ field: Field; text: string } | null>(
    null,
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function set(field: Field) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
  }

  const invalid = (field: Field) => error?.field === field || undefined;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.name.trim()) {
      setError({ field: "name", text: "Enter your name." });
      return;
    }
    if (!EMAIL_RE.test(values.email.trim())) {
      setError({ field: "email", text: "Enter a valid email address." });
      return;
    }
    if (!values.message.trim()) {
      setError({
        field: "message",
        text: "Tell us a little about what you need.",
      });
      return;
    }
    setError(null);
    setSending(true);

    // PLACEHOLDER: post the values to your API route or email service
    // here, e.g. await fetch("/api/contact", { method: "POST", body: ... }).
    await new Promise((resolve) => setTimeout(resolve, 600));

    setSending(false);
    setSent(true);
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
