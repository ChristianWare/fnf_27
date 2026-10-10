// The three newest Journal posts, from the same files the Journal reads
// (content/journal). Add a post there and it shows here on its own.

import Image from "next/image";
import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./JournalPreview.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Chris from "../../../../public/images/chris.png";
import Reveal from "@/components/shared/Reveal/Reveal";
import { getPosts, postHref } from "@/lib/journal";

export default function JournalPreview() {
  const posts = getPosts().slice(0, 3);
  if (posts.length === 0) return null;

  return (
    <section className={styles.container}>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left} data-reveal>
            <EyeBrow text='Journal' />
            <h2 className={styles.heading}>Guides for operators</h2>
            <p className={styles.copy}>
              Straight answers on booking software, getting found and winning
              accounts.
            </p>
            <div className={styles.btnContainer}>
              <Button
                href='/journal'
                btnType='black'
                text='Read the Journal'
                arrow
              />
            </div>
          </div>

          <div className={styles.right}>
            {posts.map((post) => (
              <Link
                href={postHref(post)}
                className={styles.card}
                key={post.slug}
                data-reveal='each'
              >
                <div className={styles.cardLeft}>
                  <div className={styles.cardTop}>
                    <div className={styles.meta}>
                      <span className={styles.category}>{post.category}</span>
                      <span className={styles.date}>{post.dateLabel}</span>
                    </div>
                    <h3 className={`${styles.title} h6`}>{post.title}</h3>
                  </div>
                  <div className={styles.author}>
                    <span className={styles.avatar}>
                      <Image
                        src={Chris}
                        alt=''
                        fill
                        sizes='36px'
                        className={styles.avatarImg}
                      />
                    </span>
                    <span className={styles.authorText}>
                      <span className={styles.authorName}>{post.author}</span>
                      <span className={styles.authorRole}>Author</span>
                    </span>
                  </div>
                </div>
                <div className={styles.imgContainer}>
                  <Image
                    src={post.image}
                    alt={post.imageAlt}
                    fill
                    sizes='(max-width: 568px) 100vw, 380px'
                    className={styles.img}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
