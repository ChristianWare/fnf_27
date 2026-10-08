import type { ComponentType, SVGProps } from "react";
import styles from "./HowYouWorkIt.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Analytics from "@/components/shared/icons/Analytics/Analytics";
import Cursor from "@/components/shared/icons/Cursor/Cursor";
import Bell from "@/components/shared/icons/Bell/Bell";
import Notifications from "@/components/shared/icons/Notifications/Notifications";

type Step = {
  id: number;
  title: string;
  tag: string;
  desc: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const steps: Step[] = [
  {
    id: 1,
    title: "Pipeline",
    tag: "Every lead",
    desc: "Track every lead from first contact to won account.",
    Icon: Analytics,
  },
  {
    id: 2,
    title: "Next-action prompts",
    tag: "Each day",
    desc: "The tool tells you who to follow up with today.",
    Icon: Cursor,
  },
  {
    id: 3,
    title: "Hot-lead alerts",
    tag: "Right now",
    desc: "Ride requests expire fast, so they reach you first.",
    Icon: Bell,
  },
  {
    id: 4,
    title: "Daily digest",
    tag: "Each morning",
    desc: "Today's moves in your inbox each morning.",
    Icon: Notifications,
  },
];

export default function HowYouWorkIt() {
  return (
    <section className={styles.container} aria-labelledby='how-you-work-it'>
      <Reveal />
      <div className={styles.head}>
        <div className={styles.headLeft}>
          <EyeBrow text='How you work it' />
          <h2
            id='how-you-work-it'
            className={styles.heading}
            data-reveal
            data-reveal-style='fade'
          >
            How You Work It
          </h2>
        </div>

        <div className={styles.badge} data-reveal>
          <span className={styles.badgeIcon} aria-hidden='true'>
            <Arrow className={styles.badgeArrow} />
          </span>
          <span className={styles.badgeText}>
            Free for 30 days, no card. Then $125/mo on its own, or included with
            the Full Platform.
          </span>
        </div>
      </div>

      <ul className={styles.cards}>
        {steps.map(({ Icon, ...step }) => (
          <li className={styles.card} key={step.id} data-reveal>
            <div className={styles.cardTop}>
              <span className={styles.tag}>{step.tag}</span>
              <span className={styles.iconTile} aria-hidden='true'>
                <Icon className={styles.icon} />
              </span>
            </div>

            <div className={styles.cardBottom}>
              <h3 className={`${styles.feature} h6`}>{step.title}</h3>
              <p className={styles.desc}>{step.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
