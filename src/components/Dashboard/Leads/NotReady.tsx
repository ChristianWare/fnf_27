// The Leads Tool before there's anything to show: the studio hasn't
// switched it on yet, or the market's first nightly run isn't in.

import { ButtonLink, Empty, PageHead, Panel } from "../ui/ui";
import { fmtDate } from "@/lib/dashboard/format";

export default function NotReady({
  state,
  market,
  trialEndsAt,
  action,
}: {
  state: "OFF" | "LOADING";
  market?: string;
  trialEndsAt?: string;
  /** Somewhere to go from here: support, or the admin's run button. */
  action?: { href: string; label: string };
}) {
  const trial = trialEndsAt
    ? ` Your free trial runs until ${fmtDate(trialEndsAt)}.`
    : "";
  return (
    <>
      <PageHead
        crumb='Leads'
        title='Leads Tool'
        text='The hotels, venues, companies and events near you that book rides, every morning.'
      />
      <Panel>
        <Empty
          icon={state === "LOADING" ? "clock" : "target"}
          title={
            state === "LOADING"
              ? "Your first leads are on the way"
              : "Your Leads Tool is being set up"
          }
          text={
            state === "LOADING"
              ? `We're finding the hotels, venues, companies and events around ${market ?? "you"}, with the person to contact at each one. That runs overnight, between 1 and 5 AM Arizona time, so your first leads are here in the morning.${trial}`
              : `We're getting your market ready: fresh accounts and events near you every morning, with the right person to contact and what to say. It'll be on here very soon, and there's nothing for you to do.${trial}`
          }
        >
          {action && (
            <ButtonLink href={action.href} variant='light'>
              {action.label}
            </ButtonLink>
          )}
        </Empty>
      </Panel>
    </>
  );
}
