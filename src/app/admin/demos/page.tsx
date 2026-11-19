import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/dal";
import { PageHead, Notice } from "@/components/Dashboard/ui/ui";
import Stats from "@/components/Admin/Stats/Stats";
import Previews, { NewPreview } from "@/components/Admin/Previews/Previews";
import { listProspects } from "@/lib/prospects/store";
import { EXPIRING_DAYS, toPreviewView, type PreviewView } from "@/lib/demos/preview";
import {
  NOT_SET_UP,
  PlatformError,
  isGone,
  listPlatformDemos,
  platformReady,
} from "@/lib/demos/platform";

export const metadata: Metadata = { title: "Previews" };

/** Admin → Previews: every demo site made for a prospect, from the demo
 *  platform (fnf-demos). */
export default async function DemosPage() {
  await requireAdmin();
  const now = new Date();
  const everyone = await listProspects();
  const prospects = everyone.filter((p) => p.stage !== "DO_NOT_CALL");
  const known = new Set(everyone.map((p) => p.id));

  let rows: PreviewView[] = [];
  let issue: string | null = null;
  if (!platformReady()) {
    issue = NOT_SET_UP;
  } else {
    try {
      // Deleted previews, and ones whose prospect was deleted, aren't listed.
      rows = (await listPlatformDemos())
        .filter((d) => !isGone(d) && known.has(d.ref))
        .map((d) => toPreviewView(d, now));
    } catch (e) {
      issue = e instanceof PlatformError ? e.message : "The previews couldn't be loaded.";
    }
  }

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
      {issue && <Notice>{issue}</Notice>}
      <Stats
        items={[
          { label: "Live", value: String(live.length), note: "Previews still up" },
          {
            label: "Opened",
            value: String(opened),
            note: `${notOpened} not opened yet`,
            tone: opened ? "lime" : undefined,
          },
          { label: "Expiring", value: String(expiring), note: `In the next ${EXPIRING_DAYS} days` },
          { label: "Made", value: String(rows.length), note: "All time" },
        ]}
      />
      <Previews rows={rows} now={now.toISOString()} />
    </>
  );
}
