// The rest of the posts, three to a row: the photo on top, then the
// category, the title and the author.

import Image from "next/image";
import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./MorePosts.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import Chris from "../../../../public/images/chris.png";
import { postHref, type Post } from "@/lib/journal";

export default function MorePosts({
  posts,
  heading = "More posts",
}: {
  posts: Post[];
  heading?: string;
}) {
  if (posts.length === 0) return null;
  return (
    <section className={styles.container} aria-label={heading}>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top} data-reveal>
            <EyeBrow text={heading} />
            <span className={styles.count}>
              {String(posts.length).padStart(2, "0")}
            </span>
          </div>

          <ul className={styles.grid}>
            {posts.map((post) => (
              <li key={post.slug} data-reveal='each'>
                <Link href={postHref(post)} className={styles.card}>
                  <span className={styles.imgContainer}>
                    <Image
                      src={post.image}
                      alt={post.imageAlt}
                      fill
                      sizes='(max-width: 768px) 100vw, (max-width: 1268px) 50vw, 33vw'
                      className={styles.img}
                    />
                  </span>
                  <span className={styles.text}>
                    <span className={styles.meta}>
                      <span className={styles.category}>{post.category}</span>
                      <span className={styles.date}>{post.dateLabel}</span>
                    </span>
                    <span className={`${styles.title} h6`}>{post.title}</span>
                    <span className={styles.author}>
                      <span className={styles.avatar}>
                        <Image
                          src={Chris}
                          alt=''
                          fill
                          sizes='40px'
                          className={styles.avatarImg}
                        />
                      </span>
                      <span className={styles.authorText}>
                        <span className={styles.authorName}>Chris Ware</span>
                        <span className={styles.authorRole}>Author</span>
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </LayoutWrapper>
    </section>
  );
}
