// How a build works, from the first call to after launch. The same layout
// as the old fee calculator: a centered heading, a grid of light cards with
// a photo through the middle, and a black bar with the short version.

import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./BuildProcess.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import Logo from "@/components/shared/Logo/Logo";
import BuildImg from "../../../../public/images/launch.jpg";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";

const steps = [
  {
    id: 1,
    label: "The call",
    text: "A 20-minute call about your market, your fleet and your current setup.",
  },
  {
    id: 2,
    label: "The page map",
    text: "The page map for your airports, routes and cities.",
  },
  {
    id: 3,
    label: "The build",
    text: "The build: design, pages and, on the Full Platform, booking set up with your vehicles and rates.",
  },
  {
    id: 4,
    label: "Launch",
    text: "Launch: we point your domain at the new site. Your phone number stays the same.",
  },
  {
    id: 5,
    label: "After launch",
    text: "After launch: edits are included, and new pages get added as you grow.",
  },
];

export default function BuildProcess() {
  return (
    <section className={styles.container} aria-labelledby='build-process'>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <EyeBrow text='The process' />
            <h2
              id='build-process'
              className={styles.heading}
              data-reveal
              data-reveal-style='fade'
            >
              How a Build Works
            </h2>
          </div>

          <ol className={styles.grid} data-reveal>
            {steps.map((step) => (
              <li
                className={`${styles.card} ${styles[`step${step.id}`]}`}
                key={step.id}
              >
                <span className={styles.label}>
                  Step {step.id} · {step.label}
                </span>
                <div className={styles.cardBottom}>
                  <p className={styles.text}>{step.text}</p>
                  <span className={styles.number} aria-hidden='true'>
                    0{step.id}
                  </span>
                </div>
              </li>
            ))}

            <li className={styles.photo} aria-hidden='true'>
              <Image
                src={BuildImg}
                alt=''
                fill
                sizes='(max-width: 968px) 1px, 32vw'
                className={styles.img}
              />
            </li>

            <li className={`${styles.card} ${styles.weeks}`}>
              <span className={styles.label}>Most sites launch within</span>
              <span className={styles.value}>3 weeks</span>
            </li>
          </ol>

          <div className={styles.bar} data-reveal>
            <div className={styles.barLeft}>
              <Logo noText blur='blur' />
              <p className={styles.result}>
                It starts with a 20-minute call, and most sites launch within 3
                weeks. After launch, edits are included and new pages get added
                as you grow.
              </p>
            </div>
            <Button
              href={CALENDAR}
              target='_blank'
              btnType='white'
              text='Book a 20-minute call'
              arrow
            />
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
