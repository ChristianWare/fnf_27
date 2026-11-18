import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { PageHead, ButtonLink } from "@/components/Dashboard/ui/ui";
import PreviewForm from "@/components/Admin/Previews/PreviewForm";
import { getProspect } from "@/lib/prospects/store";
import { prospectViews } from "@/lib/prospects/view";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getProspect((await params).id);
  return { title: found ? `Preview for ${found.row.business}` : "New preview" };
}

/** Make a preview (their demo site) for one prospect. Screens only for now. */
export default async function Page({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const found = await getProspect(id);
  if (!found) notFound();
  const [view] = await prospectViews([found.row]);

  return (
    <>
      <PageHead
        crumb='Previews'
        title={`A preview for ${view.business}`}
        text='Their own black car site to click around: booking, test payments, and an admin they can log into. Pick what fits them and text them the link.'
      >
        <ButtonLink href={`/admin/prospects/${view.id}`} variant='light'>
          Back to {view.business}
        </ButtonLink>
      </PageHead>
      <PreviewForm p={view} now={new Date().toISOString()} />
    </>
  );
}
