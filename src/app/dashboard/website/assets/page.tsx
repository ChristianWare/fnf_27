import type { Metadata } from "next";
import Assets from "@/components/Dashboard/Assets/Assets";
import { NoWebsite, PageHead } from "@/components/Dashboard/ui/ui";
import { requireBuildUnlocked } from "@/lib/dashboard";
import { isGeneralClient } from "@/lib/dashboard/customQuestions";

export const metadata: Metadata = { title: "Brand assets" };

export default async function AssetsPage() {
  const { client } = await requireBuildUnlocked();
  if (!client.website)
    return <NoWebsite crumb='Your website' title='Brand assets' />;
  return (
    <>
      <PageHead
        crumb='Your website'
        title='Brand assets'
        text={
          isGeneralClient(client)
            ? "Your logo and your photos. Real photos of your work and your people beat stock photos every time."
            : "Your logo and your photos. Real photos of your cars and your people beat stock photos every time."
        }
      />
      <Assets initial={client.assets} general={isGeneralClient(client)} />
    </>
  );
}
