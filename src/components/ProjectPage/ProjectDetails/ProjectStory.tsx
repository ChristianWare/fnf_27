// The case study itself: headed paragraphs, a quote card and a photo, in
// a reading column.

import Image from "next/image";
import styles from "./ProjectDetails.module.css";
import type { StoryBlock } from "@/lib/projects";

export default function ProjectStory({ story }: { story: StoryBlock[] }) {
  return (
    <div className={styles.story}>
      {story.map((block, i) => {
        if (block.type === "quote") {
          return (
            <figure className={styles.quote} key={i} data-reveal='each'>
              <blockquote className={styles.quoteText}>
                &ldquo;{block.text}&rdquo;
              </blockquote>
              <figcaption className={styles.quoteBy}>
                {block.avatar && (
                  <span className={styles.quoteAvatar}>
                    <Image
                      src={block.avatar}
                      alt=''
                      fill
                      sizes='44px'
                      className={styles.quoteAvatarImg}
                    />
                  </span>
                )}
                <span className={styles.quoteWho}>
                  <span className={styles.quoteName}>{block.name}</span>
                  <span className={styles.quoteRole}>{block.role}</span>
                </span>
              </figcaption>
            </figure>
          );
        }
        if (block.type === "image") {
          return (
            <div className={styles.photo} key={i} data-reveal='each'>
              <Image
                src={block.src}
                alt={block.alt}
                fill
                sizes='(max-width: 968px) 100vw, 880px'
                className={styles.img}
              />
            </div>
          );
        }
        return (
          <div className={styles.text} key={i} data-reveal='each'>
            <h2 className={`${styles.heading} h6`}>{block.heading}</h2>
            {block.paragraphs.map((paragraph, j) => (
              <p className={styles.p} key={j}>
                {paragraph}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}
