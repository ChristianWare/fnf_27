// The audit's emails: the full report to the operator (with the PDF), and
// the studio's alerts when someone runs the audit on the public page and
// when they ask for the full report. Admins turn the alerts on and off on
// Settings → Notifications ("Someone runs the free audit"). Server only.

import { url, STUDIO } from "@/lib/server/config";
import { render, sendEmail } from "@/lib/server/email";
import { alertAdmins } from "@/lib/server/notify";
import { pdfFileName, renderAuditPdf } from "./pdf";
import { getAudit, type AuditRow } from "./store";
import { toView } from "./view";

export const reportUrl = (id: string) => url(`/audit/report/${id}`);

const label = (row: AuditRow) => row.domain ?? row.business ?? row.input;

function phoneOf(row: AuditRow) {
  if (row.listing?.phone) return row.listing.phone;
  const d = row.facts?.phones?.[0];
  return d ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : undefined;
}

/** When the public page's audit finishes: the score and how to reach them. */
export async function alertAuditRun(id: string) {
  const row = await getAudit(id);
  if (!row || row.status !== "DONE") return;
  const view = toView(row, { admin: true });
  const phone = phoneOf(row);
  const top = view.top[0];
  await alertAdmins(
    "audit",
    `Audit: ${label(row)} scored ${row.score ?? "–"}`,
    {
      eyebrow: "Free audit",
      heading: `${view.business} ran the audit: ${row.score ?? "–"}/100`,
      preheader: top ? `Biggest gap: ${top.name}` : undefined,
      paragraphs: [
        `${view.band?.label ?? "Scored"}. ${view.summary ?? ""}`.trim(),
        "They haven't asked for the full report yet. If they do, you'll get their email in a second alert.",
      ],
      details: [
        ["Website", row.domain ?? "None"],
        [
          "Google listing",
          row.listing
            ? `${row.listing.name}, ${row.listing.reviews} reviews`
            : "Not found",
        ],
        ...(phone ? ([["Phone", phone]] as [string, string][]) : []),
        ...(view.place ? ([["City", view.place]] as [string, string][]) : []),
        ...(top ? ([["Biggest gap", top.name]] as [string, string][]) : []),
      ],
      button: {
        label: "Open it in the admin",
        href: url(`/admin/audits/${row.id}`),
      },
    },
    `Audit: ${label(row)} ${row.score ?? "–"}/100${phone ? ` · ${phone}` : ""}`,
  );
}

/** When they give their email for the full report. */
export async function alertFullReport(row: AuditRow) {
  await alertAdmins(
    "audit",
    `${row.name || "Someone"} asked for the full report: ${label(row)}`,
    {
      eyebrow: "Free audit",
      heading: `${row.name || "Someone"} wants the full report for ${label(row)}`,
      paragraphs: [
        `It scored ${row.score ?? "–"}/100. The report and its PDF went to ${row.email}.`,
      ],
      details: [
        ["Name", row.name || "–"],
        ["Email", row.email || "–"],
        ["Website", row.domain ?? "None"],
        ...(phoneOf(row)
          ? ([["Phone", phoneOf(row)!]] as [string, string][])
          : []),
      ],
      button: {
        label: "Open it in the admin",
        href: url(`/admin/audits/${row.id}`),
      },
    },
    `Full report: ${label(row)} · ${row.email}`,
  );
}

/** The full report, to the address they gave, with the PDF attached. */
export async function sendReport(row: AuditRow, to: string, name?: string) {
  const view = toView(row, { admin: true });
  const link = reportUrl(row.id);
  const pdf = await renderAuditPdf(view, link);
  const first = (name ?? "").trim().split(" ")[0];
  const where = row.domain ?? view.business;
  const { html, text } = render({
    eyebrow: "Your free audit",
    heading: first
      ? `${first}, here's your full report`
      : "Here's your full report",
    preheader: `${where} scored ${row.score ?? "–"} out of 100.`,
    paragraphs: [
      `${where} scored ${row.score ?? "–"} out of 100 (${view.band?.label.toLowerCase() ?? "scored"}). ${view.top.length ? "What's costing you the most:" : ""}`.trim(),
      ...view.top.map((t, i) => `${i + 1}. ${t.name}: ${t.found}`),
    ],
    button: { label: "Open your report", href: link },
    after: [
      `The full report is attached as a PDF, so you can forward it to whoever handles your ${row.url ? "website" : "marketing"}. Every check is in it, with what we found and the fix.`,
      "I read every audit that comes through. If you'd like to go through yours on a 20-minute call, just reply to this email. No pitch if it's not a fit.",
      "Chris Ware, Fonts & Footers",
    ],
    reason:
      "You're getting this because you asked for your audit report on fontsandfooters.com.",
  });
  const file = pdfFileName(view);
  return sendEmail({
    to,
    subject: `Your website audit: ${row.score ?? "–"}/100 for ${where}`,
    html,
    text,
    replyTo: STUDIO.replyTo,
    attachments: [{ filename: file, content: new Uint8Array(pdf) }],
  });
}
