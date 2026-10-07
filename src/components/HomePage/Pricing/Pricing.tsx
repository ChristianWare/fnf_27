import type { ComponentType, SVGProps } from "react";
import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Pricing.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import AuditIcon from "@/components/shared/icons/AuditIcon/AuditIcon";
import LeadsIcon from "@/components/shared/icons/LeadsIcon/LeadsIcon";
import Platform from "@/components/shared/icons/Platform/Platform";
import Design from "@/components/shared/icons/Design/Design";
import Chris from "../../../../public/images/chris.png";
import Logo from "@/components/shared/Logo/Logo";
import Reveal from "@/components/shared/Reveal/Reveal";

type Plan = {
  id: number;
  name: string;
  desc: string;
  price: string;
  per: string;
  setup: string;
  /** A small label beside the icon, for the plan's best detail. */
  badge?: string;
  btnText: string;
  href: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  featured: boolean;
  /** Slides up above the card on hover. */
  tab: string;
  features: string[];
};

// Shown first on the pricing page only. The home page lists the three paid
// plans.
const auditPlan: Plan = {
  id: 0,
  name: "Free Website Audit",
  desc: "See what's costing you bookings: how you show up on Google, how your site works on a phone, and whether riders can book you online.",
  price: "$0",
  per: "Always free",
  setup: "Results in 60 seconds. No card, and no email needed for your score.",
  btnText: "Run a free website audit",
  href: "/audit",
  Icon: AuditIcon,
  featured: false,
  tab: "For seeing where you stand",
  features: [
    "Score out of 100",
    "Top three fixes, ranked",
    "Google visibility",
    "Speed on a phone",
    "Online booking check",
    "AI search readability",
  ],
};

const plans: Plan[] = [
  {
    id: 1,
    name: "Leads Tool",
    desc: "Hotels, venues, corporate accounts and events in your market, each with a contact and an outreach script.",
    price: "$125",
    per: "Monthly",
    setup:
      "Free for the first 30 days, no card. Included with the Full Platform.",
    badge: "First 30 days free",
    btnText: "Get free leads in your city",
    href: "/leads",
    Icon: LeadsIcon,
    featured: false,
    tab: "For winning accounts",
    features: [
      "Hot, warm and cold leads",
      "Decision-maker contacts",
      "Outreach scripts",
      "Daily email digest",
      "No per-lead fees",
    ],
  },
  {
    id: 2,
    name: "Full Platform",
    desc: "Your website and your booking and dispatch software in one system, with the leads tool included.",
    price: "$499",
    per: "Monthly",
    setup: "Plus a one-time $500 setup.",
    btnText: "See the Full Platform",
    href: "/services/booking-software",
    Icon: Platform,
    featured: true,
    tab: "For booking direct",
    features: [
      "Custom website",
      "Direct booking & dispatch",
      "Driver & admin portals",
      "Flight tracking",
      "Payments",
      "Leads tool included",
      "No per-booking fees",
    ],
  },
  {
    id: 3,
    name: "Website Only",
    desc: "A custom website with an SEO foundation, hosting and edits. It works with the booking software you already use.",
    price: "$199",
    per: "Monthly",
    setup: "Plus a one-time $500 setup.",
    btnText: "See website plans",
    href: "/services/websites",
    Icon: Design,
    featured: false,
    tab: "For getting found",
    features: [
      "Custom website",
      "SEO foundation",
      "Hosting & edits",
      "Works with your software",
      "Upgrade anytime, no rebuild",
    ],
  },
];

// The plan cards and the black help bar under them. Used by this section on
// the home page, and by the hero on the pricing page.
const defaultHelp = {
  title: "Not sure which plan fits?",
  sub: "No plan charges per-booking fees. Compare them side by side.",
  href: "/pricing",
  text: "See full pricing",
};

export function PricingPlans({
  help = defaultHelp,
  withAudit = false,
}: {
  help?: { title: string; sub: string; href: string; text: string };
  /** Adds the free website audit as the first of four cards. */
  withAudit?: boolean;
}) {
  const shown = withAudit ? [auditPlan, ...plans] : plans;

  return (
    <>
      <div className={`${styles.plans} ${withAudit ? styles.plansFour : ""}`}>
        {shown.map(({ Icon, ...plan }) => (
          <div className={styles.planWrap} key={plan.id} data-reveal>
            <div
              className={`${styles.tab} ${plan.featured ? styles.tabFeatured : ""}`}
            >
              {plan.tab}
            </div>
            <article
              className={`${styles.plan} ${plan.featured ? styles.featured : ""}`}
            >
              <div className={styles.planBody}>
                <div className={styles.planTop}>
                  <div className={styles.iconTile}>
                    <Icon className={styles.icon} aria-hidden='true' />
                  </div>
                  {plan.badge && (
                    <span className={styles.badge}>{plan.badge}</span>
                  )}
                </div>
                <h3 className={`${styles.planName} h5`}>{plan.name}</h3>
                <p className={styles.planDesc}>{plan.desc}</p>
                <div className={styles.priceRow}>
                  <span className={`${styles.price} h2`}>{plan.price}</span>
                  <span className={styles.per}>{plan.per}</span>
                </div>
                <p className={styles.setup}>{plan.setup}</p>
                <div className={styles.btnContainer}>
                  <Button
                    href={plan.href}
                    btnType={plan.featured ? "white" : "black"}
                    text={plan.btnText}
                  />
                </div>
              </div>
              <ul className={styles.features}>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          </div>
        ))}
      </div>

      <div className={styles.help} data-reveal>
        <div className={styles.helpLeft}>
          {/* <div className={styles.avatar}>
                <Image
                  src={Chris}
                  alt='Chris Ware, founder of Fonts & Footers'
                  fill
                  sizes='48px'
                  className={styles.avatarImg}
                />
              </div> */}
          <Logo noText blur='blur' />
          <div className={styles.helpText}>
            <span className={styles.helpTitle}>{help.title}</span>
            <span className={styles.helpSub}>{help.sub}</span>
          </div>
        </div>
        <Button href={help.href} btnType='white' text={help.text} arrow />
      </div>
    </>
  );
}

export default function Pricing() {
  return (
    <section className={styles.container}>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <EyeBrow text='Pricing' />
            <h2 className={styles.heading} data-reveal data-reveal-style='fade'>
              Flat prices, published.
            </h2>
          </div>

          <PricingPlans />
        </div>
      </LayoutWrapper>
    </section>
  );
}
