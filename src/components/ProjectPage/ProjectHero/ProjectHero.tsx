// A project's hero: the client, the result and the facts on the left, the
// photo on the right. The same frame as the Websites and Leads heroes.

import Image from "next/image";
import styles from "./ProjectHero.module.css";
import Reveal from "@/components/shared/Reveal/Reveal";
import type { Project } from "@/lib/projects";

export default function ProjectHero({ project }: { project: Project }) {
  return (
    <section className={styles.container}>
      <div className={styles.textCard}>
        <Reveal onLoad step={150} />
        <div className={styles.top}>
          <div className={styles.client} data-reveal>
            {project.logo && (
              <Image
                src={project.logo}
                alt=''
                className={styles.logo}
                sizes='40px'
              />
            )}
            <span className={styles.clientName}>{project.name}</span>
          </div>
          <h1
            className={`${styles.heading} heading2`}
            data-reveal
            data-reveal-style='fade'
          >
            {project.title}
          </h1>
        </div>

        <dl className={styles.facts} data-reveal>
          {project.facts.map((fact) => (
            <div className={styles.fact} key={fact.label}>
              <dt className={styles.factLabel}>{fact.label}:</dt>
              <dd className={styles.factValue}>
                {fact.href ? (
                  <a
                    href={fact.href}
                    target='_blank'
                    rel='noopener noreferrer'
                    className={styles.factLink}
                  >
                    {fact.value}
                  </a>
                ) : (
                  fact.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className={styles.photo}>
        <Image
          src={project.hero}
          alt={project.heroAlt}
          fill
          sizes='(max-width: 968px) 100vw, 50vw'
          loading='eager'
          fetchPriority='high'
          className={styles.img}
        />
      </div>
    </section>
  );
}
