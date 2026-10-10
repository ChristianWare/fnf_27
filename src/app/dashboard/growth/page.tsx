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
import { loadReviews, loadSeries } from "@/lib/growth/load";
import { RANGES, type RangeKey } from "@/lib/growth/traffic";

export const metadata: Metadata = { title: "Growth" };

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

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
      text='Visitors from Google search by day, week or month, against your 12-month plan, with your Google reviews and the searches that bring people in.'
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
            text='From the day your site goes live, this page tracks your visitors from Google against a 12-month plan, with your reviews and what to do each week to keep the numbers climbing.'
          >
            <ButtonLink href='/dashboard/website' icon='arrow'>
              Project status
            </ButtonLink>
          </Empty>
        </Panel>
      </>
    );

  const [series, reviews, params] = await Promise.all([
    loadSeries(client.id, client.website.facts.launchedAt),
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
        series={series}
        plan={plan}
        growth={client.growth}
        reviews={reviews}
        today={todayAz(now)}
        week={weekOf(now)}
        initial={initial}
      />
    </>
  );
}
