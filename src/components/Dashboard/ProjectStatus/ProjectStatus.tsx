import Image from "next/image";
import styles from "./ProjectStatus.module.css";
import Icon from "../icons";
import { ButtonLink, PageHead, Panel, Pill, Progress } from "../ui/ui";
import ChrisImg from "../../../../public/images/chris.png";
import { isLive, projectSteps, type Step } from "@/lib/dashboard";
import { daysBetween, fmtDate, fmtShort, money } from "@/lib/dashboard/format";
import { PLANS } from "@/lib/dashboard/plans";
import type { Client } from "@/lib/dashboard/types";

const stateLabel: Record<Step["state"], string> = {
  done: "Done",
  you: "Your turn",
  us: "With us",
  upcoming: "Up next",
};

const stateTone = {
  done: "lime",
  you: "yellow",
  us: "mint",
  upcoming: "gray",
} as const;

function Steps({ steps, compact }: { steps: Step[]; compact?: boolean }) {
  return (
    <ol className={`${styles.steps} ${compact ? styles.compact : ""}`}>
      {steps.map((step, index) => (
        <li key={step.id} className={`${styles.step} ${styles[step.state]}`}>
          <span className={styles.marker} aria-hidden='true'>
            {step.state === "done" ? (
              <Icon name='check' />
            ) : step.state === "us" ? (
              <Icon name='clock' />
            ) : (
              index + 1
            )}
          </span>
          <div className={styles.stepBody}>
            <div className={styles.stepTop}>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              {!compact && (
                <Pill
                  tone={stateTone[step.state]}
                  dot={step.state !== "upcoming"}
                >
                  {stateLabel[step.state]}
                </Pill>
              )}
            </div>
            {!compact && <p className={styles.stepText}>{step.text}</p>}
            <span className={styles.stepMeta}>
              {step.owner === "you" ? "You" : "Fonts & Footers"}
              {step.doneAt && ` · Done ${fmtDate(step.doneAt)}`}
            </span>
          </div>
          {!compact && step.state === "you" && step.href && (
            <div className={styles.stepAction}>
              <ButtonLink href={step.href} small icon='arrow'>
                {step.cta ?? "Open"}
              </ButtonLink>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

function Team() {
  return (
    <Panel title='Your team'>
      <div className={styles.person}>
        <span className={styles.photo}>
          <Image
            src={ChrisImg}
            alt=''
            fill
            sizes='56px'
            className={styles.photoImg}
          />
        </span>
        <span className={styles.personText}>
          <span className={styles.personName}>Chris Ware</span>
          <span className={styles.mono}>Design, build and SEO</span>
        </span>
      </div>
      <p className={styles.copy}>
        One person from the first call to launch day and after. Message me
        anytime; I reply within one business day.
      </p>
      <ButtonLink href='/dashboard/support' variant='light' icon='message'>
        Message Chris
      </ButtonLink>
    </Panel>
  );
}

export default function ProjectStatus({
  client,
  now,
}: {
  client: Client;
  now: string;
}) {
  const website = client.website!;
  const plan = PLANS[website.plan];
  const steps = projectSteps(client);
  const done = steps.filter((s) => s.state === "done").length;
  const yours = steps.filter((s) => s.state === "you").length;
  const ours = steps.filter((s) => s.state === "us").length;
  const percent = Math.round((done / steps.length) * 100);

  if (isLive(client)) {
    const launched = website.facts.launchedAt!;
    const included = [
      "Hosting, security updates and daily backups",
      "Unlimited change requests, most done within two business days",
      "New pages for the searches riders make in your area",
      "A growth report at the start of every month",
      ...(website.plan === "FULL_PLATFORM"
        ? ["Updates and support for your booking software"]
        : []),
    ];

    return (
      <>
        <PageHead
          crumb='Your website'
          title='Project status'
          text={`${plan.name} · Built in ${daysBetween(website.startedAt, launched)} days`}
        />

        <section className={styles.live}>
          <div className={styles.liveText}>
            <Pill tone='lime' dot>
              Live
            </Pill>
            <h2 className={styles.liveTitle}>You&apos;re live.</h2>
            <p className={styles.liveCopy}>
              {website.domain} has been taking visitors since{" "}
              {fmtDate(launched)}: {daysBetween(launched, now)} days and
              counting.
            </p>
          </div>
          <div className={styles.liveActions}>
            {website.liveUrl && (
              <ButtonLink
                href={website.liveUrl}
                variant='lime'
                icon='arrowUpRight'
              >
                Visit your site
              </ButtonLink>
            )}
            {website.bookingAdminUrl && (
              <ButtonLink
                href={website.bookingAdminUrl}
                variant='white'
                icon='arrowUpRight'
              >
                Booking dashboard
              </ButtonLink>
            )}
          </div>
        </section>

        <div className={styles.grid}>
          <Panel title='Every month' text='What your plan keeps doing for you.'>
            <ul className={styles.included}>
              {included.map((item) => (
                <li key={item} className={styles.includedItem}>
                  <span className={styles.tick}>
                    <Icon name='check' />
                  </span>
                  <p>{item}</p>
                </li>
              ))}
            </ul>
          </Panel>
          <div className={styles.side}>
            <Panel
              title='Your plan'
              action={
                <ButtonLink
                  href='/dashboard/billing'
                  variant='light'
                  small
                  icon='arrow'
                >
                  Billing
                </ButtonLink>
              }
            >
              <dl className={styles.facts}>
                <div className={styles.fact}>
                  <dt className={styles.mono}>Plan</dt>
                  <dd>{plan.name}</dd>
                </div>
                <div className={styles.fact}>
                  <dt className={styles.mono}>Monthly</dt>
                  <dd>{money(website.monthly)}</dd>
                </div>
                {website.nextBillingAt && (
                  <div className={styles.fact}>
                    <dt className={styles.mono}>Next bill</dt>
                    <dd>{fmtDate(website.nextBillingAt)}</dd>
                  </div>
                )}
              </dl>
            </Panel>
            <Team />
          </div>
        </div>

        <Panel
          title='Build history'
          text={`All ${steps.length} steps, from the agreement to launch day.`}
        >
          <Steps steps={steps} compact />
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHead
        crumb='Your website'
        title='Project status'
        text={`${plan.name} · Started ${fmtDate(website.startedAt)}${website.targetLaunch ? ` · Launch planned for ${fmtDate(website.targetLaunch)}` : ""}`}
      />

      <section className={styles.overview}>
        <div className={styles.overviewMain}>
          <div className={styles.percentRow}>
            <span className={styles.percent}>{percent}%</span>
            <p>
              {done} of {steps.length} steps done
            </p>
          </div>
          <Progress
            value={done}
            max={steps.length}
            label='Build progress'
            tone='lime'
          />
        </div>
        <dl className={styles.tiles}>
          <div className={`${styles.tile} ${yours ? styles.tileYou : ""}`}>
            <dt className={styles.mono}>Your turn</dt>
            <dd className={styles.tileValue}>{yours}</dd>
          </div>
          <div className={styles.tile}>
            <dt className={styles.mono}>With us</dt>
            <dd className={styles.tileValue}>{ours}</dd>
          </div>
          <div className={styles.tile}>
            <dt className={styles.mono}>Launch</dt>
            <dd className={styles.tileValue}>
              {website.targetLaunch ? fmtShort(website.targetLaunch) : "TBD"}
            </dd>
          </div>
        </dl>
      </section>

      <div className={styles.grid}>
        <Panel
          title='Every step'
          text='Your steps unlock as the ones before them finish. Several can run at once.'
        >
          <Steps steps={steps} />
        </Panel>
        <div className={styles.side}>
          <Panel title='Your preview'>
            <div className={styles.preview}>
              <span className={styles.previewIcon}>
                <Icon name={website.previewUrl ? "eye" : "lock"} />
              </span>
              <p className={styles.copy}>
                {website.previewUrl
                  ? "Your private preview is ready. Click through every page and tell us what to change."
                  : "Your private preview link shows up here once we've built the site. Only you can see it."}
              </p>
              {website.previewUrl && (
                <ButtonLink href={website.previewUrl} icon='arrowUpRight'>
                  Open preview
                </ButtonLink>
              )}
            </div>
          </Panel>
          <Team />
        </div>
      </div>
    </>
  );
}
