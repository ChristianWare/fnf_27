// The newest post, large: the photo on the left, the text and the author
// on the right. Sits under the heading in the Journal hero.

import Image from "next/image";
import Link from "next/link";
import styles from "./FeaturedPost.module.css";
import Button from "@/components/shared/Button/Button";
import Chris from "../../../../public/images/chris.png";
import { postHref, type Post } from "@/lib/journal";

export default function FeaturedPost({ post }: { post: Post }) {
  const href = postHref(post);
  return (
    <article
      className={styles.card}
      aria-labelledby='featured-post'
      data-reveal
    >
      <Link href={href} className={styles.imgContainer}>
        <Image
          src={post.image}
          alt={post.imageAlt}
          fill
          sizes='(max-width: 968px) 100vw, 45vw'
          className={styles.img}
        />
      </Link>

      <div className={styles.text}>
        <div className={styles.textTop}>
          <div className={styles.meta}>
            <span className={styles.category}>{post.category}</span>
            <span className={styles.date}>{post.dateLabel}</span>
          </div>
          <h2 id='featured-post' className={`${styles.title} h3`}>
            <Link href={href} className={styles.titleLink}>
              {post.title}
            </Link>
          </h2>
          <p className={styles.excerpt}>{post.excerpt}</p>
        </div>

        <div className={styles.bottom}>
          <div className={styles.author}>
            <span className={styles.avatar}>
              <Image
                src={Chris}
                alt=''
                fill
                sizes='44px'
                className={styles.avatarImg}
              />
            </span>
            <span className={styles.authorText}>
              <span className={styles.authorName}>Chris Ware</span>
              <span className={styles.authorRole}>Author</span>
            </span>
          </div>
          <Button href={href} btnType='black' text='Read the post' arrow />
        </div>
      </div>
    </article>
  );
}
