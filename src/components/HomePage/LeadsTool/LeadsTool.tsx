import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./LeadsTool.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";

const leads = [
  {
    id: 1,
    title: "Accounts that book rides",
    label: "Nine kinds, near your base",
    desc: "Hotels, wedding and event venues, corporate offices, law firms, funeral homes, golf and country clubs, casinos, senior living and tour companies. The accounts that book again and again.",
  },
  {
    id: 2,
    title: "Events coming up",
    label: "Galas to game days",
    desc: "Conferences, galas, festivals, concerts, graduations and tournaments in your market, from Ticketmaster, Eventbrite and the calendars of convention centers and universities, with the organizer to call.",
  },
  {
    id: 3,
    title: "Scored and ready",
    label: "Out of 100, best first",
    desc: "Every lead is scored on how likely it is to book, with the decision-maker to reach, an email, a text and a call opener written for that business, and a reminder when a follow-up is due.",
  },
];

export default function LeadsTool() {
  return (
    <section className={styles.container}>
      <Reveal />
      {/* The background stays put while the page scrolls over it. */}
      <div className={styles.bg} aria-hidden='true'>
        <Image
          src='/images/subSnow.png'
          alt=''
          fill
          sizes='100vw'
          className={styles.bgImg}
        />
      </div>

      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.topLeft}>
              <EyeBrow text='Leads tool' color='white' />
              <h2 className={styles.heading}>
                Find your next client before your competition does
              </h2>
              <p className={styles.copy}>
                New accounts and events near your base every morning, scored out
                of 100 so the best ones come first. Each one comes with the
                person to contact and a script written for that business.
              </p>
            </div>
            <div className={styles.topRight}>
              <Button
                href='/leads'
                btnType='white'
                text='Get free leads in your city'
                arrow
              />
            </div>
          </div>

          <div className={styles.bottom}>
            <ol className={styles.steps}>
              {leads.map((lead) => (
                <li className={styles.card} key={lead.id} data-reveal='each'>
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
