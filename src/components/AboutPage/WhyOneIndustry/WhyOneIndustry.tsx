import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./WhyOneIndustry.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import Plane from "@/components/shared/icons/Plane/Plane";
import Stariii from "@/components/shared/icons/Stariii/Stariii";
import Company from "@/components/shared/icons/Company/Company";
import Suburban from "../../../../public/images/subNoBG.png";

const stats = [
  {
    id: 1,
    value: "1",
    label: "Industry. Black car & limo, nothing else",
    wide: true,
  },
  { id: 2, value: "$0", label: "Per-booking fees on any plan", wide: false },
  {
    id: 3,
    value: "24/7",
    label: "Online booking for your riders",
    wide: false,
  },
];

// The moments from the copy, pinned around the vehicle like map markers.
const tags = [
  { id: 1, text: "Airport run, 4:30 AM", Icon: Plane, className: "tag1" },
  { id: 2, text: "Wedding day", Icon: Stariii, className: "tag2" },
  { id: 3, text: "Client pickup", Icon: Company, className: "tag3" },
];

export default function WhyOneIndustry() {
  return (
    <section className={styles.container}>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <div className={styles.leftTop}>
              <EyeBrow text='Why only black car operators' />
              <h2
                className={`${styles.heading} h4`}
                data-reveal
                data-reveal-style='fade'
              >
                People ask why we only build for black car and limo operators.
                Why not restaurants, gyms, or small businesses in general?
              </h2>
              <div className={styles.copies} data-reveal>
                <p className={styles.copy}>
                  Because the bar is different here. Your whole product is a
                  premium, dependable experience. Someone is trusting you with
                  an airport run before a flight they can&apos;t miss, a wedding
                  day, or a client they&apos;re trying to impress. Your website
                  is the first place they decide whether they believe you can
                  deliver that.
                </p>
                <p className={styles.copy}>
                  A generic template doesn&apos;t carry that weight. I&apos;ve
                  spent enough time inside this one industry to know where these
                  sites lose people, and what makes an operator look like the
                  obvious choice. One industry, done properly, beats being a
                  generalist who sort of gets it.
                </p>
              </div>
              <div className={styles.btnContainer} data-reveal>
                <Button
                  href='/services'
                  btnType='black'
                  text='Explore services'
                  arrow
                />
              </div>
            </div>

            <dl className={styles.stats} data-reveal>
              {stats.map((stat) => (
                <div
                  className={`${styles.stat} ${stat.wide ? styles.statWide : ""}`}
                  key={stat.id}
                >
                  <dt className={styles.statLabel}>{stat.label}</dt>
                  <dd className={`${styles.statValue} h2`}>{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className={styles.right} data-reveal>
            <div className={styles.imgContainer}>
              <Image
                src={Suburban}
                alt='A black Chevrolet Suburban, front view'
                fill
                sizes='(max-width: 968px) 100vw, 50vw'
                className={styles.img}
              />
              {tags.map(({ id, text, Icon, className }) => (
                <span className={`${styles.tag} ${styles[className]}`} key={id}>
                  <span className={styles.tagIcon}>
                    <Icon aria-hidden='true' />
                  </span>
                  <span className={styles.tagText}>{text}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
