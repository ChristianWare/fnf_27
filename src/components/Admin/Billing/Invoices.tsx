"use client";

// Every invoice from every client: search, filter by status or month,
// download the branded PDF, or export what's showing as a CSV for the
// books.

import Link from "next/link";
import { useMemo, useState } from "react";
import Mark from "../Mark";
import Icon from "@/components/Dashboard/icons";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { Pill, ui } from "@/components/Dashboard/ui/ui";
import type { ClientKind, InvoiceRow } from "@/lib/admin/derive";
import {
  dayKey,
  fmtDate,
  fmtMonthLong,
  fmtShort,
  money,
} from "@/lib/dashboard/format";
import styles from "./Billing.module.css";

export type InvoiceListRow = InvoiceRow & { kind: ClientKind };

type Status = "all" | "PAID" | "DUE";

const PAGE = 20;

const cell = (value: string) =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export default function Invoices({ rows }: { rows: InvoiceListRow[] }) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [month, setMonth] = useState("all");
  const [limit, setLimit] = useState(PAGE);

  // Months that have invoices, newest first, as "2026-10".
  const months = useMemo(
    () =>
      [...new Set(rows.map((r) => dayKey(r.date).slice(0, 7)))]
        .sort()
        .reverse(),
    [rows],
  );

  const shown = rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (month !== "all" && !dayKey(r.date).startsWith(month)) return false;
    const q = query.trim().toLowerCase();
    return (
      !q ||
      r.business.toLowerCase().includes(q) ||
      r.number.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q)
    );
  });
  const paid = shown
    .filter((r) => r.status === "PAID")
    .reduce((sum, r) => sum + r.amount, 0);
  const due = shown
    .filter((r) => r.status === "DUE")
    .reduce((sum, r) => sum + r.amount, 0);

  const exportCsv = () => {
    const lines = [
      [
        "Date",
        "Invoice",
        "Client",
        "For",
        "Status",
        "Amount",
        "Paid on",
        "Paid with",
      ],
      ...shown.map((r) => [
        dayKey(r.date),
        r.number,
        r.business,
        r.description,
        r.status === "PAID" ? "Paid" : "Due",
        r.amount.toFixed(2),
        r.paidAt ? dayKey(r.paidAt) : "",
        r.status === "PAID" ? (r.method ?? "") : "",
      ]),
    ];
    const csv = lines.map((line) => line.map(cell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `fnf-invoices-${month === "all" ? "all" : month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${shown.length} invoice${shown.length === 1 ? "" : "s"}`, {
      detail: "A CSV for your bookkeeping, in your downloads.",
    });
  };

  const counts = {
    all: rows.length,
    PAID: rows.filter((r) => r.status === "PAID").length,
    DUE: rows.filter((r) => r.status === "DUE").length,
  };

  return (
    <section className={styles.invoices}>
      <div className={styles.invoicesHead}>
        <div className={styles.titles}>
          <h2 className={styles.heading}>Invoices</h2>
          <p>
            Every client&apos;s invoices, the same branded PDFs they get by
            email.
          </p>
        </div>
        <button
          type='button'
          className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
          onClick={exportCsv}
          disabled={!shown.length}
        >
          Export CSV
          <Icon name='download' className={ui.btnIcon} />
        </button>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Icon name='search' className={styles.searchIcon} />
          <span className={ui.srOnly}>Search invoices</span>
          <input
            className={ui.input}
            type='search'
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(PAGE);
            }}
            placeholder='Client, invoice number or plan'
          />
        </label>
        <div className={styles.chips} role='group' aria-label='Status'>
          {(
            [
              ["all", "All"],
              ["PAID", "Paid"],
              ["DUE", "Due"],
            ] as const
          ).map(([key, text]) => (
            <button
              key={key}
              type='button'
              className={ui.chip}
              aria-pressed={status === key}
              onClick={() => {
                setStatus(key);
                setLimit(PAGE);
              }}
            >
              {text}
              <span className={styles.count}>{counts[key]}</span>
            </button>
          ))}
        </div>
        <label className={styles.month}>
          <span className={ui.srOnly}>Month</span>
          <select
            className={ui.select}
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setLimit(PAGE);
            }}
          >
            <option value='all'>Every month</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {fmtMonthLong(`${m}-15T12:00:00Z`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {shown.length ? (
        <>
          <div className={ui.tableWrap}>
            <table className={`${ui.table} ${styles.table}`}>
              <thead>
                <tr>
                  <th scope='col'>Date</th>
                  <th scope='col'>Client</th>
                  <th scope='col' className={styles.hideMd}>
                    For
                  </th>
                  <th scope='col' className={styles.hideSm}>
                    Invoice
                  </th>
                  <th scope='col' className={styles.hideXs}>
                    Status
                  </th>
                  <th scope='col'>Amount</th>
                  <th scope='col'>
                    <span className={ui.srOnly}>Download</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, limit).map((r) => (
                  <tr key={`${r.clientId}-${r.id}`}>
                    <td className={styles.nowrap}>
                      <span title={fmtDate(r.date)}>{fmtShort(r.date)}</span>
                    </td>
                    <td>
                      <Link
                        href={`/admin/clients/${r.clientId}?tab=billing`}
                        className={styles.client}
                      >
                        <Mark business={r.business} kind={r.kind} size='sm' />
                        <span className={styles.clientName}>{r.business}</span>
                      </Link>
                    </td>
                    <td className={styles.hideMd}>{r.description}</td>
                    <td className={styles.hideSm}>
                      <span className={ui.monoMuted}>{r.number}</span>
                    </td>
                    <td className={styles.hideXs}>
                      <Pill tone={r.status === "PAID" ? "lime" : "red"} dot>
                        {r.status === "PAID" ? "Paid" : "Due"}
                      </Pill>
                    </td>
                    <td className={styles.nowrap}>
                      {money(r.amount)}
                      {r.status === "DUE" && (
                        <span className={styles.dueXs}>Due</span>
                      )}
                    </td>
                    <td>
                      <a
                        href={`/admin/clients/${r.clientId}/invoices/${r.id}`}
                        download={`${r.number}.pdf`}
                        className={styles.pdf}
                        data-no-transition
                        aria-label={`Download ${r.number} as a PDF`}
                      >
                        <Icon name='download' />
                        <span className={styles.pdfText}>PDF</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.tableFoot}>
            <span className={ui.monoMuted}>
              {shown.length} invoice{shown.length === 1 ? "" : "s"} ·{" "}
              {money(Math.round(paid * 100) / 100)} paid
              {due ? ` · ${money(due)} due` : ""}
            </span>
            {shown.length > limit && (
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                onClick={() => setLimit((n) => n + PAGE)}
              >
                Show {Math.min(PAGE, shown.length - limit)} more
              </button>
            )}
          </div>
        </>
      ) : (
        <p className={styles.none}>No invoices match.</p>
      )}
    </section>
  );
}
