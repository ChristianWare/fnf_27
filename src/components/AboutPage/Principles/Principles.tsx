import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Principles.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import BgImg from "../../../../public/images/newHero.png";

// The four principles, each with the commitments that come with it.
const principles = [
  {
    id: 1,
    title: "You talk to the maker",
    tag: "Direct",
    items: [
      { text: "No account managers, no handoffs", note: "Always" },
      {
        text: "The person on your calls builds your site",
        note: "Every project",
      },
      { text: "Support goes to me, not a ticket queue", note: "After launch" },
    ],
  },
  {
    id: 2,
    title: "Prices on paper first",
    tag: "Flat",
    items: [
      {
        text: "Flat monthly plans, published on the site",
        note: "$199 · $499",
      },
      { text: "Setup quoted before any work starts", note: "$500" },
      { text: "No per-booking fees on any plan", note: "$0" },
    ],
  },
  {
    id: 3,
    title: "We say no early",
    tag: "Honest",
    items: [
      { text: "An honest read before any pitch", note: "First call" },
      { text: "The cheaper plan, when it fits better", note: "Every time" },
      { text: "No plan at all, if nothing fits", note: "We'll say so" },
    ],
  },
  {
    id: 4,
    title: "You own your customers",
    tag: "Yours",
    items: [
      { text: "Your domain and phone number stay yours", note: "Always" },
      {
        text: "Your customer list and booking history",
        note: "Export anytime",
      },
      { text: "Month-to-month plans, cancel anytime", note: "No contract" },
    ],
  },
];

export default function Principles() {
  return (
    <section className={styles.container}>
      <Reveal />

      {/* The background stays put while the page scrolls over it. */}
      <div className={styles.bg} aria-hidden='true'>
        <Image src={BgImg} alt='' fill sizes='100vw' className={styles.bgImg} />
      </div>

      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <EyeBrow text='Our principles' color='white' />
            <h2 className={styles.heading} data-reveal data-reveal-style='fade'>
              What guides us.
            </h2>
          </div>

          <ol className={styles.list}>
            {principles.map((principle) => (
              <li className={styles.group} key={principle.id} data-reveal>
                <div className={styles.groupHead}>
                  <h3 className={styles.groupTitle}>
                    {principle.title}
                    <span className={styles.tag}>{principle.tag}</span>
                  </h3>
                  <span className={styles.number} aria-hidden='true'>
                    0{principle.id}
                  </span>
                </div>
                <ul className={styles.items}>
                  {principle.items.map((item) => (
                    <li className={styles.item} key={item.text}>
                      <span className={styles.itemText}>{item.text}</span>
                      <span className={styles.note}>{item.note}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      </LayoutWrapper>
    </section>
  );
}
