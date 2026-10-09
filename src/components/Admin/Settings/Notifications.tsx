"use client";

// What the studio emails you about, and whether invoices go to clients on
// their own. Your alerts are yours; the invoice switch is studio-wide.

import { useState } from "react";
import { useAction } from "@/components/Dashboard/useAction";
import { ui } from "@/components/Dashboard/ui/ui";
import { saveNotifications, setInvoiceEmails } from "@/app/admin/actions";
import styles from "./Settings.module.css";

const options = [
  {
    id: "signup",
    title: "New sign-up",
    text: "Someone confirms their email: a website plan to approve, or a Leads Tool trial.",
  },
  {
    id: "payment",
    title: "A payment comes in",
    text: "A setup fee, a monthly bill or a Leads Tool charge.",
  },
  {
    id: "failed",
    title: "A payment fails, or a plan is cancelled",
    text: "A card is declined on the 1st, or a client cancels or stays.",
  },
  {
    id: "message",
    title: "A client sends a message",
    text: "From their Support page, or a comment on their blueprint.",
  },
  {
    id: "change",
    title: "A new change request",
    text: "From a live site's Change requests page.",
  },
  {
    id: "document",
    title: "A document is signed",
    text: "Their agreement, or anything else you sent to sign.",
  },
  {
    id: "blueprint",
    title: "Build steps",
    text: "A questionnaire comes in, a design is chosen, a blueprint is approved.",
  },
  {
    id: "digest",
    title: "A morning summary",
    text: "Everything waiting on you, at 7am Arizona time.",
  },
  {
    id: "leads",
    title: "The studio's morning leads",
    text: "Your own Leads Tool's Today page, at 6am Arizona time.",
  },
];

export default function Notifications({
  email,
  prefs,
  invoiceEmails,
}: {
  email: string;
  /** Your saved choices. Missing means on. */
  prefs: Record<string, boolean>;
  invoiceEmails: boolean;
}) {
  const { run, pending } = useAction();
  const initial = Object.fromEntries(
    options.map((o) => [o.id, prefs[o.id] !== false]),
  );
  const [saved, setSaved] = useState<Record<string, boolean>>(initial);
  const [on, setOn] = useState(saved);
  const [invoices, setInvoices] = useState(invoiceEmails);
  const changed = options.some((o) => on[o.id] !== saved[o.id]);

  return (
    <section id='notifications' className={styles.panel}>
      <div className={styles.titles}>
        <h2 className={styles.heading}>Email me when</h2>
        <p>Sent to {email}.</p>
      </div>

      <ul className={styles.toggles}>
        {options.map((o) => (
          <li key={o.id} className={styles.toggle}>
            <span className={styles.toggleText}>
              <span className={styles.toggleTitle}>{o.title}</span>
              <p>{o.text}</p>
            </span>
            <button
              type='button'
              role='switch'
              aria-checked={on[o.id]}
              aria-label={o.title}
              className={ui.switch}
              onClick={() => setOn((v) => ({ ...v, [o.id]: !v[o.id] }))}
            />
          </li>
        ))}
      </ul>

      <div className={styles.actionsEnd}>
        <button
          type='button'
          className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
          disabled={!changed || pending}
          onClick={() =>
            run(
              () => saveNotifications(on),
              () => {
                setSaved(on);
                return {
                  message: "Notifications saved",
                  detail: `Emails go to ${email}.`,
                };
              },
            )
          }
        >
          Save
        </button>
      </div>

      <div className={styles.invoiceSwitch}>
        <span className={styles.toggleText}>
          <span className={styles.toggleTitle}>Email invoices to clients</span>
          <p>
            Every payment sends the branded PDF on its own. Turn it off to send
            them yourself.
          </p>
        </span>
        <button
          type='button'
          role='switch'
          aria-checked={invoices}
          aria-label='Email invoices to clients'
          className={ui.switch}
          disabled={pending}
          onClick={() => {
            const next = !invoices;
            setInvoices(next);
            run(
              () => setInvoiceEmails(next),
              () => ({
                message: next
                  ? "Invoices go out on their own"
                  : "Invoices paused",
                tone: next ? "success" : "info",
                detail: next
                  ? "Clients get the PDF the moment a payment goes through."
                  : "Download them from each client's Billing tab to send yourself.",
              }),
              () => setInvoices(!next),
            );
          }}
        />
      </div>
    </section>
  );
}
