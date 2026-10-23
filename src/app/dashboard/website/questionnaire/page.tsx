import type { Metadata } from "next";
import Questionnaire from "@/components/Dashboard/Questionnaire/Questionnaire";
import { NoWebsite, PageHead } from "@/components/Dashboard/ui/ui";
import { requireBuildUnlocked } from "@/lib/dashboard";
import { questionsFor } from "@/lib/dashboard/customQuestions";

export const metadata: Metadata = { title: "Questionnaire" };

export default async function QuestionnairePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const { client } = await requireBuildUnlocked();
  if (!client.website) {
    return <NoWebsite crumb='Your website' title='Questionnaire' />;
  }
  const { section } = await searchParams;

  return (
    <>
      <PageHead
        crumb='Your website'
        title='Questionnaire'
        text='About 30 minutes, and it saves as you go, so you can finish it over a couple of sittings. Your answers shape every page we write, so the more you tell us, the better your site ranks and sells.'
      />
      <Questionnaire
        sections={questionsFor(client)}
        initialAnswers={client.answers}
        submittedAt={client.website.facts.questionnaireSubmittedAt}
        initialSection={typeof section === "string" ? section : undefined}
      />
    </>
  );
}
