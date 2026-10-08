import type { Metadata } from "next";
import Questionnaire from "@/components/Dashboard/Questionnaire/Questionnaire";
import { NoWebsite, PageHead } from "@/components/Dashboard/ui/ui";
import { getDashboard } from "@/lib/dashboard";
import { questionnaireFor } from "@/lib/dashboard/questionnaire";

export const metadata: Metadata = { title: "Questionnaire" };

export default async function QuestionnairePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const { client } = await getDashboard();
  if (!client.website) {
    return <NoWebsite crumb='Your website' title='Questionnaire' />;
  }
  const { section } = await searchParams;

  return (
    <>
      <PageHead
        crumb='Your website'
        title='Questionnaire'
        text='About 20 minutes. Your answers shape every page we write, so the more you tell us, the better your site ranks and sells.'
      />
      <Questionnaire
        sections={questionnaireFor(client.website.plan)}
        initialAnswers={client.answers}
        submittedAt={client.website.facts.questionnaireSubmittedAt}
        initialSection={typeof section === "string" ? section : undefined}
      />
    </>
  );
}
