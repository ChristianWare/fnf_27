import Home from "@/components/Dashboard/Home/Home";
import { getDashboard } from "@/lib/dashboard";

export default async function DashboardPage() {
  const { client, now } = await getDashboard();
  return <Home client={client} now={now} />;
}
