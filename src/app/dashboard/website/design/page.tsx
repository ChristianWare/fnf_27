import type { Metadata } from "next";
import Design from "@/components/Dashboard/Design/Design";
import { NoWebsite, PageHead } from "@/components/Dashboard/ui/ui";
import { getDashboard, isLive } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Design" };

export default async function DesignPage() {
  const { client } = await getDashboard();
  if (!client.website) return <NoWebsite crumb='Your website' title='Design' />;
  return (
    <>
      <PageHead
        crumb='Your website'
        title='Design'
        text='Three directions for your site, made for your brand. Pick the one that feels most like you; we fine-tune the details in the build.'
      />
      <Design
        designs={client.designs}
        business={client.business}
        city={client.city}
        locked={isLive(client)}
      />
    </>
  );
}
