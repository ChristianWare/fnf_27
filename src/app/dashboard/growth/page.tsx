import type { Metadata } from "next";
import Growth from "@/components/Dashboard/Growth/Growth";
import {
  ButtonLink,
  Empty,
  NoWebsite,
  PageHead,
  Panel,
} from "@/components/Dashboard/ui/ui";
import { getDashboard, isLive, weekOf } from "@/lib/dashboard";
import { dayKey } from "@/lib/dashboard/format";
import { isDay, todayAz } from "@/lib/growth/dates";
import { domainOf } from "@/lib/growth/searchConsole";
import { loadReviews, loadSeries, loadVisits } from "@/lib/growth/load";
import { RANGES, type RangeKey } from "@/lib/growth/traffic";

export const metadata: Metadata = { title: "Growth" };

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** "https://example.com", for links to the pages people land on. */
function siteUrl(site: { domain?: string | null; liveUrl?: string | null }) {
  const domain = domainOf({
    domain: site.domain ?? null,
    liveUrl: site.liveUrl ?? null,
  });
  return domain ? `https://${domain}` : undefined;
}

export default async function GrowthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { client, now } = await getDashboard();
  if (!client.website) return <NoWebsite crumb='Your website' title='Growth' />;

  const head = (
    <PageHead
      crumb='Your website'
      title='Growth'
      text='Everyone who visits your site by day, week or month, where they come from, and how you show up on Google, against your 12-month plan.'
    />
  );

  if (!isLive(client))
    return (
      <>
        {head}
        <Panel>
          <Empty
            icon='chart'
            title='Growth tracking starts on launch day'
            text='From the day your site goes live, this page tracks your visitors against a 12-month plan: where they come from, how you show up on Google, and what to do each week to keep the numbers climbing.'
          >
            <ButtonLink href='/dashboard/website' icon='arrow'>
              Project status
            </ButtonLink>
          </Empty>
        </Panel>
      </>
    );

  const launchedAt = client.website.facts.launchedAt;
  const [visits, google, reviews, params] = await Promise.all([
    loadVisits(client.id, launchedAt),
    loadSeries(client.id, launchedAt),
    loadReviews(client.id, now),
    searchParams,
  ]);
  const plan = (client.growth?.months ?? []).map((m) => ({
    month: dayKey(m.month).slice(0, 7),
    target: m.target,
  }));

  // The view in the address: ?view=week, or ?from=…&to=… for their own.
  const view = one(params.view);
  const from = one(params.from);
  const to = one(params.to);
  const initial =
    isDay(from) && isDay(to)
      ? { key: "custom" as const, span: { from, to } }
      : RANGES.some((r) => r.key === view && view !== "custom")
        ? { key: view as RangeKey }
        : undefined;

  return (
    <>
      {head}
      <Growth
        visits={visits}
        google={google}
        plan={plan}
        growth={client.growth}
        reviews={reviews}
        today={todayAz(now)}
        week={weekOf(now)}
        launched={launchedAt ? dayKey(launchedAt) : undefined}
        site={siteUrl(client.website)}
        initial={initial}
      />
    </>
  );
}
