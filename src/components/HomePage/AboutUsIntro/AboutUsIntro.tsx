import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./AboutUsIntro.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Arrow from "@/components/shared/icons/Arrow/Arrow";

const data = [
  {
    id: 1,
    title: "What I do",
    desc: "websites that get you found, booking software with no per-booking fees, and leads in your market.",
    icon: <Arrow className={styles.icon} />,
  },
  {
    id: 2,
    title: "Who I work with",
    desc: "black car and limo operators across the US.",
    icon: <Arrow className={styles.icon} />,
  },
  {
    id: 3,
    title: "How I work",
    desc: " audit first, an honest read, and no pitch if it's not a fit.",
    icon: <Arrow className={styles.icon} />,
  },
  {
    id: 4,
    title: "Where to start",
    desc: "free leads in your city for 30 days, no card.",
    icon: <Arrow className={styles.icon} />,
  },
];

export default function AboutUsIntro() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.topLeft}>
              <EyeBrow text='About Us' />
              <h2 className={styles.heading}>
                Built by One Developer <br /> for One Industry.
              </h2>
              <p className={styles.copy}>
                I'm Chris Ware, the developer behind it. I built the platform
                and refined it on real bookings, real drivers and real corporate
                clients until it ran his whole business. When you work with
                Fonts & Footers, you work with me: the person who built it, not
                a ticket system.
              </p>
            </div>
            <div className={styles.topRight}>
              <Button btnType='black' text='More about us' arrow />
            </div>
          </div>
          <div className={styles.bottom}>
            <div className={styles.mapDataContainer}>
              {data.map((x) => (
                <div className={styles.card} key={x.id}>
                  <div className={styles.cardLeft}>
                    <div className={styles.iconContainer}>{x.icon}</div>
                  </div>
                  <div className={styles.cardRight}>
                    <h3 className={`${styles.title} subHeading`}>{x.title}</h3>
                    <p className={styles.desc}>{x.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
