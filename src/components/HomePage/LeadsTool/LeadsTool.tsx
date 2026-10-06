import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./LeadsTool.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";

const leads = [
  {
    id: 1,
    title: "Hot leads",
    label: "Next 2 weeks",
    desc: "Events in your market happening in the next two weeks. Call them today, win the transportation.",
  },
  {
    id: 2,
    title: "Warm leads",
    label: "2 weeks to 3 months",
    desc: "Events two weeks to three months out. Time to build the relationship before they need the ride.",
  },
  {
    id: 3,
    title: "Cold leads",
    label: "Nine categories",
    desc: "B2B accounts across nine categories: wedding venues, hotels, casinos, and the prospects that fill calendars for years.",
  },
];

export default function LeadsTool() {
  return (
    <section className={styles.container}>
      {/* The background stays put while the page scrolls over it. */}
      <div className={styles.bg} aria-hidden="true">
        <Image
          src="/images/subSnow.png"
          alt=""
          fill
          sizes="100vw"
          className={styles.bgImg}
        />
      </div>

      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.topLeft}>
              <EyeBrow text="Leads tool" color="white" />
              <h2 className={styles.heading}>
                Find your next client before your competition does
              </h2>
              <p className={styles.copy}>
                Three lead temperatures, delivered to your inbox every morning.
                Every lead is scored, briefed, and paired with a ready-to-send
                outreach script.
              </p>
            </div>
            <div className={styles.topRight}>
              <Button
                href="/leads"
                btnType="white"
                text="Get free leads in your city"
                arrow
              />
            </div>
          </div>

          <div className={styles.bottom}>
            <ol className={styles.steps}>
              {leads.map((lead) => (
                <li className={styles.card} key={lead.id}>
                  <div className={styles.cardLeft}>
                    <span className={styles.number}>0{lead.id}</span>
                    <h3 className={`${styles.title} h5`}>{lead.title}</h3>
                  </div>
                  <div className={styles.cardRight}>
                    <span className={styles.cardLabel}>{lead.label}</span>
                    <p className={styles.desc}>{lead.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className={styles.note}>
              Free for 30 days, no card. Then $125/mo flat, or included with the
              Full Platform. No per-lead fees. Cancel anytime.
            </p>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
