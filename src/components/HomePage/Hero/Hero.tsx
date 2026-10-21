import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Hero.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
// import ServicesHeroPreview from "../ServicesHeroPreview/ServicesHeroPreview";
import Reveal from "@/components/shared/Reveal/Reveal";
import Floating, {
  FloatingElement,
} from "@/components/shared/Floating/Floating";
import Suburban from "../../../../public/images/subNoBG.png";
import Image from "next/image";
import Plane from "@/components/shared/icons/Plane/Plane";
import Stariii from "@/components/shared/icons/Stariii/Stariii";
import Company from "@/components/shared/icons/Company/Company";

// depth = how far each tag travels with the mouse (higher = farther)
const tags = [
  {
    id: 1,
    text: "Airport run, 4:30 AM",
    Icon: Plane,
    className: "tag1",
    depth: 1.5,
  },
  { id: 2, text: "Wedding day", Icon: Stariii, className: "tag2", depth: 1 },
  { id: 3, text: "Client pickup", Icon: Company, className: "tag3", depth: 2 },
];

export default function Hero() {
  return (
    <section className={styles.container}>
      <Reveal onLoad step={180} />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <EyeBrow text='Black car & limo operators' />
            <h1
              className={`${styles.heading} `}
              data-reveal
              data-reveal-style='fade'
            >
              Expand your
              {/* 👨‍✈️  */}
              <br /> Black Car Business
            </h1>
            <p className={styles.copy} data-reveal>
              Your website, booking and dispatch software, and a leads tool, in
              one system for $499 a month. No per-booking fees. Start with free
              leads in your city.
            </p>
            <div className={styles.btnContainer} data-reveal>
              <Button
                href='/register?plan=leads'
                btnType='black'
                text='Get free leads in your city'
                arrow
              />
              <Button
                href='/audit'
                btnType='gray'
                text='Get a free website audit'
                arrow
              />
            </div>
          </div>
          <div className={styles.right} data-reveal>
            {/* <ServicesHeroPreview /> */}
            <Floating className={styles.imgContainer} sensitivity={1}>
              <FloatingElement depth={0.5} className={styles.imgLayer}>
                <Image
                  src={Suburban}
                  alt='A black Chevrolet Suburban, front view'
                  fill
                  sizes='(max-width: 968px) 100vw, 50vw'
                  className={styles.img}
                />
              </FloatingElement>
              {tags.map(({ id, text, Icon, className, depth }) => (
                <FloatingElement
                  key={id}
                  depth={depth}
                  className={`${styles.tag} ${styles[className]}`}
                >
                  <span className={styles.tagIcon}>
                    <Icon aria-hidden='true' />
                  </span>
                  <span className={styles.tagText}>{text}</span>
                </FloatingElement>
              ))}
            </Floating>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
