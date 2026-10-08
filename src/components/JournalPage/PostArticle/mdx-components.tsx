// What the MDX in content/journal renders as. Plain markdown (headings,
// paragraphs, lists, links) gets the article styles; <Figure> and <Quote>
// are the two components a post can use.

import Image from "next/image";
import type { ReactNode } from "react";
import type { MDXComponents } from "mdx/types";
import styles from "./PostArticle.module.css";

/** A full-width photo with an optional caption. src is a path under public/. */
export function Figure({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: string;
}) {
  return (
    <figure className={styles.figure}>
      <span className={styles.figureImg}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes='(max-width: 968px) 100vw, 60vw'
          className={styles.img}
        />
      </span>
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
}

/** A pull quote on a black card. */
export function Quote({ children }: { children: ReactNode }) {
  return (
    <blockquote className={styles.quote}>
      <p className={styles.quoteText}>{children}</p>
    </blockquote>
  );
}

export const mdxComponents: MDXComponents = {
  Figure,
  Quote,
  h2: (props) => <h2 className={`${styles.h2} h5`} {...props} />,
  h3: (props) => <h3 className={`${styles.h3} h6`} {...props} />,
  p: (props) => <p className={styles.p} {...props} />,
  ul: (props) => <ul className={styles.ul} {...props} />,
  ol: (props) => <ol className={styles.ol} {...props} />,
  li: (props) => <li className={styles.li} {...props} />,
  a: (props) => <a className={styles.a} {...props} />,
  strong: (props) => <strong className={styles.strong} {...props} />,
  hr: () => <hr className={styles.hr} />,
  // A plain markdown blockquote gets the same card as <Quote>.
  blockquote: ({ children }) => (
    <blockquote className={styles.quote}>{children}</blockquote>
  ),
  // A plain markdown image gets the figure frame, without a caption.
  img: ({ src, alt }) =>
    typeof src === "string" ? <Figure src={src} alt={alt ?? ""} /> : null,
};
