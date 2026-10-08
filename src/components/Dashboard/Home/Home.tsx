import Image from "next/image";
import Link from "next/link";
import styles from "./Home.module.css";
import Icon, { type IconName } from "../icons";
import { ButtonLink, Panel, Pill, Progress, type Tone } from "../ui/ui";
import ChrisImg from "../../../../public/images/chris.png";
import {
  growthNow,
  isLive,
  leadsAccess,
  projectSteps,
  todos,
  trialDaysLeft,
} from "@/lib/dashboard";
import {
  daysBetween,
  fmtAgo,
  fmtDay,
  fmtMonth,
  greeting,
  money,
} from "@/lib/dashboard/format";
import { CALENDAR, LEADS, PLANS } from "@/lib/dashboard/plans";
import type { ActivityKind, Client } from "@/lib/dashboard/types";

type Cta = {
  label: string;
  href: string;
  variant?: "black" | "light" | "lime" | "white";
  icon?: IconName;
};

type PlanCard = {
  id: "platform" | "website" | "leads";
  name: string;
  price: string;
  priceNote: string;
  blurb: string;
  features: string[];
  status?: { text: string; tone: Tone };
  cta?: Cta;
  note?: string;
  current?: boolean;
};

const kindIcon: Record<ActivityKind, IconName> = {
  build: "status",
  change: "pen",
  document: "file",
  growth: "chart",
  invoice: "card",
  leads: "target",
  support: "message",
};

function planCards(client: Client, now: string): PlanCard[] {
  const plan = client.website?.plan;
  const live = isLive(client);
  const access = leadsAccess(client);
  const call: Cta = {
    label: "Book a call",
    href: CALENDAR,
    icon: "arrowUpRight",
  };

  const platform: PlanCard = {
    id: "platform",
    name: PLANS.FULL_PLATFORM.name,
    price: money(PLANS.FULL_PLATFORM.monthly),
    priceNote: `+ ${money(PLANS.FULL_PLATFORM.setup)} setup`,
    blurb: PLANS.FULL_PLATFORM.blurb,
    features: [
      "Custom website and SEO pages",
      "Booking, dispatch and a driver app",
      "Payments to your own Stripe",
      "The Leads Tool, included",
    ],
  };
  const website: PlanCard = {
    id: "website",
    name: PLANS.WEBSITE_ONLY.name,
    price: money(PLANS.WEBSITE_ONLY.monthly),
    priceNote: `+ ${money(PLANS.WEBSITE_ONLY.setup)} setup`,
    blurb: PLANS.WEBSITE_ONLY.blurb,
    features: [
      "Custom website and SEO pages",
      "Hosting, security and backups",
      "Unlimited change requests",
      "Book now buttons to your booking system",
    ],
  };
  const leads: PlanCard = {
    id: "leads",
    name: LEADS.name,
    price: money(LEADS.monthly),
    priceNote: `${LEADS.trialDays} days free, no card`,
    blurb:
      "The hotels, venues and companies near you that book rides, every morning.",
    features: [
      "A fresh list every morning",
      "The decision maker for each lead",
      "What to say, and when to follow up",
    ],
  };

  if (plan === "FULL_PLATFORM") {
    platform.current = true;
    platform.status = { text: "Your plan", tone: "lime" };
    platform.cta =
      live && client.website?.bookingAdminUrl
        ? {
            label: "Open booking dashboard",
            href: client.website.bookingAdminUrl,
            icon: "arrowUpRight",
          }
        : {
            label: "Project status",
            href: "/dashboard/website",
            icon: "arrow",
          };
    website.status = { text: "Included", tone: "white" };
    website.note = "Everything here is part of your Full Platform plan.";
  } else if (plan === "WEBSITE_ONLY") {
    website.current = true;
    website.status = { text: "Your plan", tone: "black" };
    website.cta =
      live && client.website?.liveUrl
        ? {
            label: "Visit your site",
            href: client.website.liveUrl,
            icon: "arrowUpRight",
          }
        : {
            label: "Project status",
            href: "/dashboard/website",
            icon: "arrow",
          };
    platform.cta = {
      label: "Upgrade, no rebuild",
      href: "/dashboard/billing#upgrade",
      icon: "arrow",
      variant: "lime",
    };
    platform.note = "We add booking to the site you have.";
  } else {
    platform.cta = { ...call, variant: "lime" };
    website.cta = call;
  }

  if (access === "INCLUDED") {
    leads.status = { text: "Included", tone: "white" };
    leads.cta = {
      label: "Open Leads Tool",
      href: "/dashboard/leads",
      icon: "arrow",
    };
  } else if (access === "TRIAL") {
    leads.current = !plan;
    leads.status = {
      text: `${trialDaysLeft(client, now)} days left`,
      tone: "black",
    };
    leads.cta = {
      label: "Open Leads Tool",
      href: "/dashboard/leads",
      icon: "arrow",
    };
    leads.note = "Add a card anytime in Billing to keep it.";
  } else if (access === "ACTIVE") {
    leads.current = !plan;
    leads.status = { text: "Active", tone: "black" };
    leads.cta = {
      label: "Open Leads Tool",
      href: "/dashboard/leads",
      icon: "arrow",
    };
  } else {
    leads.cta = {
      label: `Start ${LEADS.trialDays}-day free trial`,
      href: "/dashboard/leads",
      icon: "arrow",
    };
    leads.note = "No card needed.";
  }

  return [platform, website, leads];
}

