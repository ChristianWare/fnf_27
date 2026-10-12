import type { Metadata } from "next";
import { PageHead } from "@/components/Dashboard/ui/ui";
import Stats from "@/components/Admin/Stats/Stats";
import RunAudit from "@/components/Admin/Audits/RunAudit";
import AuditsTable, {
  type AuditRowView,
} from "@/components/Admin/Audits/AuditsTable";
import { getAdmin } from "@/lib/admin";
import { aiReady } from "@/lib/audit/ai";
import { seoReady } from "@/lib/audit/apis/dataforseo";
import { placesReady } from "@/lib/audit/apis/places";
import { sampleId } from "@/lib/audit/sample";
import { listAudits } from "@/lib/audit/store";

export const metadata: Metadata = { title: "Audits" };
// "A list" runs each audit to the end inside one call.
export const maxDuration = 300;

const dollars = (micros: number) =>
  micros >= 10_000_000
    ? `$${Math.round(micros / 1_000_000)}`
    : `$${(micros / 1_000_000).toFixed(2)}`;

export default async function AuditsPage() {
  const { now } = await getAdmin();
  const [rows, sample] = await Promise.all([listAudits(), sampleId()]);

  const monthStart = new Date(now);
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(7, 0, 0, 0);
  const month = rows.filter((r) => r.createdAt >= monthStart);
  const done = month.filter((r) => r.status === "DONE" && r.score !== null);
  const fromPage = month.filter((r) => r.source === "PAGE");
  const reports = month.filter((r) => r.unlockedAt && r.source === "PAGE");
  const spend = month.reduce((sum, r) => sum + r.costMicros, 0);
  const fresh = rows.filter(
    (r) => r.source === "PAGE" && r.followUp === "NEW" && r.status === "DONE",
  ).length;
  const average = done.length
    ? Math.round(done.reduce((sum, r) => sum + (r.score ?? 0), 0) / done.length)
    : undefined;

  const view: AuditRowView[] = rows
    .filter((r) => r.status !== "CONFIRM")
    .map((r) => ({
      id: r.id,
      business: r.business || r.domain || r.input,
      sub: [r.domain, r.city && r.state ? `${r.city}, ${r.state}` : r.city]
        .filter(Boolean)
        .join(" · "),
      score: r.score,
      status: r.status as AuditRowView["status"],
      source: r.source,
      followUp: r.followUp,
      contact: r.email || r.listing?.phone || "",
      createdAt: r.createdAt.toISOString(),
      sample: r.id === sample,
    }));

  return (
    <>
      <PageHead
        crumb='Studio'
        title='Audits'
        text='Every free audit: who ran it, how they scored, and where you are with them. Run one for an operator before a call and text them the link.'
      />
      <Stats
        items={[
          {
            label: "This month",
            value: String(month.length),
            note: `${fromPage.length} from the page, ${month.length - fromPage.length} by you${
              average !== undefined ? `; average score ${average}` : ""
            }`,
          },
          {
            label: "Waiting on you",
            value: String(fresh),
            note: "From the page, marked New",
            tone: fresh ? "yellow" : undefined,
          },
          {
            label: "Asked for the report",
            value: String(reports.length),
            note: fromPage.length
              ? `${Math.round((reports.length / fromPage.length) * 100)}% of the page's runs`
              : "Gave their email this month",
          },
          {
            label: "Spend",
            value: dollars(spend),
            note: month.length
              ? `About ${dollars(spend / month.length)} a run, at list price`
              : "At list price",
            tone: "black",
          },
        ]}
      />
      <RunAudit
        services={[
          {
            name: "Google listing",
            on: placesReady(),
            note: "GOOGLE_MAPS_SERVER_KEY with Places API (New)",
          },
          {
            name: "Speed test",
            on: Boolean(process.env.PAGESPEED_API_KEY),
            note: "PAGESPEED_API_KEY (without it, Google's shared limit)",
          },
          {
            name: "Searches",
            on: seoReady(),
            note: "DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD",
          },
          { name: "AI", on: aiReady(), note: "ANTHROPIC_API_KEY" },
        ]}
      />
      <AuditsTable rows={view} now={now} />
    </>
  );
}
