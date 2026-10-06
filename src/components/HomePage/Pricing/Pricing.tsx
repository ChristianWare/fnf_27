import Image from "next/image";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./Pricing.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import LeadsIcon from "@/components/shared/icons/LeadsIcon/LeadsIcon";
import Platform from "@/components/shared/icons/Platform/Platform";
import Design from "@/components/shared/icons/Design/Design";
import Chris from "../../../../public/images/chris.png";

const plans = [
  {
    id: 1,
    name: "Free Leads Tool",
    desc: "Hotels, venues, corporate accounts and events in your market, each with a contact and an outreach script.",
    price: "$0",
    per: "For 30 days",
    setup: "No card. Then $125/mo, or included with the Full Platform.",
    btnText: "Get free leads in your city",
    href: "/leads",
    Icon: LeadsIcon,
    featured: false,
    tab: "",
    features: [
      "Hot, warm and cold leads",
      "Decision-maker contacts",
      "Outreach scripts",
      "Daily email digest",
      "No per-lead fees",
    ],
  },
  {
    id: 2,
    name: "Full Platform",
    desc: "Your website and your booking and dispatch software in one system, with the leads tool included.",
    price: "$499",
    per: "Monthly",
    setup: "Plus a one-time $500 setup.",
    btnText: "See the Full Platform",
    href: "/services/booking-software",
    Icon: Platform,
    featured: true,
    tab: "",
    features: [
      "Custom website",
      "Direct booking & dispatch",
      "Driver & admin portals",
      "Flight tracking",
      "Payments",
      "Leads tool included",
      "No per-booking fees",
    ],
  },
  {
    id: 3,
    name: "Website Only",
    desc: "A custom website with an SEO foundation, hosting and edits. It works with the booking software you already use.",
    price: "$199",
    per: "Monthly",
    setup: "Plus a one-time $500 setup.",
    btnText: "See website plans",
    href: "/services/websites",
    Icon: Design,
    featured: false,
    tab: "Keep your booking software",
    features: [
      "Custom website",
      "SEO foundation",
      "Hosting & edits",
      "Works with your software",
      "Upgrade anytime, no rebuild",
    ],
  },
];

export default function Pricing() {
  return (
    <section className={styles.container}>
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <EyeBrow text='Pricing' />
            <h2 className={styles.heading}>Flat prices, published.</h2>
          </div>

          <div className={styles.plans}>
            {plans.map(({ Icon, ...plan }) => (
              <div className={styles.planWrap} key={plan.id}>
                {plan.tab && <div className={styles.tab}>{plan.tab}</div>}
                <article
                  className={`${styles.plan} ${plan.featured ? styles.featured : ""}`}
                >
                  <div className={styles.planBody}>
                    <div className={styles.iconTile}>
                      <Icon className={styles.icon} aria-hidden='true' />
                    </div>
                    <h3 className={`${styles.planName} subHeading`}>
                      {plan.name}
                    </h3>
                    <p className={styles.planDesc}>{plan.desc}</p>
                    <div className={styles.priceRow}>
                      <span className={styles.price}>{plan.price}</span>
                      <span className={styles.per}>{plan.per}</span>
                    </div>
                    <p className={styles.setup}>{plan.setup}</p>
                    <div className={styles.btnContainer}>
                      <Button
                        href={plan.href}
                        btnType={plan.featured ? "white" : "black"}
                        text={plan.btnText}
                      />
                    </div>
                  </div>
                  <ul className={styles.features}>
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </article>
              </div>
            ))}
          </div>

          <div className={styles.help}>
            <div className={styles.helpLeft}>
              <div className={styles.avatar}>
                <Image
                  src={Chris}
                  alt='Chris Ware, founder of Fonts & Footers'
                  fill
                  sizes='48px'
                  className={styles.avatarImg}
                />
              </div>
              <div className={styles.helpText}>
                <span className={styles.helpTitle}>
                  Not sure which plan fits?
                </span>
                <span className={styles.helpSub}>
                  No plan charges per-booking fees. Compare them side by side.
                </span>
              </div>
            </div>
            <Button
              href='/pricing'
              btnType='white'
              text='See full pricing'
              arrow
            />
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
