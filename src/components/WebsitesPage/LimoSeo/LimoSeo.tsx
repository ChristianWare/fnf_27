"use client";

// The five things that move a limo company's rankings. Built like the
// services section on the home page: the intro and a list of the five stay
// on the left while the cards scroll by on the right, and the list marks
// the card that's in view. Clicking a name in the list scrolls to its card.

import { useEffect, useRef, useState } from "react";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./LimoSeo.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Arrow from "@/components/shared/icons/Arrow/Arrow";
import SlideInImage from "@/components/shared/SlideInImage/SlideInImage";
import Reveal from "@/components/shared/Reveal/Reveal";
import SearchImg from "../../../../public/images/audit.jpg";
import ProfileImg from "../../../../public/images/mapImg.jpg";
import ReviewsImg from "../../../../public/images/clients.jpg";
import AiImg from "../../../../public/images/connected.jpg";
import TimeImg from "../../../../public/images/buildImg.jpg";

const factors = [
  {
    id: 1,
    title: "Match how riders search",
    desc: "Searches are specific, local and usually on a phone. Your site needs pages that match them word for word.",
    src: SearchImg,
  },
  {
    id: 2,
    title: "Your Google Business Profile",
    desc: "For local searches, your map listing often brings more calls than your website. Fill in every field, add real fleet photos, and pick the right categories.",
    src: ProfileImg,
  },
  {
    id: 3,
    title: "Reviews",
    desc: "Steady, recent reviews beat a big old count. Ask after every clean run.",
    src: ReviewsImg,
  },
  {
    id: 4,
    title: "AI search",
    desc: "More clients ask ChatGPT or Perplexity for a recommendation. Service areas, policies, prices and FAQs written in plain text are what let an AI name you.",
    src: AiImg,
  },
  {
    id: 5,
    title: "Time",
    desc: "New pages usually start showing up within a few months, and rankings keep building from there. Anyone promising page one in a few weeks is guessing.",
    src: TimeImg,
  },
];

export default function LimoSeo() {
  const listRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(factors[0].id);

  // The card crossing the middle of the screen is the active one.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const cards = Array.from(list.querySelectorAll<HTMLElement>("[data-id]"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setActive(Number((entry.target as HTMLElement).dataset.id));
        });
      },
      // A thin band just above the middle of the screen.
      { rootMargin: "-40% 0px -55% 0px" },
    );
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <section className={styles.container} aria-labelledby='limo-seo'>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          {/* Stays put while the cards scroll past it. */}
          <div className={styles.left}>
            <div className={styles.intro}>
              <EyeBrow text='SEO' />
              <h2
                id='limo-seo'
                className={styles.heading}
                data-reveal
                data-reveal-style='fade'
              >
                SEO for Limo Companies
              </h2>
              <p className={styles.copy} data-reveal>
                Five things move your rankings, and none of them is a trick.
              </p>
            </div>

            <nav
              className={styles.nav}
              aria-label='Ranking factors'
              data-reveal
            >
              <ul className={styles.navList}>
                {factors.map((x) => (
                  <li key={x.id}>
                    <a
                      href={`#seo-${x.id}`}
                      className={`${styles.navLink} ${
                        x.id === active ? styles.navLinkActive : ""
                      }`}
                      aria-current={x.id === active ? "true" : undefined}
                    >
                      {x.title}
                      <Arrow className={styles.navArrow} aria-hidden='true' />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div data-reveal>
              <Button
                href='/journal/seo-for-limo-companies'
                btnType='black'
                text='Read the SEO guide for limo companies'
                arrow
              />
            </div>
          </div>

          <div ref={listRef} className={styles.cards}>
            {factors.map((x, index) => (
              <article
                className={styles.row}
                key={x.id}
                id={`seo-${x.id}`}
                data-id={x.id}
                data-reveal
              >
                <div className={styles.card}>
                  <div className={styles.cardTop}>
                    <span className={styles.number} aria-hidden='true'>
                      0{index + 1}
                    </span>
                    <h3 className={styles.title}>{x.title}</h3>
                    <p className={styles.desc}>{x.desc}</p>
                  </div>
                </div>
                <SlideInImage
                  src={x.src}
                  className={styles.imgContainer}
                  sizes='(max-width: 768px) 100vw, (max-width: 1268px) 50vw, 32vw'
                />
              </article>
            ))}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
