// The Journal's heading, with the year mark on the right and the newest
// post underneath, the same frame as the Projects hero.

import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./JournalHero.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import FeaturedPost from "../FeaturedPost/FeaturedPost";
import type { Post } from "../posts";

export default function JournalHero({
  featured,
  category,
}: {
  featured: Post;
  category?: string;
}) {
  return (
    <section className={styles.container}>
      <Reveal onLoad step={150} />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.topLeft}>
              <EyeBrow text={category ? `Journal · ${category}` : "Journal"} />
              <h1
                className={styles.heading}
                data-reveal
                data-reveal-style='fade'
              >
                News and Insights
              </h1>
              <p className={styles.copy} data-reveal>
                Straight answers on booking software, getting found and winning
                accounts, written for the people who run the cars. One post a
                week, no fluff.
              </p>
            </div>

            <span className={styles.mark} data-reveal aria-hidden='true'>
              2026&copy;
            </span>
          </div>

          <FeaturedPost post={featured} />
        </div>
      </LayoutWrapper>
    </section>
  );
}
