"use client";

// The numbered list of sections beside a legal page. It stays in view
// while the page scrolls, and the section on screen is shown in black.

import { useEffect, useState } from "react";
import styles from "./LegalDoc.module.css";
import type { LegalSection } from "@/lib/legal/types";

export default function LegalToc({ sections }: { sections: LegalSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const headings = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => el !== null);
    if (headings.length === 0) return;

    // The last heading that has passed the line just under the header
    // wins; at the very bottom of the page, the last section does.
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = 140;
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      let current = headings[0];
      if (atBottom) current = headings[headings.length - 1];
      else
        for (const heading of headings) {
          if (heading.getBoundingClientRect().top <= line) current = heading;
        }
      setActive(current.id);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sections]);

  return (
    <nav className={styles.toc} aria-label='Contents'>
      <ol className={styles.tocList}>
        {sections.map((section, i) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className={`${styles.tocLink} ${section.id === active ? styles.tocActive : ""}`}
              aria-current={section.id === active ? "location" : undefined}
            >
              {i + 1}. {section.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
