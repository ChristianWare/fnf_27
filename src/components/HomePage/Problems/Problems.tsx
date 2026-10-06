import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Problems.module.css";
import SlideInImage from "@/components/shared/SlideInImage/SlideInImage";
import Img1 from "../../../../public/images/freeLeads.jpg";
import Img2 from "../../../../public/images/fullPlatform.jpg";
import Img3 from "../../../../public/images/websiteOnly.jpg";
import Img4 from "../../../../public/images/freeAudit.jpg";

// Paste this over your existing `data` array.
// Img1 to Img4 are the image imports you already have in the component.

const data = [
  {
    id: 1,
    title: "Free Leads Tool",
    price: "30 days free, no card",
    bullets: [
      "Hotels, venues and corporate accounts",
      "Upcoming events in your market",
      "Decision-maker contacts",
      "Outreach scripts for each lead",
    ],
    btnText: "Get free leads in your city",
    href: "/leads",
    src: Img1,
  },
  {
    id: 2,
    title: "Full Platform",
    price: "$499/mo + $500 setup · Leads tool included",
    bullets: [
      "Website and booking software in one",
      "No per-booking fees",
      "Driver and admin portals",
      "Flight tracking and payments",
      "SEO foundation, leads tool included",
    ],
    btnText: "See the Full Platform",
    href: "/services/booking-software",
    src: Img2,
  },
  {
    id: 3,
    title: "Website Only",
    price: "$199/mo + $500 setup",
    bullets: [
      "Custom website",
      "SEO foundation built in",
      "Hosting and edits included",
      "Keep your booking software",
      "Upgrade anytime, no rebuild",
    ],
    btnText: "See website plans",
    href: "/services/websites",
    src: Img3,
  },
  {
    id: 4,
    title: "Free Website Audit",
    price: "$0 · 60 seconds",
    bullets: [
      "What riders see on Google",
      "Google visibility",
      "Speed on a phone",
      "Online booking check",
      "AI search readiness",
    ],
    btnText: "Run a free website audit",
    href: "/audit",
    src: Img4,
  },
];

export default function Problems() {
  return (
    <section className={styles.container}>
      <div className={styles.content}>
        <div className={styles.mapDataContainer}>
          {data.map((x, index) => (
            <div className={styles.card} key={x.id}>
              <LayoutWrapper
                paddingNSNone='paddingNSNone'
                pRightSmall='pRightSmall'
              >
                <div className={styles.cardContent}>
                  <div className={styles.left}>
                    <div className={styles.l1}>
                      <h2 className={`${styles.title} h4`}>00{index + 1}</h2>
                    </div>
                    <div className={styles.l2}>
                      <h2 className={`${styles.title} h4`}>{x.title}</h2>
                      <ul className={styles.bullets}>
                        {x.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className={styles.right}>
                    <SlideInImage src={x.src} className={styles.imgContainer} />
                  </div>
                </div>
              </LayoutWrapper>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
