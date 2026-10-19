import Image from "next/image";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import Icon from "@/components/Dashboard/icons";
import styles from "./ProjectDetails.module.css";
import type { Project } from "@/lib/projects";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";

export default function ProjectDetails({ project }: { project: Project }) {
  const { results, quote, brief, inside, cta, facts } = project;

  return (
    <section className={styles.container} aria-label='Case study'>
      <Reveal />
      <div className={styles.inner}>
        <article className={styles.article}>
          {/* ── The brief ── */}
          <section className={styles.section} data-reveal='each'>
            <div className={styles.titles}>
              <h2 className={`${styles.title} h3`}>The Brief</h2>
              <p>The short version, start to finish.</p>
            </div>
            <dl className={styles.brief}>
              {brief.map((line) => (
                <div key={line.label} className={styles.briefRow}>
                  <dt>{line.label}</dt>
                  <dd>{line.text}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* ── The scorecard ── */}
          <section className={styles.section} data-reveal='each'>
            <div className={styles.titles}>
              {/* <span className={styles.eyebrow}>{project.name}</span> */}
              <h2 className={`${styles.title} h3`}>{results.title}</h2>
              <p>{results.intro}</p>
            </div>
            <ul className={styles.results}>
              {results.rows.map((row) => (
                <li key={row.label} className={styles.result}>
                  <span className={styles.resultTop}>
                    <span className={styles.resultLabel}>{row.label}</span>
                    <span className={`${styles.resultNow} h6`}>{row.now}</span>
                  </span>
                  {row.before && (
                    <span className={styles.before}>
                      <span className={styles.compareLabel}>
                        {results.beforeLabel}
                      </span>
                      <s>{row.before}</s>
                    </span>
                  )}
                  <p>{row.note}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* ── What's inside ── */}
          <section className={styles.section} data-reveal='each'>
            <div className={styles.titles}>
              <h2 className={`${styles.title} h3`}>What&apos;s inside</h2>
              <p>The parts of the platform this project runs on.</p>
            </div>
            <ul className={styles.inside}>
              {inside.map((f) => (
                <li key={f.title} className={styles.feature}>
                  <span className={styles.featureIcon}>
                    <Icon name={f.icon} />
                  </span>
                  <span className={styles.featureTitle}>{f.title}</span>
                  <p>{f.text}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* ── The client's words ── */}
          {quote && (
            <figure className={styles.quote} data-reveal='each'>
              <blockquote className={styles.quoteText}>
                &ldquo;{quote.text}&rdquo;
              </blockquote>
              <figcaption className={styles.quoteBy}>
                {quote.avatar && (
                  <span className={styles.quoteAvatar}>
                    <Image
                      src={quote.avatar}
                      alt=''
                      fill
                      sizes='48px'
                      className={styles.quoteAvatarImg}
                    />
                  </span>
                )}
                <span className={styles.quoteWho}>
                  <span className={styles.quoteName}>{quote.name}</span>
                  <span className={styles.quoteRole}>{quote.role}</span>
                </span>
              </figcaption>
            </figure>
          )}
        </article>

        {/* ── Beside it: the facts, and what to do next ── */}
        <aside className={styles.aside}>
          <section className={styles.factsCard} aria-label='Project facts'>
            <div className={styles.client}>
              <Image
                src={project.logo}
                alt={`${project.name} logo`}
                sizes='44px'
                className={styles.clientLogo}
              />
              <span className={styles.clientName}>{project.name}</span>
            </div>
            <dl className={styles.facts}>
              {facts.map((fact) => (
                <div className={styles.fact} key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>
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
          </section>

          <section className={styles.cta}>
            <span className={styles.ctaIcon}>
              <Icon name='zap' />
            </span>
            <h2 className={`${styles.ctaTitle} h5`}>{cta.title}</h2>
            <p>{cta.text}</p>
            <div className={styles.ctaButtons}>
              <Button
                href='/audit'
                btnType='black'
                text='Run the free audit'
                arrow
              />
              <Button
                href={CALENDAR}
                target='_blank'
                btnType='white'
                text='Book a call'
                arrow
              />
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
