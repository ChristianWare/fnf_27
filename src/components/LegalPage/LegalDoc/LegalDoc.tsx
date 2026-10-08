// A legal page: the title and the date on top, the contents down the
// left, the numbered sections on the right. Used by /privacy and /terms.

import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./LegalDoc.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import LegalToc from "./LegalToc";
import type { LegalDocData } from "@/lib/legal/types";

export default function LegalDoc({ doc }: { doc: LegalDocData }) {
  return (
    <section className={styles.container}>
      <Reveal onLoad step={150} />
      <LayoutWrapper>
        <div className={styles.content}>
          <header className={styles.top}>
            <div className={styles.topLeft}>
              <EyeBrow text={doc.eyebrow} />
              <h1
                className={styles.heading}
                data-reveal
                data-reveal-style='fade'
              >
                {doc.title}
              </h1>
            </div>
            <p className={styles.updated} data-reveal>
              Last updated: {doc.updated}
            </p>
          </header>

          <div className={styles.body}>
            <div className={styles.side} data-reveal>
              <LegalToc sections={doc.sections} />
            </div>

            <div className={styles.sections} data-reveal>
              {doc.sections.map((section, i) => (
                <section
                  key={section.id}
                  id={section.id}
                  className={styles.section}
                  aria-labelledby={`${section.id}-title`}
                >
                  <h2
                    id={`${section.id}-title`}
                    className={`${styles.sectionTitle} h6`}
                  >
                    {i + 1}. {section.title}
                  </h2>
                  {section.blocks.map((block, j) =>
                    block.type === "list" ? (
                      <ul className={styles.list} key={j}>
                        {block.items.map((item) => (
                          <li className={styles.item} key={item}>
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.p} key={j}>
                        {block.text}
                      </p>
                    ),
                  )}
                </section>
              ))}
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
