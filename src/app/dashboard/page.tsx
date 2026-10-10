import Home from "@/components/Dashboard/Home/Home";
import { getDashboard, isLive } from "@/lib/dashboard";
import { dayKey } from "@/lib/dashboard/format";
import { todayAz } from "@/lib/growth/dates";
import { loadSeries, loadVisits } from "@/lib/growth/load";
import {
  fromGoogle,
  fromVisits,
  monthStatus,
  recentMonths,
} from "@/lib/growth/traffic";

export default async function DashboardPage() {
  const { client, now } = await getDashboard();
  const launchedAt = client.website?.facts.launchedAt;
  // Everyone, from Plausible; or visitors from Google until it's connected.
  const visits = isLive(client)
    ? await loadVisits(client.id, launchedAt)
    : undefined;
  const google =
    isLive(client) && !visits
      ? await loadSeries(client.id, launchedAt)
      : undefined;
  const series = visits
    ? fromVisits(visits)
    : google
      ? fromGoogle(google)
      : undefined;
  const plan = (client.growth?.months ?? []).map((m) => ({
    month: dayKey(m.month).slice(0, 7),
    target: m.target,
  }));
  const today = todayAz(now);
  const traffic = series
    ? {
        status: monthStatus(series, plan, today),
        months: recentMonths(series, today, 6),
        everyone: Boolean(visits),
      }
    : undefined;
  return <Home client={client} now={now} traffic={traffic} />;
}
