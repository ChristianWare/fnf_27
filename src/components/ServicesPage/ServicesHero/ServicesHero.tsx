import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./ServicesHero.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import WebsiteImg from "../../../../public/images/website.jpg";
import PaymentsImg from "../../../../public/images/takePayments.jpg";
import LeadsImg from "../../../../public/images/leads.jpg";
import BookingImg from "../../../../public/images/subSnow.png";

// Four facts about the services, each on a photo. Placeholder photos for
// now; swap in your own when you have them.
const cards = [
  {
    id: 1,
    label: "Ways we help: websites, booking software and leads",
    value: "3",
    src: WebsiteImg,
    alt: "An operator in a suit holding a coffee outside an office",
  },
  {
    id: 2,
    label: "Per-booking fees, on any plan",
    value: "$0",
    src: PaymentsImg,
    alt: "A stack of payment cards",
  },
  {
    id: 3,
    label: "Days of free leads in your city, no card",
    value: "30",
    src: LeadsImg,
    alt: "An operator at his desk with a tablet",
  },
  {
    id: 4,
    label: "Online booking for your riders",
    value: "24/7",
    src: BookingImg,
    alt: "A black Chevrolet Suburban at dusk",
  },
];

export default function ServicesHero() {
  return (
    <section className={styles.container}>
      <Reveal onLoad step={150} />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.topLeft}>
              <EyeBrow text='Services' />
              <h1
                className={`${styles.heading} display1`}
                data-reveal
                data-reveal-style='fade'
              >
                Services for black car &amp; limo operators
              </h1>
              <p className={styles.copy} data-reveal>
                Three ways we help: a website that gets you found, booking
                software that takes bookings without per-booking fees, and a
                leads tool that finds accounts in your market.
              </p>
            </div>
            <div className={styles.btnContainer} data-reveal>
              <Button
                href='/leads'
                btnType='black'
                text='Get free leads in your city'
                arrow
              />
              <Button href='/pricing' btnType='gray' text='See full pricing' />
            </div>
          </div>

          <ul className={styles.cards}>
            {cards.map((card) => (
              <li className={styles.card} key={card.id} data-reveal>
                <Image
                  src={card.src}
                  alt={card.alt}
                  fill
                  sizes='(max-width: 968px) 50vw, 25vw'
                  loading='eager'
                  className={styles.img}
                />
                <span className={styles.label}>{card.label}</span>
                <span className={styles.value}>{card.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </LayoutWrapper>
    </section>
  );
}
