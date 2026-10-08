import type { Metadata } from "next";
import ProjectStatus from "@/components/Dashboard/ProjectStatus/ProjectStatus";
import { NoWebsite } from "@/components/Dashboard/ui/ui";
import { getDashboard } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Project status" };

export default async function ProjectStatusPage() {
  const { client, now } = await getDashboard();
  if (!client.website) {
    return <NoWebsite crumb='Your website' title='Project status' />;
  }
  return <ProjectStatus client={client} now={now} />;
}
