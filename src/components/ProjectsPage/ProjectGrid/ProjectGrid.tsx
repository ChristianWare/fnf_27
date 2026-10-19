import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./ProjectGrid.module.css";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import NierLogo from "../../../../public/images/nierLogo.png";
// Placeholder photos until you have real ones for each project.
import NierImg from "../../../../public/images/clients/nier/nier1.png";
import Concept1Img from "../../../../public/images/clients/mesa_midnight/mm1.png";
import Concept2Img from "../../../../public/images/branded.jpg";
import NextImg from "../../../../public/images/cadiiv.png";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";

type Project = {
  id: number;
  /** Shown in white on the photo, next to the logo if there is one. */
  name: string;
  logo?: StaticImageData;
  /** The pill under the photo. */
  category: string;
  /** Top right: the city for real work, "Concept" for concept sites. */
  label: string;
  title: string;
  href: string;
  button: string;
  src: StaticImageData;
  alt: string;
};

// Real work first, then the concepts (copy from the site copy doc). The
// concept names and links are placeholders until those sites are built.
const projects: Project[] = [
  {
    id: 1,
    name: "Nier Transportation",
    logo: NierLogo,
    category: "Black car service",
    label: "Phoenix, AZ",
    title: "Nier Transportation",
    href: "/projects/nier-transportation",
    button: "Read the case study",
    src: NierImg,
    alt: "A black SUV parked in the desert",
  },
  {
    id: 2,
    name: "Mesa Midnight",
    category: "Late-night & executive black car",
    label: "Concept",
    title: "Mesa Midnight",
    href: "/projects/mesa-midnight",
    button: "See the concept",
    // PLACEHOLDER image: replace with a Mesa Midnight screenshot.
    src: Concept1Img,
    alt: "The Mesa Midnight home page",
  },
  // {
  //   id: 3,
  //   name: "[Concept 2]",
  //   category: "Wedding & party limo",
  //   label: "Concept",
  //   title: "Concept 2",
  //   href: "/projects/concept-2",
  //   button: "See the concept",
  //   src: Concept2Img,
  //   alt: "Three men in suits and sunglasses, laughing",
  // },
];

function ProjectCard({ project }: { project: Project }) {
  return (
    <article className={styles.card} data-reveal='each'>
      <div className={styles.media}>
        {/* The photo links too, for mouse users. Keyboards and screen
            readers use the button, so they only meet one link per card. */}
        <Link
          href={project.href}
          className={styles.mediaLink}
          tabIndex={-1}
          aria-hidden='true'
        >
          <Image
            src={project.src}
            alt={project.alt}
            fill
            sizes='(max-width: 768px) 100vw, 50vw'
            className={styles.img}
          />
        </Link>
        <span className={styles.brand} aria-hidden='true'>
          <span className={styles.tag}>{project.category}</span>
          {/* <span className={styles.tag}>{project.title}</span> */}
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.label}>{project.label}</span>
        </div>
        {/* <h3 className={`${styles.title} h6`}>
          <span className={styles.srOnly}>{project.name}: </span>
          {project.title}
        </h3> */}
        <div className={styles.btnContainer}>
          <Button href={project.href} btnType='blackUnderline' arrow>
            {/* {project.button} */}
             {project.name}
          </Button>
        </div>
      </div>
    </article>
  );
}

function NextCard() {
  return (
    <article className={styles.card} data-reveal='each'>
      <div className={styles.media}>
        <Image
          src={NextImg}
          alt='A black SUV driving out of a laptop screen'
          fill
          sizes='(max-width: 768px) 100vw, 50vw'
          className={styles.img}
        />
        <span className={styles.brand} aria-hidden='true'>
          Your company
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.meta}>
          <span className={styles.tag}>Black car &amp; limo</span>
          <span className={styles.label}>Next</span>
        </div>
        <h3 className={`${styles.title} h6`}>Want yours next?</h3>
        <div className={styles.btnContainer}>
          <Button
            href={CALENDAR}
            target='_blank'
            btnType='black'
            text='Book a 20-minute call'
          />
          <Button
            href='/audit'
            btnType='gray'
            text='Get a free website audit'
          />
        </div>
      </div>
    </article>
  );
}

export default function ProjectGrid() {
  // With an odd number of projects the last row has a gap, so the "Want
  // yours next?" card fills it. Add a fourth project and it steps aside.
  const showNext = projects.length % 2 === 1;

  return (
    <section className={styles.container}>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <h2 className={styles.srOnly}>All projects</h2>

          <div className={styles.grid}>
            {projects.map((project) => (
              <ProjectCard project={project} key={project.id} />
            ))}
            {/* {showNext && <NextCard />} */}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
