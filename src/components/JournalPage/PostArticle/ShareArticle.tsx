"use client";

// The share buttons beside the article: copy the link, LinkedIn, Facebook
// and X. The copy button says "Copied" for a moment.

import { useState } from "react";
import styles from "./PostArticle.module.css";
import LinkIcon from "@/components/shared/icons/LinkIcon/LinkIcon";
import LinkedIn from "@/components/shared/icons/LinkedIn/LinkedIn";
import Facebook from "@/components/shared/icons/Facebook/Facebook";
import XLogo from "@/components/shared/icons/XLogo/XLogo";

export default function ShareArticle({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(title);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers: select-and-copy isn't worth the code here.
    }
  }

  const links = [
    {
      label: "Share on LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
      Icon: LinkedIn,
    },
    {
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      Icon: Facebook,
    },
    {
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?url=${encoded}&text=${text}`,
      Icon: XLogo,
    },
  ];

  return (
    <div className={styles.share}>
      <button
        type='button'
        className={styles.shareBtn}
        onClick={copy}
        aria-label={copied ? "Link copied" : "Copy link"}
        title={copied ? "Copied" : "Copy link"}
      >
        <LinkIcon className={styles.shareIcon} aria-hidden='true' />
      </button>
      {links.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          className={styles.shareBtn}
          target='_blank'
          rel='noopener noreferrer'
          aria-label={label}
          title={label}
        >
          <Icon className={styles.shareIcon} aria-hidden='true' />
        </a>
      ))}
      <span className={styles.copied} role='status' aria-live='polite'>
        {copied ? "Link copied" : ""}
      </span>
    </div>
  );
}
