import type { Metadata } from "next";
import Blueprint from "@/components/Dashboard/Blueprint/Blueprint";
import { NoWebsite, PageHead } from "@/components/Dashboard/ui/ui";
import { getDashboard } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Blueprint" };

export default async function BlueprintPage() {
  const { client } = await getDashboard();
  if (!client.website)
    return <NoWebsite crumb='Your website' title='Blueprint' />;
  return (
    <>
      <PageHead
        crumb='Your website'
        title='Blueprint'
        text='Every page of your site and what each section says, before we build it. Approve what’s right, and tell us what isn’t.'
      />
      <Blueprint initial={client.blueprint} you={client.contact.name} />
    </>
  );
}
