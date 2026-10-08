import type { Metadata } from "next";
import Documents from "@/components/Dashboard/Documents/Documents";
import { NoWebsite, PageHead } from "@/components/Dashboard/ui/ui";
import { getDashboard } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const { client } = await getDashboard();
  if (!client.website)
    return <NoWebsite crumb='Your website' title='Documents' />;
  return (
    <>
      <PageHead
        crumb='Your website'
        title='Documents'
        text='Your agreement and anything else that needs a signature. Signed copies stay here.'
      />
      <Documents documents={client.documents} signer={client.contact.name} />
    </>
  );
}
