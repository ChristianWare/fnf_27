import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./TemplateVsCustom.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import BgImg from "../../../../public/images/irr.webp";

const rows = ["Pages", "Design", "Photos", "Booking"] as const;

// The two options side by side, the same four rows in each.
const options = [
  {
    id: 1,
    title: "Template",
    tag: "Online fast",
    values: {
      Pages: "A homepage and a few generic pages",
      Design: "Shared with other operators",
      Photos: "Stock",
      Booking: "A contact form or someone else's widget",
    },
    custom: false,
  },
  {
    id: 2,
    title: "Custom site",
    tag: "Built for your market",
    values: {
      Pages: "A page for every airport, route, city and service",
      Design: "Built for your company",
      Photos: "Your real fleet",
      Booking: "Your own booking system (Full Platform)",
    },
    custom: true,
  },
];

export default function TemplateVsCustom() {
  return (
    <section className={styles.container} aria-labelledby='template-vs-custom'>
      <Reveal />

      {/* The same background as Principles on the About page. It stays put
          while the page scrolls over it. */}
      <div className={styles.bg} aria-hidden='true'>
        <Image src={BgImg} alt='' fill sizes='100vw' className={styles.bgImg} />
      </div>

      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <EyeBrow text='Templates vs custom' color='white' />
            <h2
              id='template-vs-custom'
              className={styles.heading}
              data-reveal
              data-reveal-style='fade'
            >
              Limo Website Templates vs a Custom Site
            </h2>
            <p className={styles.copy} data-reveal>
              A template gets you online fast, and for a brand-new operator that
              can be enough. But a template is built to look fine for every
              company, so it ranks for none: one homepage trying to cover every
              search, and the same layout as hundreds of other limo sites.
            </p>
          </div>

          <div className={styles.cards}>
            {options.map((option) => (
              <article
                className={`${styles.card} ${option.custom ? styles.cardCustom : ""}`}
                key={option.id}
                data-reveal
              >
                <div className={styles.cardTop}>
                  <span className={styles.number} aria-hidden='true'>
                    0{option.id}
                  </span>
                  <h3 className={`${styles.title} h4`}>{option.title}</h3>
                  <span className={styles.tag}>{option.tag}</span>
                </div>

                <dl className={styles.rows}>
                  {rows.map((row) => (
                    <div className={styles.row} key={row}>
                      <dt className={styles.rowLabel}>{row}</dt>
                      <dd className={styles.rowValue}>{option.values[row]}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
