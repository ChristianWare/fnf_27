// What the MDX in content/journal renders as. Plain markdown (headings,
// paragraphs, lists, links) gets the article styles; <Figure>, <Quote> and
// <Table> are the components a post can use.

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

/**
 * A comparison table. The first column is the row label; on a phone the
 * table scrolls sideways inside its frame.
 *
 *   <Table
 *     caption='Prices checked October 2026.'
 *     head={["", "Option A", "Option B"]}
 *     rows={[["Monthly price", "$99", "$149"]]}
 *   />
 */
export function Table({
  head,
  rows,
  caption,
}: {
  head: string[];
  rows: string[][];
  caption?: string;
}) {
  return (
    <figure className={styles.tableFigure}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {head.map((cell, i) => (
                <th key={i} scope='col'>
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, i) =>
                  i === 0 ? (
                    <th key={i} scope='row'>
                      {cell}
                    </th>
                  ) : (
                    <td key={i}>{cell}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  );
}

/** A pull quote on a black card. */
export function Quote({ children }: { children: ReactNode }) {
  return (
    <blockquote className={styles.quote}>
      <div className={styles.quoteText}>{children}</div>
    </blockquote>
  );
}

export const mdxComponents: MDXComponents = {
  Figure,
  Quote,
  Table,
  h2: (props) => <h2 className={`${styles.h2} h6`} {...props} />,
  h3: (props) => <h3 className={`${styles.h3} subHeading`} {...props} />,
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
