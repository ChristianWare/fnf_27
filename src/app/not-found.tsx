import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import page from "./page.module.css";
import styles from "./not-found.module.css";
import Nav from "@/components/shared/Nav/Nav";
import Footer from "@/components/shared/Footer/Footer";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import subNoBG from "../../public/images/subNoBG.png";

export const metadata: Metadata = {
  title: "Page not found",
};

// Where most people are headed.
const places = [
  {
    href: "/services/websites",
    title: "Websites",
    desc: "Sites built to rank for the rides riders search for.",
  },
  {
    href: "/services/booking-software",
    title: "Booking software",
    desc: "Booking, dispatch and payments, with no per-booking fees.",
  },
  {
    href: "/services/leads",
    title: "Leads",
    desc: "The hotels, venues and accounts near you, every morning.",
  },
  {
    href: "/pricing",
    title: "Pricing",
    desc: "Every plan side by side, with the prices published.",
  },
  {
    href: "/audit",
    title: "Free website audit",
    desc: "Where your site stands, checked by hand.",
  },
  {
    href: "/journal",
    title: "Journal",
    desc: "Guides on booking software, getting found and winning accounts.",
  },
];

export default function NotFound() {
  return (
    <main className={page.container}>
      <Nav />
      <section className={styles.card} aria-labelledby='not-found-heading'>
        <div className={styles.top}>
          <div className={styles.imgContainer}>
            <Image
              src={subNoBG}
              alt=''
              fill
              priority
              sizes='(max-width: 568px) 80vw, 340px'
              className={styles.img}
            />
          </div>
          <EyeBrow text='404 · Page not found' />
          <h1 id='not-found-heading' className={`${styles.heading} heading2`}>
            This page took a wrong turn
          </h1>
          <p className={styles.copy}>
            The link may be old, or the page may have moved when we rebuilt the
            site. Here&apos;s where most people are headed.
          </p>
          <div className={styles.btnContainer}>
            <Button
              href='/'
              btnType='black'
              text='Back to the home page'
              arrow
            />
            <Button href='/contact' btnType='gray' text='Contact us' />
          </div>
          <p className={styles.login}>
            Looking for your dashboard?{" "}
            <Link href='/login' className={styles.loginLink}>
              Log in here
            </Link>
            .
          </p>
        </div>

        <ul className={styles.places}>
          {places.map((place) => (
            <li key={place.href}>
              <Link href={place.href} className={styles.place}>
                <span className={`${styles.placeTitle} subHeading`}>
                  {place.title}
                </span>
                <span className={styles.placeDesc}>{place.desc}</span>
                <Arrow className={styles.arrow} aria-hidden='true' />
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <Footer />
    </main>
  );
}
