import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ButtonLink, PageHead, Panel } from "@/components/Dashboard/ui/ui";
import AuditAdmin from "@/components/Admin/Audits/AuditAdmin";
import AuditReport from "@/components/AuditPage/AuditReport/AuditReport";
import SemrushUpload from "@/components/Admin/Audits/SemrushUpload";
import CompareUpload from "@/components/Admin/Audits/CompareUpload";
import { semrushWarnings } from "@/lib/audit/semrush/types";
import styles from "@/components/Admin/Audits/Audits.module.css";
import { getAdmin } from "@/lib/admin";
import { fmtDate, fmtTime } from "@/lib/dashboard/format";
import { sampleId } from "@/lib/audit/sample";
import { hostOf } from "@/lib/audit/searches";
import { getAudit } from "@/lib/audit/store";
import { toView } from "@/lib/audit/view";
import { formStamp } from "@/lib/server/spam";

// "Run it again" starts a run inside this page's time limit.
export const maxDuration = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const row = await getAudit((await params).id);
  return { title: row?.business ?? row?.domain ?? "Audit" };
}

const phone = (d: string) =>
  `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;

export default async function AuditAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await getAdmin();
  const row = await getAudit(id);
  if (!row || row.status === "CONFIRM") notFound();
  const view = toView(row, { admin: true });
  const sample = (await sampleId()) === row.id;
  const facts = row.facts;

  const contact: [string, ReactNode][] = [
    [
      "Ran",
      `${fmtDate(row.createdAt)} at ${fmtTime(row.createdAt)}${row.source === "ADMIN" ? ", by you" : ", from the page"}`,
    ],
    ...(row.name || row.email
      ? ([
          [
            "Asked for the report",
            `${row.name ?? ""} ${row.email ? `<${row.email}>` : ""}`.trim(),
          ],
        ] as [string, ReactNode][])
      : []),
    ...(row.listing?.phone
      ? ([["Phone (listing)", row.listing.phone]] as [string, ReactNode][])
      : []),
    ...(facts?.phones?.length
      ? ([["Phone (site)", facts.phones.slice(0, 2).map(phone).join(", ")]] as [
          string,
          ReactNode,
        ][])
      : []),
    ...(facts?.emails?.length
      ? ([["Email (site)", facts.emails.slice(0, 2).join(", ")]] as [
          string,
          ReactNode,
        ][])
      : []),
    ...(row.url
      ? ([
          [
            "Website",
            <a key='w' href={row.url} target='_blank' rel='noopener noreferrer'>
              {row.domain}
            </a>,
          ],
        ] as [string, ReactNode][])
      : []),
    ...(row.listing?.mapsUrl
      ? ([
          [
            "Google listing",
            <a
              key='g'
              href={row.listing.mapsUrl}
              target='_blank'
              rel='noopener noreferrer'
            >
              {row.listing.name}
            </a>,
          ],
        ] as [string, ReactNode][])
      : []),
  ];
  const listed = row.listing?.website ? hostOf(row.listing.website) : undefined;
  const site: [string, string][] = row.url
    ? [
        ...(facts?.platform
          ? ([["Built on", facts.platform]] as [string, string][])
          : []),
        ...(facts?.bookingSystem
          ? ([["Booking", facts.bookingSystem]] as [string, string][])
          : []),
        ...(facts?.analytics?.length
          ? ([["Stats", facts.analytics.join(", ")]] as [string, string][])
          : []),
        ...(facts
          ? ([
              [
                "Pages read",
                facts.sitemapUrls
                  ? `${facts.pagesRead} of ${facts.sitemapUrls} in the sitemap`
                  : `${facts.pagesRead} (no sitemap)`,
              ],
            ] as [string, string][])
          : []),
        ...(facts?.services?.length
          ? ([["Rides", facts.services.join(", ").replace(/_/g, " ")]] as [
              string,
              string,
            ][])
          : []),
      ]
    : [
        [
          "Website",
          listed
            ? `None of their own (the listing links to ${listed})`
            : "None",
        ],
      ];
  site.push([
    "Cost",
    `$${(row.costMicros / 1_000_000).toFixed(2)} at list price`,
  ]);
  if (row.reusedFrom)
    site.push([
      "Copied from",
      row.url
        ? "A run of the same site in the last day"
        : "A run of the same listing in the last day",
    ]);

  return (
    <>
      <PageHead
        crumb='Audits'
        title={view.business}
        text={[
          row.domain,
          view.place,
          row.status === "DONE" ? `${row.score}/100` : row.status.toLowerCase(),
        ]
          .filter(Boolean)
          .join(" · ")}
      >
        <ButtonLink
          href={`/audit/report/${row.id}`}
          variant='light'
          icon='arrowUpRight'
        >
          Open the report page
        </ButtonLink>
        {row.status === "DONE" && (
          <ButtonLink
            href={`/audit/report/${row.id}/pdf`}
            variant='light'
            icon='download'
          >
            PDF
          </ButtonLink>
        )}
      </PageHead>

      <AuditAdmin
        id={row.id}
        followUp={row.followUp}
        notes={row.notes}
        sample={sample}
        done={row.status === "DONE"}
        reportPath={`/audit/report/${row.id}`}
      />

      <SemrushUpload
        id={row.id}
        domain={row.domain ?? ""}
        files={row.semrush?.files ?? []}
        warnings={row.semrush ? semrushWarnings(row.semrush) : []}
      />

      <CompareUpload id={row.id} compare={row.compare ?? null} />

      <div className={styles.detailGrid}>
        <Panel title='Reaching them'>
          <dl className={styles.facts}>
            {contact.map(([label, value]) => (
              <div key={label} style={{ display: "contents" }}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title='Their site'>
          <dl className={styles.facts}>
            {site.map(([label, value]) => (
              <div key={label} style={{ display: "contents" }}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>

      <div className={styles.report}>
        <AuditReport view={view} stamp={formStamp()} admin />
      </div>
    </>
  );
}
