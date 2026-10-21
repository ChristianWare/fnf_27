// The proof near the top of a service page: Nier's real numbers and
// Barry's words, with his photo. Only numbers we can stand behind.

import Image from "next/image";
import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import Reveal from "@/components/shared/Reveal/Reveal";
import styles from "./ProofBand.module.css";
import Barry from "../../../../public/images/barry.png";

const stats = [
  { value: "$0", label: "Per-booking fees" },
  { value: "53", label: "Pages built for search" },
  { value: "+105%", label: "Organic traffic" },
  { value: "0", label: "Days offline at the switch" },
];

export default function ProofBand() {
  return (
    <section className={styles.container} aria-label='Results for Nier Transportation'>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left} data-reveal>
            <p className={styles.eyebrow}>
              Nier Transportation · Phoenix · since 2004
            </p>
            <blockquote className={styles.quote}>
              &ldquo;It paid for itself in the first month.&rdquo;
            </blockquote>
            <div className={styles.by}>
              <span className={styles.avatar}>
                <Image src={Barry} alt='' fill sizes='44px' className={styles.avatarImg} />
              </span>
              <span className={styles.who}>
                <span className={styles.name}>Barry LaNier</span>
                <span className={styles.role}>Owner, Nier Transportation</span>
              </span>
            </div>
            <Link href='/projects/nier-transportation' className={styles.link}>
              Read the case study
            </Link>
          </div>
          <dl className={styles.stats} data-reveal>
            {stats.map((stat) => (
              <div className={styles.stat} key={stat.label}>
                <dt className={styles.statLabel}>{stat.label}</dt>
                <dd className={styles.statValue}>{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </LayoutWrapper>
    </section>
  );
}
