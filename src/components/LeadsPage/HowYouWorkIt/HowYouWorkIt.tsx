import type { ComponentType, SVGProps } from "react";
import styles from "./HowYouWorkIt.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Analytics from "@/components/shared/icons/Analytics/Analytics";
import Notifications from "@/components/shared/icons/Notifications/Notifications";
import Target from "@/components/shared/icons/Target/Target";
import Mail from "@/components/shared/icons/Mail/Mail";

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
    title: "Today",
    tag: "Every morning at 6",
    desc: "The new accounts and events near your base, scored out of 100 and sorted best first, with the follow-ups that are due. An email tells you they're in.",
    Icon: Notifications,
  },
  {
    id: 2,
    title: "Find leads",
    tag: "Your whole market",
    desc: "Everything up to 75 miles from your base, by kind, with a lead score, a picture and the venue's rating on each. Open any lead for free.",
    Icon: Target,
  },
  {
    id: 3,
    title: "Save and reach out",
    tag: "Contacts and scripts",
    desc: "Saving a lead finds the decision-maker's email and writes your email, text and call opener. Send them from your own phone or inbox, so replies come straight to you.",
    Icon: Mail,
  },
  {
    id: 4,
    title: "Pipeline",
    tag: "New to Won",
    desc: "Log each email, text, call and meeting, move the lead along, and the tool tells you who to follow up with today, so nothing goes cold.",
    Icon: Analytics,
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
