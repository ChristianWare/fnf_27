"use client";

// Every saved lead by stage, from first contact to won. Move one with the
// menu on its card; winning one asks what it's worth.

import Link from "next/link";
import { useState } from "react";
import Icon from "../icons";
import { ButtonLink, PageHead, ui } from "../ui/ui";
import { useToast } from "../Toast/Toast";
import { useLeads } from "./Store";
import { kindOf, Tile, WinDialog } from "./bits";
import styles from "./Leads.module.css";
import { wonValue } from "@/lib/leads/advice";
import { STAGES } from "@/lib/leads/catalog";
import type { LeadStage } from "@/lib/leads/types";
import { dayKey, fmtWeekday, money } from "@/lib/dashboard/format";

const cell = (value: string) =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export default function Pipeline() {
  const leads = useLeads();
  const { now, saved, target, monthly, access, href } = leads;
  const toast = useToast();
  const [winning, setWinning] = useState<string | null>(null);

  const rows = saved
    .map((lead) => ({ lead, t: target(lead.targetId) }))
    .filter((r): r is { lead: typeof r.lead; t: NonNullable<typeof r.t> } =>
      Boolean(r.t),
    );
  const won = wonValue(saved);
  const reached = saved.filter((l) =>
    l.activity.some((a) => ["EMAIL", "TEXT", "CALL", "MET"].includes(a.kind)),
  ).length;
  const talking = saved.filter((l) => l.stage === "TALKING").length;

  const move = async (id: string, stage: LeadStage) => {
    if (stage === "WON") {
      setWinning(id);
      return;
    }
    if (await leads.setStage(id, stage))
      toast(`Moved to ${STAGES.find((s) => s.id === stage)?.label}`, {
        tone: "info",
      });
  };

  const exportCsv = () => {
    const lines = [
      [
        "Lead",
        "Kind",
        "Stage",
        "Contact",
        "Title",
        "Email",
        "Phone",
        "Follow up",
        "Worth",
      ],
      ...rows.map(({ lead, t }) => [
        t.name,
        kindOf(t),
        STAGES.find((s) => s.id === lead.stage)?.label ?? lead.stage,
        t.contact?.name ?? "",
        t.contact?.title ?? "",
        t.contact?.email ?? "",
        t.contact?.phone ?? t.phone ?? "",
        lead.remindAt ? dayKey(lead.remindAt) : "",
        lead.value ? `${lead.value}${lead.per === "MONTH" ? "/mo" : ""}` : "",
      ]),
    ];
    const csv = lines.map((line) => line.map(cell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${rows.length} leads`, {
      detail: "A CSV for your CRM or spreadsheet, in your downloads.",
    });
  };

  return (
    <>
      <PageHead
        crumb='Leads'
        title='Pipeline'
        text='Every lead you’ve saved, from first contact to won account. Move one with the menu on its card.'
      >
        <button
          type='button'
          className={`${ui.btn} ${ui.btn_light}`}
          onClick={exportCsv}
          disabled={!rows.length}
        >
          Export CSV
          <Icon name='download' className={ui.btnIcon} />
        </button>
        <ButtonLink href={href("find")} icon='search'>
          Find leads
        </ButtonLink>
      </PageHead>

      <dl className={styles.summary}>
        <div className={styles.sumTile}>
          <dt>Saved</dt>
          <dd>{saved.length}</dd>
        </div>
        <div className={styles.sumTile}>
          <dt>Reached out</dt>
          <dd>{reached}</dd>
        </div>
        <div className={styles.sumTile}>
          <dt>Talking</dt>
          <dd>{talking}</dd>
        </div>
        <div className={`${styles.sumTile} ${styles.sumWon}`}>
          <dt>Won</dt>
          <dd>
            {money(won.monthly)}
            <span>/mo</span>
          </dd>
          <dd className={styles.sumNote}>
            {access === "STUDIO"
              ? "Free for the studio"
              : access === "INCLUDED"
                ? "Included with your plan"
                : won.monthly
                  ? `About ${won.monthly / monthly >= 10 ? Math.round(won.monthly / monthly) : (won.monthly / monthly).toFixed(1)}× the tool's cost`
                  : "Your first win shows here"}
          </dd>
        </div>
      </dl>

      <div className={styles.board}>
        {STAGES.map((s) => {
          const list = rows.filter((r) => r.lead.stage === s.id);
          return (
            <section key={s.id} className={styles.lane}>
              <div className={`${styles.laneHead} ${styles[`lane_${s.tone}`]}`}>
                <span className={styles.laneTitle}>{s.label}</span>
                <span className={styles.laneCount}>{list.length}</span>
              </div>
              {list.length ? (
                <ul className={styles.cards}>
                  {list.map(({ lead, t }) => {
                    const overdue =
                      lead.remindAt && dayKey(lead.remindAt) < dayKey(now);
                    return (
                      <li key={lead.targetId} className={styles.card}>
                        <Link href={href(t.id)} className={styles.cardMain}>
                          <Tile target={t} now={now} />
                          <span className={styles.itemText}>
                            <span className={styles.itemName}>{t.name}</span>
                            <span className={styles.itemKind}>{kindOf(t)}</span>
                          </span>
                        </Link>
                        <div className={styles.cardFoot}>
                          <span
                            className={`${styles.cardNext} ${overdue ? styles.cardOverdue : ""}`}
                          >
                            {lead.stage === "WON"
                              ? lead.value
                                ? `${money(lead.value)}${lead.per === "MONTH" ? "/mo" : ""}`
                                : "Won"
                              : lead.remindAt
                                ? overdue
                                  ? `Overdue · ${fmtWeekday(lead.remindAt)}`
                                  : dayKey(lead.remindAt) === dayKey(now)
                                    ? "Follow up today"
                                    : `Follow up ${fmtWeekday(lead.remindAt)}`
                                : lead.stage === "NOT_NOW"
                                  ? "Parked"
                                  : "No reminder"}
                          </span>
                          <label className={styles.moveLabel}>
                            <span className={ui.srOnly}>Move {t.name}</span>
                            <select
                              className={styles.move}
                              value={lead.stage}
                              onChange={(e) =>
                                move(t.id, e.target.value as LeadStage)
                              }
                            >
                              {STAGES.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className={styles.laneEmpty}>Nothing here.</p>
              )}
            </section>
          );
        })}
      </div>

      {winning && (
        <WinDialog id={winning} open onClose={() => setWinning(null)} />
      )}
    </>
  );
}
