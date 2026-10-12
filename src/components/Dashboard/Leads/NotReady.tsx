// The Leads Tool before there's anything to show: the studio switched it
// off, or the market's first load (which starts on its own and takes
// about half an hour) isn't in yet. While it loads, the page keeps itself
// fresh and shows how far it's got.

import { ButtonLink, Empty, PageHead, Panel } from "../ui/ui";
import { fmtDate } from "@/lib/dashboard/format";
import Refresh from "./Refresh";

export default function NotReady({
  state,
  market,
  progress,
  trialEndsAt,
  action,
  title = "Leads Tool",
}: {
  state: "OFF" | "LOADING";
  market?: string;
  progress?: {
    stepsDone: number;
    steps: number;
    accounts: number;
    working: boolean;
  };
  trialEndsAt?: string;
  /** Somewhere to go from here: support, or the admin's run button. */
  action?: { href: string; label: string };
  /** The page it stands in for. */
  title?: string;
}) {
  const trial = trialEndsAt
    ? ` Your free trial runs until ${fmtDate(trialEndsAt)}.`
    : "";
  const soFar = progress
    ? progress.accounts > 0
      ? ` So far: ${progress.accounts.toLocaleString("en-US")} businesses found, step ${Math.min(progress.stepsDone + 1, progress.steps)} of ${progress.steps}.`
      : ` It's just started.`
    : "";
  return (
    <>
      {state === "LOADING" && <Refresh every={20} />}
      <PageHead
        crumb='Leads'
        title={title}
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
              ? `We're finding the hotels, venues, companies and events around ${market ?? "you"}, with the person to contact at each one. The first load takes about half an hour, and this page updates itself as it goes. After that, fresh leads land every morning.${soFar}${trial}`
              : `Your Leads Tool is switched off at the moment. If you think it shouldn't be, ask us and we'll sort it out.${trial}`
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
