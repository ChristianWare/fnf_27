"use client";

// One client's money: their plan and rates, the card and the subscription,
// their Leads Tool, and every invoice as a PDF. SAMPLE: actions show a
// toast; the real ones go through Stripe.

import { useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { Pill, ui } from "@/components/Dashboard/ui/ui";
import { fmtDate, fmtShort, money } from "@/lib/dashboard/format";
import { LEADS, PLANS } from "@/lib/dashboard/plans";
import type {
  Card,
  Invoice,
  LeadsStatus,
  PlanId,
  Website,
} from "@/lib/dashboard/types";
import styles from "./Client.module.css";

export default function ClientBilling({
  clientId,
  firstName,
  email,
  website,
  leads,
  card,
  invoices,
  nextFirst,
}: {
  clientId: string;
  firstName: string;
  email: string;
  website?: Pick<
    Website,
    "plan" | "monthly" | "setupFee" | "status" | "nextBillingAt"
  > & { setupPaidAt?: string };
  leads: { status: LeadsStatus; trialEndsAt?: string };
  card?: Card;
  invoices: Invoice[];
  /** The next 1st, when rate changes and new plans start. */
  nextFirst: string;
}) {
  const toast = useToast();
  const [plan, setPlan] = useState<PlanId | undefined>(website?.plan);
  const [monthly, setMonthly] = useState(String(website?.monthly ?? ""));
  const [setup, setSetup] = useState(String(website?.setupFee ?? ""));
  const [status, setStatus] = useState(website?.status);
  const [leadsStatus, setLeadsStatus] = useState(leads.status);
  const [trialEnds, setTrialEnds] = useState(leads.trialEndsAt);

  const ratesChanged =
    website &&
    (plan !== website.plan ||
      Number(monthly) !== website.monthly ||
      Number(setup) !== website.setupFee);

  const copyLink = async () => {
    const link = `https://billing.stripe.com/p/session/sample_${clientId}`;
    try {
      await navigator.clipboard.writeText(link);
      toast("Card-update link copied", {
        detail: `Send it to ${firstName}. It opens Stripe's secure page.`,
      });
    } catch {
      toast("Couldn't copy the link", { tone: "error" });
    }
  };

  return (
    <div className={styles.split}>
      <div className={styles.column}>
        {website ? (
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.titles}>
                <h2 className={styles.heading}>Plan and rates</h2>
                <p>
                  Changes start on {fmtDate(nextFirst)}, the next 1st. Nothing
                  is prorated.
                </p>
              </div>
              {status === "PAST_DUE" ? (
                <Pill tone='red' dot>
                  Payment failed
                </Pill>
              ) : status === "CANCELLING" ? (
                <Pill tone='red' dot>
                  Cancels at month end
                </Pill>
              ) : (
                <Pill tone='lime' dot>
                  Active
                </Pill>
              )}
            </div>

            <div
              className={styles.planPick}
              role='radiogroup'
              aria-label='Plan'
            >
              {(Object.keys(PLANS) as PlanId[]).map((id) => (
                <button
                  key={id}
                  type='button'
                  role='radio'
                  aria-checked={plan === id}
                  className={`${styles.planOption} ${styles.planSmall} ${plan === id ? styles.planOn : ""}`}
                  onClick={() => {
                    setPlan(id);
                    setMonthly(String(PLANS[id].monthly));
                  }}
                >
                  <span className={styles.planName}>{PLANS[id].name}</span>
                  <span className={styles.planPrice}>
                    {money(PLANS[id].monthly)}
                    <span>/mo list</span>
                  </span>
                </button>
              ))}
            </div>

            <div className={styles.formRow}>
              <label className={ui.field}>
                <span className={ui.label}>Their monthly rate</span>
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
                    disabled={Boolean(website.setupPaidAt)}
                    onChange={(e) =>
                      setSetup(e.target.value.replace(/[^\d.]/g, ""))
                    }
                  />
                </span>
                {website.setupPaidAt && (
                  <span className={styles.sourceHelp}>
                    Paid {fmtDate(website.setupPaidAt)}
                  </span>
                )}
              </label>
            </div>
            <div className={styles.actions}>
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
                disabled={!ratesChanged || !Number(monthly)}
                onClick={() =>
                  toast("Rates saved", {
                    detail: `${plan ? PLANS[plan].name : "Plan"} at ${money(Number(monthly))} a month from ${fmtShort(nextFirst)}. ${firstName} gets an email.`,
                  })
                }
              >
                Save rates
              </button>
            </div>
          </section>
        ) : (
          <section className={styles.card}>
            <div className={styles.titles}>
              <h2 className={styles.heading}>No website plan</h2>
              <p>
                Approve them from the Overview tab to set a plan and prices.
              </p>
            </div>
          </section>
        )}

        <section className={styles.card}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>Invoices</h2>
            <p>The same branded PDF {firstName} downloads and gets by email.</p>
          </div>
          {invoices.length ? (
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th scope='col'>Date</th>
                    <th scope='col'>Invoice</th>
                    <th scope='col'>For</th>
                    <th scope='col'>Status</th>
                    <th scope='col'>Amount</th>
                    <th scope='col'>
                      <span className={ui.srOnly}>Download</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className={styles.nowrap}>
                        {fmtShort(invoice.date)}
                      </td>
                      <td>
                        <span className={ui.monoMuted}>{invoice.number}</span>
                      </td>
                      <td>{invoice.description}</td>
                      <td>
                        <Pill
                          tone={invoice.status === "PAID" ? "lime" : "red"}
                          dot
                        >
                          {invoice.status === "PAID" ? "Paid" : "Due"}
                        </Pill>
                      </td>
                      <td className={styles.nowrap}>{money(invoice.amount)}</td>
                      <td>
                        <a
                          href={`/admin/clients/${clientId}/invoices/${invoice.id}`}
                          download={`${invoice.number}.pdf`}
                          className={styles.pdf}
                          data-no-transition
                        >
                          <Icon name='download' />
                          PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.help}>No invoices yet.</p>
          )}
        </section>
      </div>

      <div className={styles.column}>
        <section className={styles.card}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>Card and billing</h2>
            <p>Billed on the 1st of every month.</p>
          </div>
          {card ? (
            <div
              className={`${styles.cardChip} ${card.expired ? styles.cardExpired : ""}`}
            >
              <Icon name='card' className={styles.cardIcon} />
              <span className={styles.cardText}>
                <span className={styles.cardName}>
                  {card.brand} ending {card.last4}
                </span>
                <span className={ui.monoMuted}>
                  {card.expired ? `Expired ${card.exp}` : `Expires ${card.exp}`}
                </span>
              </span>
            </div>
          ) : (
            <p className={styles.help}>No card on file.</p>
          )}
          <dl className={styles.miniFacts}>
            <div>
              <dt>Next bill</dt>
              <dd>
                {website?.nextBillingAt && website.setupPaidAt
                  ? fmtDate(website.nextBillingAt)
                  : leadsStatus === "ACTIVE"
                    ? fmtDate(nextFirst)
                    : "—"}
              </dd>
            </div>
            <div>
              <dt>Monthly</dt>
              <dd>
                {website
                  ? money(website.monthly)
                  : leadsStatus === "ACTIVE"
                    ? money(LEADS.monthly)
                    : "—"}
              </dd>
            </div>
          </dl>
          <div className={styles.stack}>
            {status === "PAST_DUE" && (
              <>
                <button
                  type='button'
                  className={`${ui.btn} ${ui.btn_black}`}
                  onClick={() =>
                    toast("Card-update link sent", {
                      detail: `${email} can add a new card in a minute. We'll retry the payment as soon as they do.`,
                    })
                  }
                >
                  Send {firstName} a card link
                  <Icon name='send' className={ui.btnIcon} />
                </button>
                <button
                  type='button'
                  className={`${ui.btn} ${ui.btn_outline}`}
                  onClick={() => {
                    if (card?.expired) {
                      toast("Still declined", {
                        tone: "error",
                        detail:
                          "The card on file has expired. Send them a card link.",
                      });
                    } else {
                      setStatus("ACTIVE");
                      toast("Payment went through");
                    }
                  }}
                >
                  Retry the payment
                  <Icon name='refresh' className={ui.btnIcon} />
                </button>
              </>
            )}
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light}`}
              onClick={copyLink}
            >
              Copy card-update link
              <Icon name='copy' className={ui.btnIcon} />
            </button>
            {website &&
              (status === "CANCELLING" ? (
                <button
                  type='button'
                  className={`${ui.btn} ${ui.btn_light}`}
                  onClick={() => {
                    setStatus("ACTIVE");
                    toast("Cancellation undone", {
                      detail: `${firstName}'s plan carries on as normal.`,
                    });
                  }}
                >
                  Undo the cancellation
                </button>
              ) : (
                <button
                  type='button'
                  className={`${ui.btn} ${ui.btn_outline}`}
                  onClick={() => {
                    setStatus("CANCELLING");
                    toast("Cancels at the end of the month", {
                      tone: "info",
                      detail: `Nothing more is charged. ${firstName} gets an email.`,
                    });
                  }}
                >
                  Cancel at the end of the month
                </button>
              ))}
          </div>
        </section>

        {website?.plan !== "FULL_PLATFORM" && (
          <section className={`${styles.card} ${styles.leadsCard}`}>
            <div className={styles.cardHead}>
              <div className={styles.titles}>
                <h2 className={styles.heading}>Leads Tool</h2>
                <p>
                  {leadsStatus === "TRIAL"
                    ? `Free trial until ${trialEnds ? fmtDate(trialEnds) : "—"}. After that: the rest of that month, prorated, then ${money(LEADS.monthly)} on the 1st.`
                    : leadsStatus === "ACTIVE"
                      ? `${money(LEADS.monthly)} a month, billed on the 1st.`
                      : "Not using it."}
                </p>
              </div>
              <Pill tone={leadsStatus === "NONE" ? "white" : "black"} dot>
                {leadsStatus === "TRIAL"
                  ? "Trial"
                  : leadsStatus === "ACTIVE"
                    ? "Active"
                    : "Off"}
              </Pill>
            </div>
            <div className={styles.stack}>
              {leadsStatus === "TRIAL" && (
                <button
                  type='button'
                  className={`${ui.btn} ${ui.btn_black}`}
                  onClick={() => {
                    const next = new Date(
                      new Date(trialEnds ?? Date.now()).getTime() +
                        7 * 86_400_000,
                    ).toISOString();
                    setTrialEnds(next);
                    toast("Trial extended by 7 days", {
                      detail: `It now ends ${fmtDate(next)}. ${firstName} gets an email.`,
                    });
                  }}
                >
                  Extend the trial 7 days
                  <Icon name='plus' className={ui.btnIcon} />
                </button>
              )}
              {leadsStatus === "NONE" && (
                <button
                  type='button'
                  className={`${ui.btn} ${ui.btn_black}`}
                  onClick={() => {
                    const ends = new Date(
                      Date.now() + LEADS.trialDays * 86_400_000,
                    ).toISOString();
                    setLeadsStatus("TRIAL");
                    setTrialEnds(ends);
                    toast(
                      `Started a ${LEADS.trialDays}-day trial for ${firstName}`,
                      {
                        detail:
                          "No card needed. Their first digest goes out tomorrow.",
                      },
                    );
                  }}
                >
                  Start a free trial for them
                </button>
              )}
              {leadsStatus !== "NONE" && (
                <button
                  type='button'
                  className={`${ui.btn} ${ui.btn_outline}`}
                  onClick={() => {
                    setLeadsStatus("NONE");
                    toast(
                      leadsStatus === "TRIAL"
                        ? "Trial ended"
                        : "Leads Tool cancels at the end of the month",
                      { tone: "info" },
                    );
                  }}
                >
                  {leadsStatus === "TRIAL"
                    ? "End the trial"
                    : "Cancel the Leads Tool"}
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
