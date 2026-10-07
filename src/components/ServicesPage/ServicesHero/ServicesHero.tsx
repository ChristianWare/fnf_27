import Image from "next/image";
import Link from "next/link";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./ServicesHero.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import AuditImg from "../../../../public/images/audit.jpg";
import LeadsImg from "../../../../public/images/leads.jpg";
import WebsiteImg from "../../../../public/images/website.jpg";
import PlatformImg from "../../../../public/images/fullPlatformii.jpg";

// The four services, each on a photo. The whole card links to its page.
// Placeholder photos for now; swap in your own when you have them.
const services = [
  {
    id: 1,
    name: "Website Audit",
    desc: "See what riders and hotels find when they Google you.",
    value: "Free",
    note: "Results in 60 seconds",
    href: "/audit",
    src: AuditImg,
    alt: "An operator in a suit checking his phone",
  },
  {
    id: 2,
    name: "Leads Tool",
    desc: "Hotels, venues, corporate accounts and events in your market.",
    value: "30 days",
    note: "Free, no card",
    href: "/leads",
    src: LeadsImg,
    alt: "An operator at his desk with a tablet",
  },
  {
    id: 3,
    name: "Website Only",
    desc: "A custom site built for the searches your riders make.",
    value: "$199",
    note: "Per month + $500 setup",
    href: "/services/websites",
    src: WebsiteImg,
    alt: "An operator in a suit holding a coffee outside an office",
  },
  {
    id: 4,
    name: "Full Platform",
    desc: "Your website and booking software in one, with no per-booking fees.",
    value: "$499",
    note: "Website + booking platform + leads tool",
    href: "/services/booking-software",
    src: PlatformImg,
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
                className={styles.heading}
                data-reveal
                data-reveal-style='fade'
              >
                Services for Black Car <br className={styles.br} /> &amp; Limo
                Operators
              </h1>
              <p className={styles.copy} data-reveal>
                Four ways we help: a free audit that shows where you stand, a
                leads tool that finds accounts in your market, a website that
                gets you found, and the Full Platform that takes bookings
                without per-booking fees.
              </p>
            </div>
            <div className={styles.btnContainer} data-reveal>
              <Button
                href='/pricing'
                btnType='black'
                text='Get started now'
                arrow
              />
              {/* <Button href='/pricing' btnType='gray' text='See full pricing' /> */}
            </div>
          </div>

          <ul className={styles.cards}>
            {services.map((service) => (
              <li key={service.id} data-reveal>
                <Link href={service.href} className={styles.card}>
                  <Image
                    src={service.src}
                    alt={service.alt}
                    fill
                    sizes='(max-width: 568px) 100vw, (max-width: 968px) 50vw, 25vw'
                    loading='eager'
                    className={styles.img}
                  />
                  <span className={styles.cardTop}>
                    <span className={styles.name}>{service.desc}</span>
                  </span>
                  <span className={styles.cardBottom}>
                    <span className={`${styles.value} h3`}>{service.name}</span>
                    {/* <span className={styles.note}>{service.note}</span> */}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </LayoutWrapper>
    </section>
  );
}
