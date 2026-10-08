import type { Metadata } from "next";
import Support from "@/components/Dashboard/Support/Support";
import { PageHead } from "@/components/Dashboard/ui/ui";
import { getDashboard } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Support" };

export default async function SupportPage() {
  const { client } = await getDashboard();
  return (
    <>
      <PageHead
        crumb='Account'
        title='Support'
        text='Message Chris about anything: your site, your plan, or a quick question. Replies within one business day.'
      />
      <Support initial={client.threads} you={client.contact.name} />
    </>
  );
}
