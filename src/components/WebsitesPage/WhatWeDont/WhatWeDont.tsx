// What we don't do, said plainly, so nobody books a call for something we
// won't deliver. Ends with the one promise we do make: month to month.

import LayoutWrapper from "@/components/shared/LayoutWrapper";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import styles from "./WhatWeDont.module.css";

const items = [
  {
    title: "Paid ads",
    text: "We build the site and the SEO foundation. We don't run Google or Facebook ad campaigns.",
  },
  {
    title: "Native apps",
    text: "Riders book on your site from any phone. There's no App Store app to download or maintain.",
  },
  {
    title: "Permits and licensing",
    text: "We don't handle operating authority, permits, insurance or airport licensing.",
  },
  {
    title: "Ranking promises",
    text: "Nobody can honestly promise a position on Google. We build what Google rewards, and you can watch the results in your own Search Console.",
  },
];

export default function WhatWeDont() {
  return (
    <section className={styles.container} aria-labelledby='what-we-dont'>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <EyeBrow text='Straight answers' />
            <h2
              id='what-we-dont'
              className={`${styles.heading} h3`}
              data-reveal
              data-reveal-style='fade'
            >
              What we don&apos;t do
            </h2>
            <p className={styles.copy} data-reveal>
              Better you hear it now than on a call.
            </p>
          </div>
          <ul className={styles.grid}>
            {items.map((item) => (
              <li className={styles.card} key={item.title} data-reveal='each'>
                <h3 className={styles.title}>{item.title}</h3>
                <p className={styles.text}>{item.text}</p>
              </li>
            ))}
          </ul>
          <p className={styles.promise} data-reveal>
            What we do promise: month to month, cancel anytime. Your domain and
            your content stay yours.
          </p>
        </div>
      </LayoutWrapper>
    </section>
  );
}
