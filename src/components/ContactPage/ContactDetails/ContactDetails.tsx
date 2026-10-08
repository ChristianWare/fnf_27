// The ways to reach us, as four frosted cards over the fixed background,
// the same background as What it checks on the audit page.

import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./ContactDetails.module.css";
import Reveal from "@/components/shared/Reveal/Reveal";
import Mail from "@/components/shared/icons/Mail/Mail";
import Calendar from "@/components/shared/icons/Calendar/Calendar";
import Clock from "@/components/shared/icons/Clock/Clock";
import Location from "@/components/shared/icons/Location/Location";
import BgImg from "../../../../public/images/irr.webp";

// Keep these matching the footer and the Google Business Profile.
const EMAIL = "hello@fontsandfooters.com";
const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";

const details = [
  {
    id: 1,
    label: "General inquiries",
    value: EMAIL,
    href: `mailto:${EMAIL}`,
    Icon: Mail,
  },
  {
    id: 2,
    label: "Book a call",
    value: "20 minutes, pick a time that suits you",
    href: CALENDAR,
    external: true,
    Icon: Calendar,
  },
  {
    id: 3,
    label: "Response time",
    value: "Within 24 hours, Monday to Friday",
    Icon: Clock,
  },
  {
    id: 4,
    label: "Location",
    value: "Phoenix, Arizona. Working with operators across the US.",
    Icon: Location,
  },
];

export default function ContactDetails() {
  return (
    <section className={styles.container} aria-label='Ways to reach us'>
      <Reveal />
      <div className={styles.bg} aria-hidden='true'>
        <Image src={BgImg} alt='' fill sizes='100vw' className={styles.bgImg} />
      </div>

      <LayoutWrapper>
        <ul className={styles.grid}>
          {details.map(({ Icon, ...item }) => (
            <li className={styles.card} key={item.id} data-reveal='each'>
              <Icon className={styles.icon} aria-hidden='true' />
              <div className={styles.text}>
                <span className={styles.label}>{item.label}</span>
                {item.href ? (
                  <a
                    href={item.href}
                    className={styles.value}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                  >
                    {item.value}
                  </a>
                ) : (
                  <span className={styles.value}>{item.value}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      </LayoutWrapper>
    </section>
  );
}
