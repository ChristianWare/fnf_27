import type { ComponentType, SVGProps } from "react";
import styles from "./PlanIncludes.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Design from "@/components/shared/icons/Design/Design";
import Target from "@/components/shared/icons/Target/Target";
import Cloud from "@/components/shared/icons/Cloud/Cloud";
import Integration from "@/components/shared/icons/Integration/Integration";
import Platform from "@/components/shared/icons/Platform/Platform";
import Driver from "@/components/shared/icons/Driver/Driver";
import LeadsIcon from "@/components/shared/icons/LeadsIcon/LeadsIcon";
import Money from "@/components/shared/icons/Money/Money";

type Row = {
  id: number;
  feature: string;
  /** Which plans have it, for the small label at the top. */
  tag: string;
  websiteOnly: string;
  fullPlatform: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

// One card per row of the plan comparison.
const rows: Row[] = [
  {
    id: 1,
    feature: "Custom design for your company",
    tag: "Both plans",
    websiteOnly: "Included",
    fullPlatform: "Included",
    Icon: Design,
  },
  {
    id: 2,
    feature: "SEO foundation and the rider-search page map",
    tag: "Both plans",
    websiteOnly: "Included",
    fullPlatform: "Included",
    Icon: Target,
  },
  {
    id: 3,
    feature: "Hosting, security and edits",
    tag: "Both plans",
    websiteOnly: "Included",
    fullPlatform: "Included",
    Icon: Cloud,
  },
  {
    id: 4,
    feature: "Your current booking software",
    tag: "Your choice",
    websiteOnly: "Keep it; your site links to it",
    fullPlatform: "Replaced by your own booking system",
    Icon: Integration,
  },
  {
    id: 5,
    feature: "Direct booking and dispatch",
    tag: "Full Platform",
    websiteOnly: "Not included",
    fullPlatform: "Included",
    Icon: Platform,
  },
  {
    id: 6,
    feature: "Driver and admin portals, flight tracking, payments",
    tag: "Full Platform",
    websiteOnly: "Not included",
    fullPlatform: "Included",
    Icon: Driver,
  },
  {
    id: 7,
    feature: "Leads tool",
    tag: "Full Platform",
    websiteOnly: "Not included",
    fullPlatform: "Included",
    Icon: LeadsIcon,
  },
  {
    id: 8,
    feature: "Setup",
    tag: "Both plans",
    websiteOnly: "$500 one time",
    fullPlatform: "$500 one time",
    Icon: Money,
  },
];

const plans = [
  { key: "websiteOnly", name: "Website Only", price: "$199/mo" },
  { key: "fullPlatform", name: "Full Platform", price: "$499/mo" },
] as const;

export default function PlanIncludes() {
  return (
    <section className={styles.container} aria-labelledby='plan-includes'>
      <Reveal />
      <div className={styles.head}>
        <div className={styles.headLeft}>
          <EyeBrow text='Plans' />
          <h2
            id='plan-includes'
            className={styles.heading}
            data-reveal
            data-reveal-style='fade'
          >
            What&apos;s Included in Each Plan
          </h2>
        </div>

        {/* The upgrade path, where the reference has its rating badge. */}
        <div className={styles.badge} data-reveal>
          <span className={styles.badgeIcon} aria-hidden='true'>
            <Arrow className={styles.badgeArrow} />
          </span>
          <span className={styles.badgeText}>
            Start at $199 and upgrade to the Full Platform anytime, with no
            rebuild.
          </span>
        </div>
      </div>

      <ul className={styles.cards}>
        {rows.map(({ Icon, ...row }) => {
          const fullOnly = row.websiteOnly === "Not included";
          return (
            <li className={styles.card} key={row.id} data-reveal>
              <div className={styles.cardTop}>
                <span
                  className={`${styles.tag} ${fullOnly ? styles.tagDark : ""}`}
                >
                  {row.tag}
                </span>
                <span className={styles.iconTile} aria-hidden='true'>
                  <Icon className={styles.icon} />
                </span>
              </div>

              <div className={styles.cardBottom}>
                <h3 className={`${styles.feature} h6`}>{row.feature}</h3>
                <dl className={styles.values}>
                  {plans.map((plan) => {
                    const value = row[plan.key];
                    return (
                      <div className={styles.value} key={plan.key}>
                        <dt className={styles.planName}>
                          {plan.name} · {plan.price}
                        </dt>
                        <dd
                          className={`${styles.planValue} ${
                            value === "Not included" ? styles.muted : ""
                          }`}
                        >
                          {value}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
