import type { Metadata } from "next";
import Changes from "@/components/Dashboard/Changes/Changes";
import {
  ButtonLink,
  Empty,
  NoWebsite,
  PageHead,
  Panel,
} from "@/components/Dashboard/ui/ui";
import { getDashboard, isLive } from "@/lib/dashboard";

export const metadata: Metadata = { title: "Change requests" };

export default async function ChangesPage() {
  const { client } = await getDashboard();
  if (!client.website) {
    return <NoWebsite crumb='Your website' title='Change requests' />;
  }

  return (
    <>
      <PageHead
        crumb='Your website'
        title='Change requests'
        text='Unlimited, for as long as your plan is active. Most are done within two business days.'
      />
      {isLive(client) ? (
        <Changes initial={client.changes} you={client.contact.name} />
      ) : (
        <Panel>
          <Empty
            icon='lock'
            title='Change requests open on launch day'
            text='Until then, tell us what you’d change in the blueprint comments, or send a message. Nothing is final until you’ve seen your preview.'
          >
            <ButtonLink href='/dashboard/website/blueprint' icon='arrow'>
              Open blueprint
            </ButtonLink>
            <ButtonLink href='/dashboard/support' variant='light'>
              Message us
            </ButtonLink>
          </Empty>
        </Panel>
      )}
    </>
  );
}
