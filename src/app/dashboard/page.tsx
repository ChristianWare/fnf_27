import Home from "@/components/Dashboard/Home/Home";
import { getDashboard, isLive } from "@/lib/dashboard";
import { dayKey } from "@/lib/dashboard/format";
import { todayAz } from "@/lib/growth/dates";
import { loadSeries } from "@/lib/growth/load";
import { monthStatus, recentMonths } from "@/lib/growth/traffic";

export default async function DashboardPage() {
  const { client, now } = await getDashboard();
  const series = isLive(client)
    ? await loadSeries(client.id, client.website?.facts.launchedAt)
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
      }
    : undefined;
  return <Home client={client} now={now} traffic={traffic} />;
}