export default function Home({ client, now }: { client: Client; now: string }) {
  const name = client.contact.name.split(" ")[0];
  const live = isLive(client);
  const steps = projectSteps(client);
  const done = steps.filter((s) => s.state === "done").length;
  const list = todos(client, now);
  const cards = planCards(client, now);

  let status: string;
  if (live && client.website?.facts.launchedAt) {
    status = `Your site has been live for ${daysBetween(client.website.facts.launchedAt, now)} days.`;
  } else if (client.website) {
    status = `Your build is ${Math.round((done / steps.length) * 100)}% done.${list.length ? ` ${list.length} thing${list.length === 1 ? " needs" : "s need"} you.` : ""}`;
  } else {
    status = `Your Leads Tool trial has ${trialDaysLeft(client, now)} days left.`;
  }

  const growth = client.growth;
  const snapshot = growth ? growthNow(growth, now) : undefined;
  const current = snapshot?.current;
  const pace = snapshot?.pace ?? 0;
  const past = growth?.months.filter((m) => m.actual !== undefined) ?? [];
  const chartMax = Math.max(
    ...past.map((m) => m.actual ?? 0),
    current?.target ?? 0,
    1,
  );

  return (
    <>
      <header className={styles.welcome}>
        <div className={styles.welcomeText}>
          <span className={styles.eyebrow}>{fmtDay(now)}</span>
          <h1 className={`h3 ${styles.hello}`}>
            {greeting(now)}, {name}
          </h1>
          <p className={styles.status}>
            <span className={styles.business}>{client.business}</span>
            <span className={styles.sep} aria-hidden='true' />
            {status}
          </p>
        </div>
        <div className={styles.welcomeActions}>
          {live && client.website?.liveUrl && (
            <ButtonLink
              href={client.website.liveUrl}
              variant='light'
              icon='arrowUpRight'
            >
              Visit your site
            </ButtonLink>
          )}
          {client.website && !live && (
            <ButtonLink href='/dashboard/website' icon='arrow'>
              Project status
            </ButtonLink>
          )}
          {client.website ? (
            live && (
              <ButtonLink href='/dashboard/support' icon='message'>
                Message us
              </ButtonLink>
            )
          ) : (
            <ButtonLink href='/dashboard/leads' icon='arrow'>
              Open Leads Tool
            </ButtonLink>
          )}
        </div>
      </header>

      {/* The three plans, side by side. */}
      <section className={styles.plans} aria-label='Plans'>
        {cards.map((card) => (
          <article
            key={card.id}
            className={`${styles.card} ${styles[card.id]} ${card.current ? styles.current : ""}`}
          >
            <div className={styles.cardHead}>
              <div className={styles.cardTop}>
                <h2 className={styles.cardName}>{card.name}</h2>
                {card.status && (
                  <Pill tone={card.status.tone} dot>
                    {card.status.text}
                  </Pill>
                )}
              </div>
              <div className={styles.price}>
                <span className={styles.amount}>{card.price}</span>
                <span className={styles.per}>/mo</span>
              </div>
              <span className={styles.priceNote}>{card.priceNote}</span>
            </div>
            <div className={styles.cardBody}>
              <p className={styles.blurb}>{card.blurb}</p>
              <ul className={styles.features}>
                {card.features.map((feature) => (
                  <li key={feature} className={styles.feature}>
                    <span className={styles.tick}>
                      <Icon name='check' />
                    </span>
                    <p>{feature}</p>
                  </li>
                ))}
              </ul>
              <div className={styles.cardFoot}>
                {card.cta && (
                  <ButtonLink
                    href={card.cta.href}
                    variant={card.cta.variant ?? "black"}
                    icon={card.cta.icon}
                  >
                    {card.cta.label}
                  </ButtonLink>
                )}
                {card.note && <p className={styles.note}>{card.note}</p>}
              </div>
            </div>
          </article>
        ))}
      </section>

      <div className={styles.grid}>
        <div className={styles.column}>
          <Panel
            title={list.length ? "Needs you" : "You're all caught up"}
            text={
              list.length
                ? "The things only you can do, in the order that keeps things moving."
                : "Nothing is waiting on you. We'll let you know here when something is."
            }
          >
            {list.length > 0 && (
              <ul className={styles.todos}>
                {list.map((todo) => (
                  <li key={todo.id}>
                    <Link href={todo.href} className={styles.todo}>
                      <span className={styles.todoDot} aria-hidden='true' />
                      <span className={styles.todoText}>
                        <span className={styles.todoTitle}>{todo.title}</span>
                        <p>{todo.text}</p>
                      </span>
                      <span className={styles.todoCta}>
                        {todo.cta}
                        <Icon name='arrow' className={styles.todoArrow} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {growth && current && (
            <Panel
              title='Visitors from search'
              text={`This month, against your ${fmtMonth(current.month)} target of ${current.target.toLocaleString("en-US")}.`}
              action={
                <ButtonLink
                  href='/dashboard/growth'
                  variant='light'
                  small
                  icon='arrow'
                >
                  See growth
                </ButtonLink>
              }
            >
              <div className={styles.snapshot}>
                <div className={styles.bigStat}>
                  <span className={styles.bigNumber}>
                    {growth.monthToDate.toLocaleString("en-US")}
                  </span>
                  <Pill tone={pace >= current.target ? "lime" : "yellow"} dot>
                    On pace for {pace.toLocaleString("en-US")}
                  </Pill>
                </div>
                <Progress
                  value={growth.monthToDate}
                  max={current.target}
                  label='Visitors this month against the target'
                  tone='lime'
                />
                <div className={styles.mini} aria-hidden='true'>
                  {[...past, { ...current, actual: growth.monthToDate }].map(
                    (m) => (
                      <div key={m.month} className={styles.miniCol}>
                        <div className={styles.miniBarWrap}>
                          <div
                            className={`${styles.miniBar} ${m.month === current.month ? styles.miniNow : ""}`}
                            style={{
                              height: `${Math.max(4, ((m.actual ?? 0) / chartMax) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className={styles.miniLabel}>
                          {fmtMonth(m.month)}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </Panel>
          )}

          {client.website && !live && (
            <Panel
              title='Your build'
              text={`${done} of ${steps.length} steps done.`}
              action={
                <ButtonLink
                  href='/dashboard/website'
                  variant='light'
                  small
                  icon='arrow'
                >
                  Project status
                </ButtonLink>
              }
            >
              <Progress
                value={done}
                max={steps.length}
                label='Build progress'
                tone='lime'
              />
              <ul className={styles.steps}>
                {steps
                  .filter((s) => s.state !== "done")
                  .slice(0, 4)
                  .map((step) => (
                    <li key={step.id} className={styles.step}>
                      <span
                        className={`${styles.stepState} ${styles[`state_${step.state}`]}`}
                      >
                        {step.state === "you"
                          ? "Your turn"
                          : step.state === "us"
                            ? "With us"
                            : "Next"}
                      </span>
                      <p className={styles.stepTitle}>{step.title}</p>
                    </li>
                  ))}
              </ul>
            </Panel>
          )}

          {!client.website && (
            <Panel
              title='Your Leads Tool'
              text='Fresh leads every morning, with who to ask for and what to say.'
              action={
                <ButtonLink
                  href='/dashboard/leads'
                  variant='light'
                  small
                  icon='arrow'
                >
                  Open
                </ButtonLink>
              }
            >
              <div className={styles.trial}>
                <div className={styles.trialRow}>
                  <span className={styles.mono}>Free trial</span>
                  <span className={styles.mono}>
                    {trialDaysLeft(client, now)} of {LEADS.trialDays} days left
                  </span>
                </div>
                <Progress
                  value={LEADS.trialDays - trialDaysLeft(client, now)}
                  max={LEADS.trialDays}
                  label='Trial days used'
                  tone='purple'
                />
                <p>
                  Keep it after your trial for {money(LEADS.monthly)} a month.
                  Add a card anytime; nothing is charged until the trial ends.
                </p>
              </div>
            </Panel>
          )}
        </div>

        <div className={styles.column}>
          <Panel title='Recent activity'>
            <ol className={styles.feed}>
              {client.activity.map((item) => {
                const body = (
                  <>
                    <span className={styles.feedIcon}>
                      <Icon name={kindIcon[item.kind]} />
                    </span>
                    <span className={styles.feedText}>
                      <p className={styles.feedLine}>{item.text}</p>
                      <span className={styles.monoMuted}>
                        {fmtAgo(item.at, now)}
                      </span>
                    </span>
                  </>
                );
                return (
                  <li key={item.id}>
                    {item.href ? (
                      <Link href={item.href} className={styles.feedItem}>
                        {body}
                      </Link>
                    ) : (
                      <div className={styles.feedItem}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </Panel>

          <section className={styles.help}>
            <div className={styles.helpTop}>
              <span className={styles.helpPhoto}>
                <Image
                  src={ChrisImg}
                  alt=''
                  fill
                  sizes='64px'
                  className={styles.helpImg}
                />
              </span>
              <span className={styles.helpWho}>
                <span className={styles.helpName}>Chris Ware</span>
                <span className={styles.helpRole}>
                  Your designer and developer
                </span>
              </span>
            </div>
            <p className={styles.helpText}>
              Questions about your site, your plan or anything else? Message me
              and I&apos;ll reply within one business day.
            </p>
            <div className={styles.helpActions}>
              <ButtonLink
                href='/dashboard/support'
                variant='lime'
                icon='message'
              >
                Message Chris
              </ButtonLink>
              <ButtonLink href={CALENDAR} variant='white' icon='arrowUpRight'>
                Book a call
              </ButtonLink>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
