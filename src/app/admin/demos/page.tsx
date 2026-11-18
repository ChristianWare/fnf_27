import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/dal";
import { PageHead, Notice } from "@/components/Dashboard/ui/ui";
import Stats from "@/components/Admin/Stats/Stats";
import Previews, { NewPreview } from "@/components/Admin/Previews/Previews";
import { listProspects } from "@/lib/prospects/store";
import { samplePreview } from "@/lib/demos/sample";

export const metadata: Metadata = { title: "Previews" };

/** How far along each sample is: opened, not yet, expiring, expired. */
const SHAPES = [1, 0, 1, 2, 0, 3, 1];

/** Admin → Previews: every demo site made for a prospect. Screens only for
 *  now: the rows are samples made from your prospects. */
export default async function DemosPage() {
  await requireAdmin();
  const now = new Date();
  const prospects = (await listProspects()).filter((p) => p.stage !== "DO_NOT_CALL");

  const rows = prospects
    .slice(0, SHAPES.length)
    .map((p, i) =>
      samplePreview(
        {
          id: p.id,
          business: p.business,
          contactName: p.contactName ?? "",
          phone: p.phone ?? "",
          state: p.state ?? "",
        },
        now,
        SHAPES[i],
      ),
    );

  const live = rows.filter((r) => r.status !== "EXPIRED");
  const opened = live.filter((r) => r.views > 0).length;
  const notOpened = live.filter((r) => r.views === 0).length;
  const expiring = rows.filter((r) => r.status === "EXPIRING").length;

  return (
    <>
      <PageHead
        crumb='Studio'
        title='Previews'
        text='The demo sites you’ve made for prospects. See who opened theirs and what they did, and who to call before theirs runs out.'
      >
        <NewPreview
          prospects={prospects.map((p) => ({
            id: p.id,
            business: p.business,
            place: [p.city, p.state].filter(Boolean).join(", "),
          }))}
        />
      </PageHead>
      <Notice>
        Sample data. Previews aren&apos;t built yet, so these are made up from your
        prospects to show how this page will work.
      </Notice>
      <Stats
        items={[
          { label: "Live", value: String(live.length), note: "Previews still up" },
          {
            label: "Opened",
            value: String(opened),
            note: `${notOpened} not opened yet`,
            tone: opened ? "lime" : undefined,
          },
          { label: "Expiring", value: String(expiring), note: "In the next 5 days" },
          { label: "Made", value: String(rows.length), note: "All time" },
        ]}
      />
      <Previews rows={rows} now={now.toISOString()} />
    </>
  );
}
