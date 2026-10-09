// The top of a client's page: who they are, their plan and where they
// are, how to reach them, and "View as client".

import Link from "next/link";
import styles from "./Client.module.css";
import Mark from "../Mark";
import Icon from "@/components/Dashboard/icons";
import { Pill, ui, type Tone } from "@/components/Dashboard/ui/ui";
import { viewAsClient } from "@/app/admin/actions";
import {
  clientKind,
  clientMrr,
  clientStage,
  kindLabel,
  type ClientKind,
} from "@/lib/admin/derive";
import { fmtDate, money } from "@/lib/dashboard/format";
import type { Client } from "@/lib/dashboard/types";

const kindTone: Record<ClientKind, Tone> = {
  NEW: "yellow",
  FULL_PLATFORM: "black",
  WEBSITE_ONLY: "lime",
  LEADS: "purple",
};

export default function Header({ client }: { client: Client }) {
  const kind = clientKind(client);
  const stage = clientStage(client);
  const w = client.website;
  const facts = [
    {
      label: "Monthly",
      value: clientMrr(client) ? money(clientMrr(client)) : "—",
    },
    { label: "Signed up", value: fmtDate(client.signedUpAt) },
    w?.facts.launchedAt
      ? { label: "Live since", value: fmtDate(w.facts.launchedAt) }
      : client.approvedAt
        ? { label: "Approved", value: fmtDate(client.approvedAt) }
        : { label: "Approved", value: "Not yet" },
    w?.status === "CANCELLED"
      ? { label: "Plan", value: "Ended" }
      : w?.status === "CANCELLING" && w.nextBillingAt
        ? {
            label: "Ends",
            value: fmtDate(
              new Date(new Date(w.nextBillingAt).getTime() - 86_400_000),
            ),
          }
        : w?.nextBillingAt && w.facts.setupFeePaidAt
          ? { label: "Next bill", value: fmtDate(w.nextBillingAt) }
          : client.leads.trialEndsAt && client.leads.status === "TRIAL"
            ? { label: "Trial ends", value: fmtDate(client.leads.trialEndsAt) }
            : { label: "Next bill", value: "—" },
  ];

  return (
    <header className={styles.header}>
      <Link href='/admin/clients' className={styles.back}>
        <Icon name='arrow' className={styles.backIcon} />
        All clients
      </Link>

      <div className={styles.headerMain}>
        <div className={styles.identity}>
          <Mark business={client.business} kind={kind} size='lg' />
          <div className={styles.identityText}>
            <h1 className={`h3 ${styles.business}`}>{client.business}</h1>
            <div className={styles.pills}>
              <Pill tone={kindTone[kind]}>{kindLabel[kind]}</Pill>
              <Pill tone='gray' dot>
                {stage.label}
                {stage.total ? ` · ${stage.done}/${stage.total}` : ""}
              </Pill>
              {w?.status === "PAST_DUE" && (
                <Pill tone='red' dot>
                  Payment failed
                </Pill>
              )}
              {w?.status === "CANCELLING" && (
                <Pill tone='red' dot>
                  Cancelling
                </Pill>
              )}
            </div>
            <p className={styles.contact}>
              <span>{client.contact.name}</span>
              <span className={styles.dot} aria-hidden='true' />
              <a href={`mailto:${client.contact.email}`}>
                {client.contact.email}
              </a>
              <span className={styles.dot} aria-hidden='true' />
              <a href={`tel:${client.contact.phone.replace(/[^\d+]/g, "")}`}>
                {client.contact.phone}
              </a>
              <span className={styles.dot} aria-hidden='true' />
              <span>{client.city}</span>
            </p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <form action={viewAsClient.bind(null, client.id)}>
            <button type='submit' className={`${ui.btn} ${ui.btn_black}`}>
              View as client
              <Icon name='eye' className={ui.btnIcon} />
            </button>
          </form>
          <a
            href={`mailto:${client.contact.email}`}
            className={`${ui.btn} ${ui.btn_light}`}
          >
            Email
            <Icon name='mail' className={ui.btnIcon} />
          </a>
        </div>
      </div>

      <dl className={styles.facts}>
        {facts.map((fact) => (
          <div key={fact.label} className={styles.fact}>
            <dt className={ui.monoMuted}>{fact.label}</dt>
            <dd className={styles.factValue}>{fact.value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
