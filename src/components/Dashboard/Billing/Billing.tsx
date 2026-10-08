"use client";

import Link from "next/link";
import { useState } from "react";
import Modal from "@/components/shared/Modal/Modal";
import Icon from "../icons";
import { Pill, Progress, ui } from "../ui/ui";
import { useToast } from "../Toast/Toast";
import styles from "./Billing.module.css";
import { fmtDate, money } from "@/lib/dashboard/format";
import type { Card, Invoice, LeadsStatus, PlanId } from "@/lib/dashboard/types";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";

type Props = {
  plan?: {
    id: PlanId;
    name: string;
    monthly: number;
    setupFee: number;
    setupPaidAt?: string;
    nextBillingAt?: string;
    live: boolean;
  };
  upgrade: { name: string; monthly: number };
  leads: {
    access: "INCLUDED" | LeadsStatus;
    monthly: number;
    trialDays: number;
    trialEndsAt?: string;
  };
  card?: Card;
  invoices: Invoice[];
  now: string;
};

export default function Billing({
  plan,
  upgrade,
  leads,
  card,
  invoices,
  now,
}: Props) {
  const toast = useToast();
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [upgradeAsked, setUpgradeAsked] = useState(false);
  const [leadsState, setLeadsState] = useState(leads.access);
  const [trialEnds, setTrialEnds] = useState(leads.trialEndsAt);
  const [keepLeads, setKeepLeads] = useState(false);

  const startTrial = () => {
    setLeadsState("TRIAL");
    setTrialEnds(
      new Date(
        new Date(now).getTime() + leads.trialDays * 86_400_000,
      ).toISOString(),
    );
    toast(`Your ${leads.trialDays}-day free trial has started`, {
      detail: "Your first leads arrive tomorrow morning.",
    });
  };

  const daysLeft =
    leadsState === "TRIAL" && trialEnds
      ? Math.max(
          0,
          Math.ceil(
            (new Date(trialEnds).getTime() - new Date(now).getTime()) /
              86_400_000,
          ),
        )
      : 0;

  return (
    <>
      <div className={styles.top}>
        {/* The plan */}
        <section className={styles.plan}>
          {plan ? (
            <>
              <div className={`${styles.planHead} ${styles[plan.id]}`}>
                <div className={styles.planTop}>
                  <span className={styles.planName}>{plan.name}</span>
                  {cancelled ? (
                    <Pill tone='red' dot>
                      {plan.live && plan.nextBillingAt
                        ? `Ends ${fmtDate(plan.nextBillingAt)}`
                        : "Cancelled"}
                    </Pill>
                  ) : (
                    <Pill
                      tone={plan.id === "FULL_PLATFORM" ? "lime" : "black"}
                      dot
                    >
                      Active
                    </Pill>
                  )}
                </div>
                <div className={styles.planPrice}>
                  <span className={styles.amount}>{money(plan.monthly)}</span>
                  <span className={styles.per}>/month</span>
                </div>
              </div>
              <dl className={styles.rows}>
                <div className={styles.row}>
                  <dt className={ui.monoMuted}>Setup fee</dt>
                  <dd>
                    {money(plan.setupFee)}
                    {plan.setupPaidAt
                      ? ` · Paid ${fmtDate(plan.setupPaidAt)}`
                      : " · Due"}
                  </dd>
                </div>
                <div className={styles.row}>
                  <dt className={ui.monoMuted}>Monthly billing</dt>
                  <dd>
                    {plan.live && plan.nextBillingAt
                      ? `Next bill ${fmtDate(plan.nextBillingAt)}`
                      : "Starts on launch day"}
                  </dd>
                </div>
                <div className={styles.row}>
                  <dt className={ui.monoMuted}>Contract</dt>
                  <dd>Month to month. Cancel anytime.</dd>
                </div>
              </dl>
              <div className={styles.planActions}>
                {plan.id === "WEBSITE_ONLY" && !cancelled && (
                  <a href='#upgrade' className={`${ui.btn} ${ui.btn_black}`}>
                    Upgrade, no rebuild
                    <Icon name='arrow' className={ui.btnIcon} />
                  </a>
                )}
                {cancelled ? (
                  <button
                    type='button'
                    className={`${ui.btn} ${ui.btn_black}`}
                    onClick={() => {
                      setCancelled(false);
                      toast("Your plan stays on", {
                        detail: "Nothing changes. Glad you're staying.",
                      });
                    }}
                  >
                    Keep my plan
                  </button>
                ) : (
                  <button
                    type='button'
                    className={`${ui.btn} ${ui.btn_outline}`}
                    onClick={() => setCancelling(true)}
                  >
                    Cancel plan
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className={styles.noPlan}>
              <span className={ui.monoMuted}>Website plan</span>
              <h2 className={styles.noPlanTitle}>No website plan</h2>
              <p>
                Website Only starts at {money(199)} a month, and the Full
                Platform adds booking, dispatch and the Leads Tool. Book a call
                and we&apos;ll show you what yours could look like.
              </p>
              <a
                href={CALENDAR}
                target='_blank'
                rel='noopener noreferrer'
                className={`${ui.btn} ${ui.btn_black}`}
              >
                Book a call
                <Icon name='arrowUpRight' className={ui.btnIcon} />
              </a>
            </div>
          )}
        </section>

        {/* The card */}
        <section className={styles.panel}>
          <h2 className={styles.heading}>Payment method</h2>
          {card ? (
            <div
              className={styles.card}
              aria-label={`${card.brand} ending in ${card.last4}`}
            >
              <div className={styles.cardTop}>
                <span className={styles.chip} aria-hidden='true' />
                <span className={styles.cardBrand}>{card.brand}</span>
              </div>
              <span className={styles.cardNumber}>
                •••• •••• •••• {card.last4}
              </span>
              <span className={styles.cardExp}>Expires {card.exp}</span>
            </div>
          ) : (
            <div className={styles.noCard}>
              <Icon name='card' className={styles.noCardIcon} />
              <p>No card on file.</p>
            </div>
          )}
          <button
            type='button'
            className={`${ui.btn} ${ui.btn_light}`}
            onClick={() =>
              toast("Card updates open soon", {
                tone: "info",
                detail:
                  "This will open Stripe's secure page once billing moves over. Card details never touch our servers.",
              })
            }
          >
            {card ? "Update card" : "Add a card"}
          </button>
        </section>
      </div>

      {/* The Leads Tool */}
      <section id='leads' className={`${styles.panel} ${styles.leads}`}>
        <div className={styles.leadsHead}>
          <div className={styles.titles}>
            <span className={styles.leadsMono}>Leads Tool</span>
            <h2 className={styles.heading}>
              {leadsState === "INCLUDED"
                ? "Included with your Full Platform plan"
                : leadsState === "TRIAL"
                  ? `Free trial · ${daysLeft} days left`
                  : leadsState === "ACTIVE"
                    ? `${money(leads.monthly)} a month`
                    : `Try it free for ${leads.trialDays} days`}
            </h2>
            <p>
              {leadsState === "INCLUDED"
                ? "Fresh leads every morning, at no extra cost."
                : leadsState === "TRIAL"
                  ? keepLeads
                    ? `Card added. Your Leads Tool carries on after ${trialEnds ? fmtDate(trialEnds) : "your trial"} at ${money(leads.monthly)} a month.`
                    : `Your trial ends ${trialEnds ? fmtDate(trialEnds) : "soon"}. Add a card to keep it for ${money(leads.monthly)} a month; nothing is charged before then.`
                  : leadsState === "ACTIVE"
                    ? "Billed monthly with your plan. Cancel anytime."
                    : `The hotels, venues and companies near you that book rides, every morning. No card needed; ${money(leads.monthly)} a month after if you keep it.`}
            </p>
          </div>
          <div className={styles.leadsActions}>
            {leadsState === "NONE" ? (
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_black}`}
                onClick={startTrial}
              >
                Start free trial
                <Icon name='arrow' className={ui.btnIcon} />
              </button>
            ) : (
              <Link
                href='/dashboard/leads'
                className={`${ui.btn} ${ui.btn_black}`}
              >
                Open Leads Tool
                <Icon name='arrow' className={ui.btnIcon} />
              </Link>
            )}
            {leadsState === "TRIAL" && !keepLeads && (
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_white}`}
                onClick={() => {
                  setKeepLeads(true);
                  toast("Card added", {
                    detail: `Your Leads Tool carries on after the trial at ${money(leads.monthly)} a month.`,
                  });
                }}
              >
                Add a card
              </button>
            )}
          </div>
        </div>
        {leadsState === "TRIAL" && (
          <Progress
            value={leads.trialDays - daysLeft}
            max={leads.trialDays}
            label='Trial days used'
            tone='black'
          />
        )}
      </section>

      {/* Upgrade */}
      {plan?.id === "WEBSITE_ONLY" && (
        <section id='upgrade' className={styles.upgrade}>
          <div className={styles.upgradeText}>
            <span className={styles.upgradeMono}>Upgrade</span>
            <h2 className={styles.upgradeTitle}>
              Add booking to the site you have. No rebuild.
            </h2>
            <ul className={styles.upgradeList}>
              {[
                "Riders book and pay on your site, with $0 per-booking fees",
                "Dispatch, a driver app and flight tracking",
                "Payments straight to your own Stripe account",
                "The Leads Tool, included",
              ].map((item) => (
                <li key={item}>
                  <Icon name='check' />
                  <p>{item}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.upgradeSide}>
            <span className={styles.upgradePrice}>
              {money(upgrade.monthly)}
              <span>/month</span>
            </span>
            <p>
              Instead of {money(plan.monthly)}, from the day booking goes live.
              Your site stays up the whole time.
            </p>
            {upgradeAsked ? (
              <span className={styles.asked}>
                <Icon name='check' />
                Requested. Chris will email you within one business day.
              </span>
            ) : (
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_lime}`}
                onClick={() => {
                  setUpgradeAsked(true);
                  toast("Upgrade requested", {
                    detail: "Chris will email you within one business day.",
                  });
                }}
              >
                Request the upgrade
                <Icon name='arrow' className={ui.btnIcon} />
              </button>
            )}
          </div>
        </section>
      )}

      {/* Invoices */}
      <section className={styles.panel}>
        <div className={styles.titles}>
          <h2 className={styles.heading}>Invoices</h2>
          <p>
            A PDF for every payment, with your business name on it. Each one is
            also emailed to you the day the payment goes through.
          </p>
        </div>
        {invoices.length ? (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th scope='col'>Date</th>
                  <th scope='col'>Invoice</th>
                  <th scope='col'>Description</th>
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
                    <td className={styles.nowrap}>{fmtDate(invoice.date)}</td>
                    <td>
                      <span className={ui.monoMuted}>{invoice.number}</span>
                    </td>
                    <td>{invoice.description}</td>
                    <td>
                      <Pill
                        tone={invoice.status === "PAID" ? "lime" : "yellow"}
                        dot
                      >
                        {invoice.status === "PAID" ? "Paid" : "Due"}
                      </Pill>
                    </td>
                    <td className={styles.amount}>{money(invoice.amount)}</td>
                    <td>
                      <a
                        href={`/dashboard/billing/invoices/${invoice.id}`}
                        download={`${invoice.number}.pdf`}
                        className={styles.download}
                        data-no-transition
                      >
                        <Icon name='download' />
                        <span>PDF</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.small}>No invoices yet.</p>
        )}
      </section>

      <Modal isOpen={cancelling} onClose={() => setCancelling(false)}>
        {plan && (
          <div className={ui.modalBody}>
            <span className={ui.monoMuted}>Cancel plan</span>
            <h2 className={ui.modalTitle}>Cancel your {plan.name} plan?</h2>
            <p className={styles.small}>
              {plan.live && plan.nextBillingAt
                ? `It ends at the end of this billing month, on ${fmtDate(plan.nextBillingAt)}. Your site stays up until then, and we'll send an export of your content and data on request. Your domain stays yours.`
                : `We stop the build. The ${money(plan.setupFee)} setup fee isn't refundable once work has begun, and there's nothing else to pay.`}
            </p>
            <p className={styles.small}>
              If something isn&apos;t working, tell us first: most problems are
              a message away from fixed.
            </p>
            <div className={ui.modalActions}>
              <Link
                href='/dashboard/support'
                className={`${ui.btn} ${ui.btn_light}`}
              >
                Message us first
              </Link>
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_black}`}
                onClick={() => {
                  setCancelled(true);
                  setCancelling(false);
                  toast("Plan cancelled", {
                    tone: "info",
                    detail:
                      plan.live && plan.nextBillingAt
                        ? `It ends on ${fmtDate(plan.nextBillingAt)}. Change your mind anytime before then.`
                        : "We've stopped the build. Change your mind anytime.",
                  });
                }}
              >
                Cancel plan
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
