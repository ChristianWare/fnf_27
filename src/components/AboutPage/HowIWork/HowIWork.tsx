import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./HowIWork.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import AuditIcon from "@/components/shared/icons/AuditIcon/AuditIcon";
import LightBulb from "@/components/shared/icons/LightBulb/LightBulb";
import Target from "@/components/shared/icons/Target/Target";
import Customer from "@/components/shared/icons/Customer/Customer";
import AuditImg from "../../../../public/images/freeAudit.jpg";
import ChrisImg from "../../../../public/images/me.png";

const items = [
  {
    id: 1,
    title: "Audit first",
    desc: "Before I pitch anything, I look at where you stand: your site, your Google profile and your reviews.",
    Icon: AuditIcon,
    src: AuditImg,
    alt: "Two people reviewing a report at a desk",
  },
  {
    id: 2,
    title: "An honest read",
    desc: "I'll tell you what's working and what isn't, even when the answer is the cheaper plan.",
    Icon: LightBulb,
    src: null,
    alt: "",
  },
  {
    id: 3,
    title: "No pitch if it's not a fit",
    desc: "If nothing I sell fits your operation, I'll say so.",
    Icon: Target,
    src: null,
    alt: "",
  },
  {
    id: 4,
    title: "You get me",
    desc: "Support means talking to the person who built the platform, not a ticket system.",
    Icon: Customer,
    src: ChrisImg,
    alt: "Chris Ware, founder of Fonts & Footers",
  },
];

export default function HowIWork() {
  return (
    <section className={styles.container}>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.topLeft}>
              <EyeBrow text='How I work' />
              <h2
                className={styles.heading}
                data-reveal
                data-reveal-style='fade'
              >
                How We Work
              </h2>
              <p className={styles.copy} data-reveal>
                We built our platform to solve the real problems operators face.
                If that sounds good, you're in the right place. So here are four things you
                can count on, whichever plan you choose.
              </p>
            </div>
            <div className={styles.btnContainer} data-reveal>
              <Button
                href='/audit'
                btnType='black'
                text='Run a free website audit'
                arrow
              />
            </div>
          </div>

          <ul className={styles.grid}>
            {items.map(({ Icon, ...item }) => (
              <li
                className={`${styles.card} ${styles[`card${item.id}`]}`}
                key={item.id}
                data-reveal
              >
                <Icon className={styles.icon} aria-hidden='true' />
                {item.src && (
                  <span className={styles.thumb}>
                    <Image
                      src={item.src}
                      alt={item.alt}
                      fill
                      sizes='120px'
                      className={styles.thumbImg}
                    />
                  </span>
                )}
                <div className={styles.cardBottom}>
                  <h3 className={`${styles.title} h6`}>{item.title}</h3>
                  <p className={styles.desc}>{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </LayoutWrapper>
    </section>
  );
}
