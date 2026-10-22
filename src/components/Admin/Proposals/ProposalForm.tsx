"use client";

// The proposal form: pick a plan to fill in its price and what it
// includes, edit anything, then download the PDF. Nothing is saved; the
// fields go to /admin/proposals/pdf and the file comes back.

import { useState, type ReactNode } from "react";
import { ui } from "@/components/Dashboard/ui/ui";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import {
  PLAN_LABELS,
  type Proposal,
  type ProposalPlan,
} from "@/lib/proposals/types";
import styles from "./ProposalForm.module.css";

const PLAN_ORDER: ProposalPlan[] = [
  "FULL_PLATFORM",
  "WEBSITE_ONLY",
  "LEADS",
  "CUSTOM",
];

type Presets = Record<
  ProposalPlan,
  Pick<
    Proposal,
    | "service"
    | "summary"
    | "setup"
    | "monthly"
    | "trialDays"
    | "included"
    | "timeline"
    | "caseStudy"
    | "terms"
  >
>;

const money = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

function Field({
  label,
  help,
  wide,
  children,
}: {
  label: string;
  help?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`${ui.field} ${wide ? styles.wide : ""}`}>
      <span className={ui.label}>{label}</span>
      {children}
      {help && <span className={styles.help}>{help}</span>}
    </label>
  );
}

function Switch({
  on,
  label,
  text,
  onChange,
}: {
  on: boolean;
  label: string;
  text?: string;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className={styles.switchRow}>
      <div className={styles.switchText}>
        <span className={styles.switchLabel}>{label}</span>
        {text && <span className={styles.help}>{text}</span>}
      </div>
      <button
        type='button'
        role='switch'
        aria-checked={on}
        aria-label={label}
        className={ui.switch}
        onClick={() => onChange(!on)}
      />
    </div>
  );
}

