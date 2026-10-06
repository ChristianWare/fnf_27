import Link from "next/link";
import LayoutWrapper from "../LayoutWrapper";
import styles from "./Footer.module.css";
import Logo from "../Logo/Logo";
import NewsletterForm from "./NewsletterForm";
import LinkedIn from "../icons/LinkedIn/LinkedIn";
import Instagram from "../icons/Instagram/Instagram";
import Facebook from "../icons/Facebook/Facebook";
import Reveal from "@/components/shared/Reveal/Reveal";

// Contact details. Keep them exactly as they appear on the Fonts & Footers
// Google Business Profile. Leave PHONE empty to hide it.
const EMAIL = "hello@fontsandfooters.com";
const PHONE: string = "";
const LOCATION = "Phoenix, Arizona";

// Confirm these point at your real profiles.
const socials = [
  {
    id: 1,
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/fontsandfooters",
    Icon: LinkedIn,
  },
  {
    id: 2,
    label: "Instagram",
    href: "https://www.instagram.com/fontsandfooters",
    Icon: Instagram,
  },
  {
    id: 3,
    label: "Facebook",
    href: "https://www.facebook.com/fontsandfooters",
    Icon: Facebook,
  },
];

const columns = [
  {
    id: 1,
    groups: [
      {
        title: "Services",
        links: [
          { text: "Websites", href: "/services/websites" },
          { text: "Booking software", href: "/services/booking-software" },
          { text: "Leads", href: "/services/leads" },
          { text: "Pricing", href: "/pricing" },
        ],
      },
      {
        title: "Free tools",
        links: [
          { text: "Free leads tool", href: "/leads" },
          { text: "Website audit", href: "/audit" },
          { text: "Free templates", href: "/resources" },
        ],
      },
    ],
  },
  {
    id: 2,
    groups: [
      {
        title: "Journal",
        links: [
          {
            text: "Software & booking",
            href: "/journal?category=software-booking",
          },
          { text: "Getting found", href: "/journal?category=getting-found" },
          {
            text: "Winning accounts",
            href: "/journal?category=winning-accounts",
          },
          {
            text: "Starting a black car business",
            href: "/journal?category=starting-a-black-car-business",
          },
          {
            text: "Build in public",
            href: "/journal?category=build-in-public",
          },
        ],
      },
    ],
  },
  {
    id: 3,
    groups: [
      {
        title: "Company",
        links: [
          { text: "Projects", href: "/projects" },
          { text: "About", href: "/about" },
          { text: "Contact", href: "/contact" },
          { text: "Client login", href: "/login" },
        ],
      },
    ],
  },
];

export default function Footer() {
  return (
    <footer className={styles.container}>
      <Reveal mode='together' />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top} data-reveal>
            <div className={styles.left}>
              <div className={styles.brand}>
                <Logo noText blur='blur' />
                <span className={styles.brandName}>Fonts &amp; Footers</span>
              </div>

              <div className={styles.newsletter}>
                <span className={styles.label}>One email a month</span>
                <NewsletterForm />
                <p className={styles.small}>
                  The best post of the month and one tip you can use that week.
                  By subscribing you agree to our{" "}
                  <Link href='/privacy' className={styles.inlineLink}>
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>

              <ul className={styles.socials}>
                {socials.map(({ id, label, href, Icon }) => (
                  <li key={id}>
                    <a
                      href={href}
                      target='_blank'
                      rel='noopener noreferrer'
                      aria-label={label}
                      className={styles.social}
                    >
                      <Icon className={styles.socialIcon} aria-hidden='true' />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <nav className={styles.right} aria-label='Footer'>
              {columns.map((column) => (
                <div className={styles.column} key={column.id}>
                  {column.groups.map((group) => (
                    <div className={styles.group} key={group.title}>
                      <span className={styles.label}>{group.title}</span>
                      <ul className={styles.links}>
                        {group.links.map((link) => (
                          <li key={link.text}>
                            <Link href={link.href} className={styles.link}>
                              {link.text}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}

              <div className={styles.column}>
                <div className={styles.group}>
                  <span className={styles.label}>Get in touch</span>
                  <ul className={styles.links}>
                    <li>
                      <a href={`mailto:${EMAIL}`} className={styles.link}>
                        {EMAIL}
                      </a>
                    </li>
                    {PHONE && (
                      <li>
                        <a
                          href={`tel:${PHONE.replace(/[^\d+]/g, "")}`}
                          className={styles.link}
                        >
                          {PHONE}
                        </a>
                      </li>
                    )}
                  </ul>
                </div>
                <div className={styles.group}>
                  <span className={styles.label}>Based in</span>
                  <span className={styles.link}>{LOCATION}</span>
                </div>
              </div>
            </nav>
          </div>

          <div className={styles.about} data-reveal>
            <p>
              Websites, booking software and leads, built only for black car and
              limo operators. Get found on Google, take bookings directly with
              no per-booking fees, and fill the slow months with corporate
              accounts, hotels and events in your market.
            </p>
            <p>
              Fonts &amp; Footers is built in Phoenix alongside a working
              operator, and works with operators across the US.
            </p>
          </div>

          <div className={styles.bottom} data-reveal>
            <span>
              © {new Date().getFullYear()}{" "}
              <span className={styles.white}> Fonts &amp; Footers</span>
            </span>
            <span className={styles.bottomRight}>
              <Link href='/privacy' className={styles.white}>
                Privacy
              </Link>
              <span aria-hidden='true'>·</span>
              <Link href='/terms' className={styles.white}>
                Terms
              </Link>
              <span aria-hidden='true'>|</span>
              <span>
                Designed &amp; developed by{" "}
                <span className={styles.white}>Fonts &amp; Footers</span>
              </span>
            </span>
          </div>
        </div>
      </LayoutWrapper>
    </footer>
  );
}
