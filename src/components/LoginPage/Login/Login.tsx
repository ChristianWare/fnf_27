import Image from "next/image";
import Link from "next/link";
import styles from "./Login.module.css";
import Logo from "@/components/shared/Logo/Logo";
import LoginForm from "./LoginForm";
import { sampleAccounts } from "@/lib/auth/users";
import Photo from "../../../../public/images/cadiv.png";

const promises = [
  "Follow your build, step by step",
  "Watch your traffic climb each month",
  "Ask for changes anytime, with no limit",
];

export default function Login({ next }: { next?: string }) {
  return (
    <main className={styles.page}>
      <section className={styles.photo} aria-hidden='true'>
        <Image
          src={Photo}
          alt=''
          fill
          priority
          sizes='(max-width: 868px) 1px, 50vw'
          className={styles.photoImg}
        />
        <div className={styles.shade} />
        <div className={styles.photoNote}>
          <span className={styles.mono}>Your dashboard</span>
          <p className={styles.noteTitle}>
            Your website, your bookings and your growth, in one place.
          </p>
          <ul className={styles.promises}>
            {promises.map((text) => (
              <li key={text} className={styles.promise}>
                <span className={styles.tick}>
                  <svg viewBox='0 0 24 24' aria-hidden='true'>
                    <path d='m5 12.5 4.5 4.5L19 7.5' />
                  </svg>
                </span>
                <p>{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelTop}>
          <Logo />
          <Link href='/' className={styles.back}>
            <svg viewBox='0 0 24 24' aria-hidden='true'>
              <path d='M19 12H5m6-6-6 6 6 6' />
            </svg>
            Back to site
          </Link>
        </div>

        <div className={styles.formWrap}>
          <div className={styles.intro}>
            <span className={styles.eyebrow}>Client login</span>
            <h1 className={`h3 ${styles.title}`}>Welcome back</h1>
            <p>
              Sign in to follow your build, see how your site is growing and
              manage your plan.
            </p>
          </div>

          <LoginForm
            next={next}
            samples={sampleAccounts.map(({ email, name, label }) => ({
              email,
              name,
              label,
            }))}
          />
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
  );
}
