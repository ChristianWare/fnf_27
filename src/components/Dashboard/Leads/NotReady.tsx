// The Leads Tool before there's anything to show: the studio switched it
// off, or the market's first load (which starts on its own and takes
// about half an hour) isn't in yet. While it loads, the page keeps itself
// fresh and shows how far it's got: a bar, the four stages, the count so
// far, and a way into the leads found once the contacts are in.

import Icon from "../icons";
import { ButtonLink, Empty, PageHead, Panel } from "../ui/ui";
import { fmtDate } from "@/lib/dashboard/format";
import Refresh from "./Refresh";
import styles from "./NotReady.module.css";

type Progress = {
  stepsDone: number;
  steps: number;
  accounts: number;
  working: boolean;
};

// The run's eleven steps, as four stages people can follow. `until` is how
// many steps are done when the stage is.
const STAGES = [
  { label: "Finding businesses", until: 3 },
  { label: "Finding who to contact", until: 4 },
  { label: "Finding events", until: 10 },
  { label: "Finishing up", until: 11 },
];
/** The first load, start to finish, roughly. */
const FIRST_LOAD_MINUTES = 30;
/** Steps done once every business has its contact: the leads are worth a look. */
const CONTACTS_IN = 4;

export default function NotReady({
  state,
  market,
  progress,
  trialEndsAt,
  action,
  soFarHref,
  title = "Leads Tool",
}: {
  state: "OFF" | "LOADING";
  market?: string;
  progress?: Progress;
  trialEndsAt?: string;
  /** Somewhere to go from here: support, or the admin's run button. */
  action?: { href: string; label: string };
  /** Where the leads found so far are: Find. */
  soFarHref?: string;
  /** The page it stands in for. */
  title?: string;
}) {
  const head = (
    <PageHead
      crumb='Leads'
      title={title}
      text='The hotels, venues, companies and events near you that book rides, every morning.'
    />
  );

  if (state === "OFF") {
    return (
      <>
        {head}
        <Panel>
          <Empty
            icon='target'
            title='Your Leads Tool is being set up'
            text={`Your Leads Tool is switched off at the moment. If you think it shouldn't be, ask us and we'll sort it out.${trialEndsAt ? ` Your free trial runs until ${fmtDate(trialEndsAt)}.` : ""}`}
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

  const steps = progress?.steps ?? 11;
  const done = Math.min(progress?.stepsDone ?? 0, steps);
  // A sliver from the start, so it's plainly under way.
  const percent = Math.max(3, Math.round((done / steps) * 100));
  const current = STAGES.findIndex((s) => done < s.until);
  const stage = current === -1 ? STAGES.length - 1 : current;
  const minutesLeft = Math.max(
    2,
    Math.round(((steps - done) / steps) * FIRST_LOAD_MINUTES),
  );
  const found = progress?.accounts ?? 0;
  const canLook = Boolean(soFarHref) && done >= CONTACTS_IN && found > 0;
  const n = (value: number) => value.toLocaleString("en-US");

  return (
    <>
      <Refresh every={20} />
      {head}
      <Panel>
        <div className={styles.loading}>
          <div className={styles.top}>
            <span className={styles.icon}>
              <Icon name='clock' />
            </span>
            <div className={styles.titles}>
              <h2 className={styles.title}>Your first leads are on the way</h2>
              <p className={styles.text}>
                We&apos;re finding the hotels, venues, companies and events
                around {market ?? "you"}, with the person to contact at each
                one. This page updates itself as it goes. After this first
                load, fresh leads land every morning.
              </p>
            </div>
          </div>

          <div className={styles.barRow}>
            <div
              className={styles.bar}
              role='progressbar'
              aria-label='Your first leads'
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <span className={styles.fill} style={{ width: `${percent}%` }} />
            </div>
            <span className={styles.percent}>{percent}%</span>
          </div>

          <div className={styles.facts}>
            <span>
              <strong>{STAGES[stage].label}</strong> · step{" "}
              {Math.min(done + 1, steps)} of {steps}
            </span>
            <span>
              {found > 0
                ? `${n(found)} businesses found so far`
                : "Just getting started"}
            </span>
            <span>About {minutesLeft} minutes left</span>
          </div>

          <ol className={styles.stages}>
            {STAGES.map((s, i) => {
              const state =
                i < stage || done >= s.until
                  ? "done"
                  : i === stage
                    ? "now"
                    : "next";
              return (
                <li key={s.label} className={`${styles.stage} ${styles[state]}`}>
                  <span className={styles.dot} aria-hidden='true'>
                    {state === "done" ? <Icon name='check' /> : i + 1}
                  </span>
                  <span className={styles.stageLabel}>
                    {s.label}
                    <span className={styles.srOnly}>
                      {state === "done"
                        ? " (done)"
                        : state === "now"
                          ? " (working on it)"
                          : ""}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>

          <div className={styles.actions}>
            {canLook ? (
              <ButtonLink href={soFarHref!} icon='arrow'>
                See the {n(found)} found so far
              </ButtonLink>
            ) : (
              <span className={styles.wait}>
                Your leads open here once everyone&apos;s contact is in.
              </span>
            )}
            {action && (
              <ButtonLink href={action.href} variant='light'>
                {action.label}
              </ButtonLink>
            )}
          </div>

          {trialEndsAt && (
            <p className={styles.trial}>
              Your free trial runs until {fmtDate(trialEndsAt)}.
            </p>
          )}
        </div>
      </Panel>
    </>
  );
}
