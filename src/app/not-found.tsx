// The 404 page, for any address the site doesn't have: old links, typos,
// and pages that moved when the site was rebuilt. The old site's main
// pages and the old dashboard's links are sent to their new homes in
// next.config.ts, so this is for everything else.

import type { Metadata } from "next";
import Image from "next/image";
import page from "./page.module.css";
import styles from "./not-found.module.css";
import Nav from "@/components/shared/Nav/Nav";
import Footer from "@/components/shared/Footer/Footer";
import Button from "@/components/shared/Button/Button";
import subNoBG from "../../public/images/subNoBG.png";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className={page.container}>
      <Nav />
      <section className={styles.card} aria-labelledby='not-found-heading'>
        <div className={styles.imgContainer}>
          <Image
            src={subNoBG}
            alt=''
            fill
            priority
            sizes='(max-width: 568px) 90vw, 460px'
            className={styles.img}
          />
        </div>
        <h1 id='not-found-heading' className={`${styles.heading} heading2`}>
          Sorry the page you are looking for couldn&apos;t be found!
        </h1>
        <Button href='/' btnType='black' text='Back to Home' arrow />
      </section>
      <Footer />
    </main>
  );
}
