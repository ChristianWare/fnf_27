import type { Metadata } from "next";
import ProposalForm from "@/components/Admin/Proposals/ProposalForm";
import { PageHead } from "@/components/Dashboard/ui/ui";
import { getAdmin } from "@/lib/admin";
import { PRESETS, blankProposal } from "@/lib/proposals/types";

export const metadata: Metadata = { title: "Proposals" };

export default async function ProposalsPage() {
  await getAdmin();
  return (
    <>
      <PageHead
        crumb='Studio'
        title='Proposals'
        text='Fill in the fields and download a branded PDF to send. Pick a plan to fill in its price and what it includes, or Custom for anything else. Nothing is saved.'
      />
      <ProposalForm initial={blankProposal()} presets={PRESETS} />
    </>
  );
}
