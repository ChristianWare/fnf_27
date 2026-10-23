import type { Metadata } from "next";
import Documents from "@/components/Dashboard/Documents/Documents";
import { NoWebsite, PageHead } from "@/components/Dashboard/ui/ui";
import { getDashboard } from "@/lib/dashboard";
import { money } from "@/lib/dashboard/format";

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
      <Documents
        documents={client.documents}
        signer={client.contact.name}
        afterAgreement={
          client.website.facts.setupFeePaidAt
            ? undefined
            : {
                done: "Agreement signed",
                title: "Next: billing",
                text:
                  client.website.setupFee > 0
                    ? `We'll take you to your Billing page to pay your ${money(client.website.setupFee)} setup fee. Your questionnaire and the rest of your build unlock right after.`
                    : "Your setup fee is waived, so there's nothing to pay today. We'll take you to your Billing page to add the card for your monthly plan. Your questionnaire and the rest of your build unlock right after.",
                label: "Go to Billing",
                href: "/dashboard/billing",
              }
        }
      />
    </>
  );
}
