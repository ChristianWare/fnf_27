"use client";

// A new sign-up: read what they asked for, set the plan and prices, and
// approve. Approving emails them a welcome with the agreement and the
// setup fee.

import { useState } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "@/components/Dashboard/icons";
import { useAction } from "@/components/Dashboard/useAction";
import { ui } from "@/components/Dashboard/ui/ui";
import { approveClient, declineClient } from "@/app/admin/actions";
import { fmtShort, money } from "@/lib/dashboard/format";
import { PLANS } from "@/lib/dashboard/plans";
import type { PlanId } from "@/lib/dashboard/types";
import styles from "./Client.module.css";

export default function Approve({
  clientId,
  business,
  name,
  email,
  request,
  nextFirst,
}: {
  clientId: string;
  business: string;
  name: string;
  email: string;
  request?: { plan?: PlanId | "LEADS"; message?: string };
  nextFirst: string;
}) {
  const { run, pending } = useAction();
  const first = name.split(" ")[0];
  const [plan, setPlan] = useState<PlanId>(
    request?.plan && request.plan !== "LEADS" ? request.plan : "FULL_PLATFORM",
  );
  const [monthly, setMonthly] = useState(String(PLANS[plan].monthly));
  const [setup, setSetup] = useState(String(PLANS[plan].setup));
  const [note, setNote] = useState("");
  const [done, setDone] = useState<"approved" | "declined" | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  const choose = (next: PlanId) => {
    setPlan(next);
    setMonthly(String(PLANS[next].monthly));
    setSetup(String(PLANS[next].setup));
  };

  if (done === "approved") {
    return (
      <section className={`${styles.card} ${styles.approved}`}>
        <span className={styles.approvedIcon}>
          <Icon name='check' />
        </span>
        <div className={styles.titles}>
          <h2 className={styles.heading}>Approved</h2>
          <p>
            {business} is on the {PLANS[plan].name} at {money(Number(monthly))}{" "}
            a month and {money(Number(setup))} setup. {first} has been emailed:
            sign the agreement, pay the setup fee, and monthly billing starts{" "}
            the 1st after that.
          </p>
        </div>
      </section>
    );
  }

  if (done === "declined") {
    return (
      <section className={styles.card}>
        <div className={styles.titles}>
          <h2 className={styles.heading}>Declined</h2>
          <p>{first} has been emailed. Their account stays closed.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`${styles.card} ${styles.approveCard}`}>
      <div className={styles.cardHead}>
        <div className={styles.titles}>
          <span className={styles.flag}>New sign-up</span>
          <h2 className={styles.heading}>Approve {business}</h2>
          <p>
            Set the plan and prices. Approving emails {first} the agreement and
            the setup fee.
          </p>
        </div>
      </div>

      {request?.message && (
        <blockquote className={styles.quote}>
          <p>“{request.message}”</p>
          <span className={ui.monoMuted}>
            {name}
            {request.plan && request.plan !== "LEADS"
              ? ` · asked for the ${PLANS[request.plan].name}`
              : ""}
          </span>
        </blockquote>
      )}

      <div className={styles.planPick} role='radiogroup' aria-label='Plan'>
        {(Object.keys(PLANS) as PlanId[]).map((id) => (
          <button
            key={id}
            type='button'
            role='radio'
            aria-checked={plan === id}
            className={`${styles.planOption} ${plan === id ? styles.planOn : ""}`}
            onClick={() => choose(id)}
          >
            <span className={styles.planName}>{PLANS[id].name}</span>
            <span className={styles.planPrice}>
              {money(PLANS[id].monthly)}
              <span>/mo</span>
            </span>
            <p>{PLANS[id].blurb}</p>
          </button>
        ))}
      </div>

      <div className={styles.formRow}>
        <label className={ui.field}>
          <span className={ui.label}>Monthly rate</span>
          <span className={styles.money}>
            <span aria-hidden='true'>$</span>
            <input
              className={ui.input}
              inputMode='decimal'
              value={monthly}
              onChange={(e) =>
                setMonthly(e.target.value.replace(/[^\d.]/g, ""))
              }
            />
          </span>
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Setup fee</span>
          <span className={styles.money}>
            <span aria-hidden='true'>$</span>
            <input
              className={ui.input}
              inputMode='decimal'
              value={setup}
              onChange={(e) => setSetup(e.target.value.replace(/[^\d.]/g, ""))}
            />
          </span>
        </label>
      </div>
      <p className={styles.help}>
        If they pay the setup fee this month, the first{" "}
        {money(Number(monthly) || 0)} is charged on {fmtShort(nextFirst)}.
      </p>

      <label className={ui.field}>
        <span className={ui.label}>A note in the welcome email (optional)</span>
        <textarea
          className={ui.textarea}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={`e.g. Great to meet you, ${first}. Here's everything you need to get started.`}
        />
      </label>

      <div className={styles.actions}>
        <button
          type='button'
          className={`${ui.btn} ${ui.btn_outline}`}
          onClick={() => setDeclining(true)}
        >
          Decline
        </button>
        <button
          type='button'
          className={`${ui.btn} ${ui.btn_black}`}
          disabled={!Number(monthly) || pending}
          onClick={() =>
            run(
              () =>
                approveClient(clientId, {
                  plan,
                  monthly: Number(monthly),
                  setup: Number(setup) || 0,
                  note,
                }),
              () => {
                setDone("approved");
                return {
                  message: `${business} approved`,
                  detail: `Welcome email sent to ${email}.`,
                };
              },
            )
          }
        >
          Approve and send welcome
          <Icon name='send' className={ui.btnIcon} />
        </button>
      </div>

      <Modal isOpen={declining} onClose={() => setDeclining(false)}>
        <div className={ui.modalBody}>
          <span className={ui.monoMuted}>Decline sign-up</span>
          <h2 className={ui.modalTitle}>Decline {business}?</h2>
          <label className={ui.field}>
            <span className={ui.label}>Why (sent to {first})</span>
            <textarea
              className={ui.textarea}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. We only work with chauffeured car services, so we're not the right fit."
            />
          </label>
          <div className={ui.modalActions}>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light}`}
              onClick={() => setDeclining(false)}
            >
              Keep it
            </button>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black}`}
              disabled={pending}
              onClick={() =>
                run(
                  () => declineClient(clientId, reason),
                  () => {
                    setDeclining(false);
                    setDone("declined");
                    return {
                      message: `${business} declined`,
                      tone: "info",
                      detail: `${first} has been emailed.`,
                    };
                  },
                )
              }
            >
              Decline and email
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
