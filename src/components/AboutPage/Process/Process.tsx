import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Process.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Chris from "../../../../public/images/chris.png";
import AuditImg from "../../../../public/images/audit.jpg";
import MapImg from "../../../../public/images/brandedWebsite.png";
import BuildImg from "../../../../public/images/WhyWeExist.jpg";
import LaunchImg from "../../../../public/images/cadiv.png";
import OngoingImg from "../../../../public/images/happyClient.jpg";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";

// How a new website gets built, from the first call to after launch.
const steps = [
  {
    id: 1,
    title: "Free audit",
    desc: "I run your site and Google profile through the audit, and we go over what's costing you bookings on a 20-minute call.",
    src: AuditImg,
    alt: "An operator checking his phone",
  },
  {
    id: 2,
    title: "Page map",
    desc: "We plan the pages riders search for in your market: your airports, routes, services and cities.",
    src: MapImg,
    alt: "A black SUV on a laptop screen",
  },
  {
    id: 3,
    title: "Design & build",
    desc: "A custom site with your fleet, your photos and your brand. You review it on a private link before anything goes live.",
    src: BuildImg,
    alt: "A website being built on a desktop computer",
  },
  {
    id: 4,
    title: "Launch",
    desc: "I point your domain at the new site. Your domain and your phone number stay yours.",
    src: LaunchImg,
    alt: "A black SUV on an open road",
  },
  {
    id: 5,
    title: "Ongoing",
    desc: "Hosting, edits and new pages are included in the monthly rate, and you deal with me directly.",
    src: OngoingImg,
    alt: "A client smiling at her laptop",
  },
];

export default function Process() {
  return (
    <section className={styles.container}>
      <Reveal />

      <div className={styles.head}>
        <LayoutWrapper paddingNSNone='paddingNSNone'>
          <div className={styles.headContent}>
            <div className={styles.headLeft}>
              <EyeBrow text='Process' />
              <h2
                className={styles.heading}
                data-reveal
                data-reveal-style='fade'
              >
                From first call to live site.
              </h2>
            </div>

            <a
              href={CALENDAR}
              target='_blank'
              rel='noopener noreferrer'
              className={styles.talk}
              aria-label='Book a 20-minute call with Chris Ware'
              data-reveal
            >
              <span className={styles.talkPhoto}>
                <Image
                  src={Chris}
                  alt=''
                  fill
                  sizes='64px'
                  className={styles.cover}
                />
              </span>
              <span className={styles.talkText}>
                <span className={styles.mono}>Let&apos;s talk</span>
                <span className={styles.talkName}>Chris Ware</span>
                <span className={styles.mono}>Founder · Phoenix, AZ</span>
              </span>
              <span className={styles.talkArrow}>
                <Arrow className={styles.arrow} aria-hidden='true' />
              </span>
            </a>
          </div>
        </LayoutWrapper>
      </div>

      <ol className={styles.steps}>
        {steps.map((step) => (
          <li className={styles.step} key={step.id} data-reveal>
            <div className={styles.photo}>
              <Image
                src={step.src}
                alt={step.alt}
                fill
                sizes='(max-width: 568px) 78vw, (max-width: 1068px) 40vw, 20vw'
                className={styles.cover}
              />
            </div>
            <div className={styles.info}>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <span className={styles.mono}>Step 0{step.id}</span>
              <p className={styles.stepDesc}>{step.desc}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
