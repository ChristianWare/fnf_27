"use client";

// What the studio emails you about, and whether invoices go to clients on
// their own. SAMPLE: saving shows the toast; after the move it saves.

import { useState } from "react";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { ui } from "@/components/Dashboard/ui/ui";
import styles from "./Settings.module.css";

const options = [
  {
    id: "signup",
    title: "New sign-up",
    text: "Someone signs up and is waiting for approval.",
    on: true,
  },
  {
    id: "failed",
    title: "A payment fails",
    text: "A card is declined on the 1st, or a retry fails.",
    on: true,
  },
  {
    id: "message",
    title: "A client sends a message",
    text: "From their Support page.",
    on: true,
  },
  {
    id: "change",
    title: "A new change request",
    text: "From a live site's Change requests page.",
    on: true,
  },
  {
    id: "blueprint",
    title: "A blueprint is approved",
    text: "Every section on a page signed off.",
    on: false,
  },
  {
    id: "digest",
    title: "A morning summary",
    text: "Everything waiting on you, at 7am Arizona time.",
    on: true,
  },
];

export default function Notifications({ email }: { email: string }) {
  const toast = useToast();
  const initial = Object.fromEntries(options.map((o) => [o.id, o.on]));
  const [saved, setSaved] = useState<Record<string, boolean>>(initial);
  const [on, setOn] = useState(saved);
  const [invoices, setInvoices] = useState(true);
  const changed = options.some((o) => on[o.id] !== saved[o.id]);

  return (
    <section className={styles.panel}>
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
          disabled={!changed}
          onClick={() => {
            setSaved(on);
            toast("Notifications saved", { detail: `Emails go to ${email}.` });
          }}
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
          onClick={() => {
            const next = !invoices;
            setInvoices(next);
            toast(next ? "Invoices go out on their own" : "Invoices paused", {
              tone: next ? "success" : "info",
              detail: next
                ? "Clients get the PDF the moment a payment goes through."
                : "Download them from each client's Billing tab to send yourself.",
            });
          }}
        />
      </div>
    </section>
  );
}
