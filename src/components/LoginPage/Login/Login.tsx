import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./Login.module.css";
import Nav from "@/components/shared/Nav/Nav";
import Photo from "../../../../public/images/cadiv.png";

export type FrameNote = {
  mono: string;
  title: string;
  items: string[];
  /** Number the items instead of ticking them. */
  numbered?: boolean;
};

/**
 * The frame every account page shares (sign in, sign up, reset password):
 * the site's nav on top, a photo card with a note, and the form card.
 */
export default function AuthFrame({
  eyebrow,
  title,
  intro,
  note,
  photo = Photo,
  wide,
  children,
}: {
  eyebrow: string;
  title: string;
  intro?: ReactNode;
  note: FrameNote;
  photo?: StaticImageData;
  /** A roomier form column, for sign-up. */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.wrap}>
      <Nav />
      <main className={styles.page}>
        <section className={styles.photo} aria-hidden='true'>
          <Image
            src={photo}
            alt=''
            fill
            priority
            sizes='(max-width: 868px) 1px, 50vw'
            className={styles.photoImg}
          />
          <div className={styles.shade} />
          <div className={styles.photoNote}>
            <span className={styles.mono}>{note.mono}</span>
            <p className={styles.noteTitle}>{note.title}</p>
            <ul className={styles.promises}>
              {note.items.map((text, index) => (
                <li key={text} className={styles.promise}>
                  <span className={styles.tick}>
                    {note.numbered ? (
                      <span className={styles.tickNum}>{index + 1}</span>
                    ) : (
                      <svg viewBox='0 0 24 24' aria-hidden='true'>
                        <path d='m5 12.5 4.5 4.5L19 7.5' />
                      </svg>
                    )}
                  </span>
                  <p>{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={`${styles.formWrap} ${wide ? styles.formWide : ""}`}>
            <div className={styles.intro}>
              <span className={styles.eyebrow}>{eyebrow}</span>
              <h1 className={`h3 ${styles.title}`}>{title}</h1>
              {intro && <p>{intro}</p>}
            </div>
            {children}
          </div>

          <div className={styles.panelFoot}>
            <span className={styles.mono}>
              © {new Date().getFullYear()} Fonts & Footers
            </span>
            <div className={styles.footLinks}>
              <Link href='/privacy' className={styles.footLink}>
                Privacy
              </Link>
              <Link href='/terms' className={styles.footLink}>
                Terms
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export const DASHBOARD_NOTE: FrameNote = {
  mono: "Your dashboard",
  title: "Your website, your bookings and your growth, in one place.",
  items: [
    "Follow your build, step by step",
    "Watch your traffic climb each month",
    "Ask for changes anytime, with no limit",
  ],
};
