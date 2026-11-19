import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { PageHead, ButtonLink, Notice } from "@/components/Dashboard/ui/ui";
import PreviewForm from "@/components/Admin/Previews/PreviewForm";
import { getProspect } from "@/lib/prospects/store";
import { prospectViews } from "@/lib/prospects/view";
import { PlatformError, previewForProspect } from "@/lib/demos/platform";
import { toPreviewEditing } from "@/lib/demos/preview";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await getProspect((await params).id);
  return { title: found ? `Edit the preview for ${found.row.business}` : "Edit preview" };
}

/** Change a prospect's live preview in place: name, contact, photos. */
export default async function Page({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const found = await getProspect(id);
  if (!found) notFound();
  const [view] = await prospectViews([found.row]);

  let demo = null;
  let issue: string | null = null;
  try {
    demo = await previewForProspect(id);
  } catch (e) {
    issue = e instanceof PlatformError ? e.message : "Couldn't load their preview.";
  }
  if (!issue && (!demo || demo.status !== "live")) redirect(`/admin/prospects/${id}`);

  return (
    <>
      <PageHead
        crumb='Previews'
        title={`Edit the preview for ${view.business}`}
        text='Change their name, contact details or photos. The link, logins, bookings and what they did all stay.'
      >
        <ButtonLink href={`/admin/prospects/${view.id}`} variant='light'>
          Back to {view.business}
        </ButtonLink>
      </PageHead>
      {issue || !demo ? (
        <Notice>{issue}</Notice>
      ) : (
        <PreviewForm p={view} now={new Date().toISOString()} editing={toPreviewEditing(demo)} />
      )}
    </>
  );
}
