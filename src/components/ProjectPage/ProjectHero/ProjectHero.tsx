// A project's hero: the title and summary across the top, with the site
// link and a call beside them, then the photos: one large picture with the
// smaller ones under it to switch between.

import styles from "./ProjectHero.module.css";
import Reveal from "@/components/shared/Reveal/Reveal";
import Button from "@/components/shared/Button/Button";
import ProjectGallery from "./ProjectGallery";
import type { Project } from "@/lib/projects";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";

export default function ProjectHero({ project }: { project: Project }) {
  // The project's own site, if it has one: the fact with a link.
  const site = project.facts.find((fact) => fact.href);

  return (
    <section className={styles.container}>
      <Reveal onLoad step={150} />
      <div className={styles.inner}>
        <header className={styles.head}>
          <div className={styles.titles}>
            <h1
              className={styles.heading}
              data-reveal
              data-reveal-style='fade'
            >
              {project.title}
            </h1>
            <p className={styles.copy} data-reveal>
              {project.summary}
            </p>
          </div>
          <div className={styles.buttons} data-reveal>
            {site?.href && (
              <Button
                href={site.href}
                target='_blank'
                btnType='gray'
                text='Visit the site'
              />
            )}
            <Button
              href={CALENDAR}
              target='_blank'
              btnType='black'
              text='Book a call'
            />
          </div>
        </header>

        <ProjectGallery photos={project.photos} name={project.name} />
      </div>
    </section>
  );
}
