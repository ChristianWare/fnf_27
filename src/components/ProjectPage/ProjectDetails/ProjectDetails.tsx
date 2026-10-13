// Everything under a project's hero, laid out like a lead's page: white
// panels on the grey, the case study on the left (the brief, what's
// inside, the scorecard, the client's words) and the call to action on the
// right, staying in view. On a phone it drops below.

import Image from "next/image";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import Icon from "@/components/Dashboard/icons";
import styles from "./ProjectDetails.module.css";
import type { Project } from "@/lib/projects";

const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";

export default function ProjectDetails({ project }: { project: Project }) {
  const { results, quote, brief, inside, cta } = project;

  return (
    <section className={styles.container} aria-label='Case study'>
      <Reveal />
      <div className={styles.column}>
        {/* ── The brief ── */}
        <section className={styles.panel} data-reveal='each'>
          <div className={styles.titles}>
            <h2 className={styles.title}>The brief</h2>
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

        {/* ── What's inside ── */}
        <section className={styles.panel} data-reveal='each'>
          <div className={styles.titles}>
            <h2 className={styles.title}>What&apos;s inside</h2>
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

        {/* ── The scorecard ── */}
        <section className={styles.panel} data-reveal='each'>
          <div className={styles.titles}>
            <span className={styles.eyebrow}>{project.name}</span>
            <h2 className={styles.title}>{results.title}</h2>
            <p>{results.intro}</p>
          </div>
          <ul className={styles.results}>
            {results.rows.map((row) => (
              <li key={row.label} className={styles.result}>
                <span className={styles.resultTop}>
                  <span className={styles.resultLabel}>{row.label}</span>
                  <span className={styles.resultNow}>{row.now}</span>
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
      </div>

      {/* ── Beside it: what to do next ── */}
      <aside className={styles.aside}>
        <section className={styles.cta}>
          <span className={styles.ctaIcon}>
            <Icon name='zap' />
          </span>
          <h2 className={styles.ctaTitle}>{cta.title}</h2>
          <p>{cta.text}</p>
          <div className={styles.ctaButtons}>
            <Button href='/audit' btnType='black' text='Run the free audit' />
            <Button
              href={CALENDAR}
              target='_blank'
              btnType='white'
              text='Book a call'
            />
          </div>
        </section>
      </aside>
    </section>
  );
}