export default function ProposalForm({
  initial,
  presets,
}: {
  initial: Proposal;
  presets: Presets;
}) {
  const toast = useToast();
  const [p, setP] = useState<Proposal>(initial);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Proposal>(key: K, value: Proposal[K]) =>
    setP((prev) => ({ ...prev, [key]: value }));

  const text =
    (key: keyof Proposal) =>
    (e: { target: { value: string } }) =>
      set(key, e.target.value as never);

  const amount =
    (key: "setup" | "monthly" | "trialDays" | "validDays") =>
    (e: { target: { value: string } }) => {
      const n = Number(e.target.value);
      set(key, Number.isFinite(n) && n >= 0 ? n : 0);
    };

  // A new plan refills the price, the list and the terms; the client's
  // details and the note stay.
  const pickPlan = (plan: ProposalPlan) =>
    setP((prev) => ({
      ...prev,
      plan,
      ...presets[plan],
      waiveSetup: presets[plan].setup > 0 ? prev.waiveSetup : false,
    }));

  const setupDue = p.waiveSetup ? 0 : p.setup;
  const dueToStart =
    setupDue + (p.monthly > 0 && p.trialDays === 0 ? p.monthly : 0);

  async function generate() {
    if (busy) return;
    if (!p.business.trim() && !p.contactName.trim()) {
      toast("Add the client's name or business first.", { tone: "error" });
      return;
    }
    if (!p.service.trim()) {
      toast("Add the name of the service first.", { tone: "error" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/admin/proposals/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      // A signed-out session is sent to the login page instead of the PDF.
      if (
        res.ok &&
        !res.headers.get("Content-Type")?.includes("application/pdf")
      ) {
        toast("Your session ended. Sign in again, then generate the PDF.", {
          tone: "error",
        });
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error ?? "The PDF didn't generate. Try again.", {
          tone: "error",
        });
        return;
      }
      const blob = await res.blob();
      const name =
        /filename="([^"]+)"/.exec(
          res.headers.get("Content-Disposition") ?? "",
        )?.[1] ?? "Fonts-and-Footers-Proposal.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Proposal downloaded.", { tone: "success", detail: name });
    } catch {
      toast("The PDF didn't generate. Check your connection and try again.", {
        tone: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.layout}>
      <div className={styles.main}>
        {/* Who it's for. */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.heading}>Prepared for</h2>
          </div>
          <div className={styles.grid}>
            <Field label='Contact name'>
              <input
                className={ui.input}
                value={p.contactName}
                onChange={text("contactName")}
                placeholder='Barry LaNier'
              />
            </Field>
            <Field label='Business'>
              <input
                className={ui.input}
                value={p.business}
                onChange={text("business")}
                placeholder='Nier Transportation'
              />
            </Field>
            <Field label='Email'>
              <input
                className={ui.input}
                type='email'
                value={p.email}
                onChange={text("email")}
                placeholder='Optional'
              />
            </Field>
            <Field label='City'>
              <input
                className={ui.input}
                value={p.city}
                onChange={text("city")}
                placeholder='Optional'
              />
            </Field>
            <Field
              label='Personal note'
              help='The opening paragraph, signed from you. Leave it blank to skip it.'
              wide
            >
              <textarea
                className={ui.textarea}
                value={p.note}
                onChange={text("note")}
                placeholder='Great talking on Tuesday. Here is everything we covered, in one place…'
              />
            </Field>
          </div>
        </section>

        {/* The plan. */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.heading}>The plan</h2>
            <p className={styles.help}>
              Picking a plan fills in its price, what it includes and the
              terms. Custom starts blank, for other industries and one-off
              projects.
            </p>
          </div>
          <div className={ui.chips} role='radiogroup' aria-label='Plan'>
            {PLAN_ORDER.map((plan) => (
              <button
                key={plan}
                type='button'
                role='radio'
                aria-checked={p.plan === plan}
                className={ui.chip}
                onClick={() => pickPlan(plan)}
              >
                {PLAN_LABELS[plan]}
              </button>
            ))}
          </div>
          <div className={styles.grid}>
            <Field label='Service name' wide>
              <input
                className={ui.input}
                value={p.service}
                onChange={text("service")}
                placeholder='Website redesign'
              />
            </Field>
            <Field
              label='Summary'
              help='One or two sentences under the service name.'
              wide
            >
              <textarea
                className={`${ui.textarea} ${styles.short}`}
                value={p.summary}
                onChange={text("summary")}
              />
            </Field>
            <Field
              label="What's included"
              help='One item per line.'
              wide
            >
              <textarea
                className={`${ui.textarea} ${styles.tall}`}
                value={p.included}
                onChange={text("included")}
              />
            </Field>
            <Field label='Timeline' wide>
              <input
                className={ui.input}
                value={p.timeline}
                onChange={text("timeline")}
                placeholder='About 3 weeks from kickoff to launch.'
              />
            </Field>
          </div>
        </section>

        {/* The money. */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.heading}>Investment</h2>
          </div>
          <div className={styles.grid}>
            <Field
              label='Setup or one-time fee ($)'
              help='For a one-off project with no monthly plan, put the whole price here.'
            >
              <input
                className={ui.input}
                type='number'
                inputMode='decimal'
                min={0}
                value={p.setup}
                onChange={amount("setup")}
              />
            </Field>
            <Field label='Monthly ($)' help='0 for no monthly charge.'>
              <input
                className={ui.input}
                type='number'
                inputMode='decimal'
                min={0}
                value={p.monthly}
                onChange={amount("monthly")}
              />
            </Field>
            <Field
              label='Free days before billing'
              help='0 unless there is a free period first.'
            >
              <input
                className={ui.input}
                type='number'
                inputMode='numeric'
                min={0}
                value={p.trialDays}
                onChange={amount("trialDays")}
              />
            </Field>
          </div>

          {p.setup > 0 && (
            <div className={styles.waive}>
              <Switch
                on={p.waiveSetup}
                label='Waive the setup fee'
                text='The PDF shows the fee crossed out, with $0 due for it.'
                onChange={(on) => set("waiveSetup", on)}
              />
              {p.waiveSetup && (
                <Field
                  label='Reason shown (optional)'
                  help='For example: Friends and family. Leave blank to just say waived.'
                >
                  <input
                    className={ui.input}
                    value={p.waiveReason}
                    onChange={text("waiveReason")}
                    placeholder='Friends and family'
                  />
                </Field>
              )}
            </div>
          )}
        </section>

        {/* The fine print. */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.heading}>Terms and next step</h2>
          </div>
          <div className={styles.grid}>
            <Field
              label='Key terms'
              help='One per line, in plain words. The signed agreement still governs.'
              wide
            >
              <textarea
                className={`${ui.textarea} ${styles.tall}`}
                value={p.terms}
                onChange={text("terms")}
              />
            </Field>
            <Field label='Next step' wide>
              <textarea
                className={`${ui.textarea} ${styles.short}`}
                value={p.nextSteps}
                onChange={text("nextSteps")}
              />
            </Field>
            <Field label='Proposal date'>
              <input
                className={ui.input}
                type='date'
                value={p.date}
                onChange={text("date")}
              />
            </Field>
            <Field label='Valid for (days)'>
              <input
                className={ui.input}
                type='number'
                inputMode='numeric'
                min={1}
                value={p.validDays}
                onChange={amount("validDays")}
              />
            </Field>
          </div>
          <Switch
            on={p.caseStudy}
            label='Include the Nier Transportation results'
            text="Barry's quote and the numbers. Best for limo and black car clients."
            onChange={(on) => set("caseStudy", on)}
          />
        </section>
      </div>

      {/* The summary and the button, kept in view. */}
      <aside className={styles.side}>
        <div className={styles.summary}>
          <span className={ui.label}>Summary</span>
          <p className={styles.sumTitle}>
            {p.service || "Service"} for{" "}
            {p.business || p.contactName || "your client"}
          </p>
          <dl className={styles.sumRows}>
            {p.setup > 0 && (
              <div className={styles.sumRow}>
                <dt>{p.monthly > 0 ? "Setup" : "One-time"}</dt>
                <dd>
                  {p.waiveSetup ? (
                    <>
                      <s className={styles.struck}>{money(p.setup)}</s> Waived
                    </>
                  ) : (
                    money(p.setup)
                  )}
                </dd>
              </div>
            )}
            {p.monthly > 0 && (
              <div className={styles.sumRow}>
                <dt>Monthly</dt>
                <dd>
                  {money(p.monthly)}/mo
                  {p.trialDays > 0 ? ` after ${p.trialDays} free days` : ""}
                </dd>
              </div>
            )}
            <div className={`${styles.sumRow} ${styles.sumTotal}`}>
              <dt>Due to start</dt>
              <dd>{money(dueToStart)}</dd>
            </div>
          </dl>
          <button
            type='button'
            className={`${ui.btn} ${ui.btn_black} ${styles.generate}`}
            onClick={generate}
            disabled={busy}
          >
            {busy ? "Generating…" : "Generate PDF"}
          </button>
          <p className={styles.help}>
            Downloads straight away. Attach it to your email.
          </p>
        </div>
      </aside>
    </div>
  );
}
