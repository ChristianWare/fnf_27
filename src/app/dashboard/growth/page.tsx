import type { Metadata } from "next";
import Growth from "@/components/Dashboard/Growth/Growth";
import {
  ButtonLink,
  Empty,
  NoWebsite,
  PageHead,
  Panel,
} from "@/components/Dashboard/ui/ui";
import { getDashboard, isLive } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Growth" };

export default async function GrowthPage() {
  const { client, now } = await getDashboard();
  if (!client.website) return <NoWebsite crumb='Your website' title='Growth' />;

  return (
    <>
      <PageHead
        crumb='Your website'
        title='Growth'
        text='Visitors from search, month by month, against your 12-month plan, plus the calls, bookings and reviews that come with them.'
      />
      {isLive(client) && client.growth ? (
        <Growth growth={client.growth} now={now} />
      ) : (
        <Panel>
          <Empty
            icon='chart'
            title={
              isLive(client)
                ? "Your growth numbers are on their way"
                : "Growth tracking starts on launch day"
            }
            text={
              isLive(client)
                ? "We're setting up your 12-month plan. Soon this page tracks visitors from search against it, with the calls, bookings and reviews that come with them."
                : "From the day your site goes live, this page tracks visitors from search against a 12-month plan, with the calls, bookings and reviews that come with them, and what to do each week to keep them climbing."
            }
          >
            <ButtonLink href='/dashboard/website' icon='arrow'>
              Project status
            </ButtonLink>
          </Empty>
        </Panel>
      )}
    </>
  );
}
