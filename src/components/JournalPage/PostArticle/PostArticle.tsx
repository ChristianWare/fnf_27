// One post: the title and photo on top, then the introduction and the
// details down the left with the article on the right.

import Image from "next/image";
import Link from "next/link";
import { compileMDX } from "next-mdx-remote/rsc";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./PostArticle.module.css";
import Reveal from "@/components/shared/Reveal/Reveal";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import Chris from "../../../../public/images/chris.png";
import ShareArticle from "./ShareArticle";
import { mdxComponents } from "./mdx-components";
import type { Post } from "@/lib/journal";

// The site's address, for the share links.
const SITE = "https://fontsandfooters.com";

export default async function PostArticle({ post }: { post: Post }) {
  const { content } = await compileMDX({
    source: post.body,
    components: mdxComponents,
  });
  const url = `${SITE}/journal/${post.slug}`;

  return (
    <article className={styles.container}>
      <Reveal onLoad step={150} />
      <LayoutWrapper>
        <div className={styles.content}>
          {/* The top: back link, title, photo. */}
          <header className={styles.top}>
            <Link href='/journal' className={styles.back} data-reveal>
              <Arrow className={styles.backArrow} aria-hidden='true' />
              All posts
            </Link>
            <h1
              className={`${styles.heading} heading2`}
              data-reveal
              data-reveal-style='fade'
            >
              {post.title}
            </h1>
            <div className={styles.hero} data-reveal>
              <Image
                src={post.image}
                alt={post.imageAlt}
                fill
                sizes='(max-width: 1800px) 100vw, 1800px'
                priority
                className={styles.heroImg}
              />
            </div>
          </header>

          {/* The body: the introduction and details on the left, the
              article on the right. */}
          <div className={styles.body}>
            <aside className={styles.side}>
              <div className={styles.sideInner}>
                <h2 className={`${styles.sideTitle} h6`}>Introduction</h2>
                <p className={styles.intro}>{post.intro}</p>

                <dl className={styles.rows}>
                  <div className={styles.row}>
                    <dt className={styles.srOnly}>Category</dt>
                    <dd className={styles.mono}>{post.category}</dd>
                  </div>
                  <div className={styles.row}>
                    <dt className={styles.srOnly}>Published</dt>
                    <dd className={styles.mono}>
                      <time dateTime={post.date}>{post.dateLabel}</time>
                    </dd>
                  </div>
                  <div className={styles.row}>
                    <dt className={styles.srOnly}>Author</dt>
                    <dd className={styles.author}>
                      <span className={styles.avatar}>
                        <Image
                          src={Chris}
                          alt=''
                          fill
                          sizes='28px'
                          className={styles.avatarImg}
                        />
                      </span>
                      <span className={styles.mono}>{post.author}</span>
                    </dd>
                  </div>
                  <div className={styles.row}>
                    <dt className={styles.srOnly}>Reading time</dt>
                    <dd className={styles.mono}>{post.readTime} min read</dd>
                  </div>
                </dl>

                <div className={styles.shareBlock}>
                  <span className={styles.label}>Share article</span>
                  <ShareArticle url={url} title={post.title} />
                </div>
              </div>
            </aside>

            <div className={styles.article}>{content}</div>
          </div>
        </div>
      </LayoutWrapper>
    </article>
  );
}
