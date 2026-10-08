import type { ComponentType, SVGProps } from "react";
import styles from "./PageMap.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import Plane from "@/components/shared/icons/Plane/Plane";
import ScatteredIcon from "@/components/shared/icons/ScatteredIcon/ScatteredIcon";
import Location from "@/components/shared/icons/Location/Location";
import Business from "@/components/shared/icons/Business/Business";
import Speedometer from "@/components/shared/icons/Speedometer/Speedometer";
import MouseIcon from "@/components/shared/icons/MouseIcon/MouseIcon";

type PageType = {
  id: number;
  name: string;
  desc: string;
  /** How many of these Nier Transportation's site has. */
  nier: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const pageTypes: PageType[] = [
  {
    id: 1,
    name: "Airport pages",
    desc: "One per airport you serve, with pickup details by terminal",
    nier: "3",
    Icon: Plane,
  },
  {
    id: 2,
    name: "Route pages",
    desc: "Your most-booked runs, like “[city] to [airport] car service”",
    nier: "10",
    Icon: ScatteredIcon,
  },
  {
    id: 3,
    name: "City pages",
    desc: "One for each city you serve, written about that city",
    nier: "40",
    Icon: Location,
  },
  {
    id: 4,
    name: "Service pages",
    desc: "Corporate, weddings, hourly chauffeur and events",
    nier: "13",
    Icon: Business,
  },
  {
    id: 5,
    name: "Fleet pages",
    desc: "One per vehicle, with capacity, luggage and real photos",
    nier: "9",
    Icon: Speedometer,
  },
];

// Nier's pages, added up: 3 + 10 + 40 + 13 + 9.
const NIER_TOTAL = 75;

export default function PageMap() {
  return (
    <section className={styles.container} aria-labelledby='page-map'>
      <Reveal />
      <div className={styles.content}>
        <div className={styles.eyebrow}>
          <EyeBrow text='The page map' />
        </div>

        <h2
          id='page-map'
          className={styles.heading}
          data-reveal
          data-reveal-style='fade'
        >
          Every site ships with the pages riders search for
        </h2>

        <div className={styles.stat} data-reveal>
          <span className={styles.statNumber}>{NIER_TOTAL}</span>
          <span className={styles.statLabel}>
            Pages on Nier
            <br />
            Transportation&apos;s site
          </span>
        </div>

        <div className={styles.intro}>
          <p className={styles.copy} data-reveal>
            Riders don&apos;t search &ldquo;limo service.&rdquo; They search for
            the exact ride they need: &ldquo;Scottsdale to Sky Harbor car
            service,&rdquo; &ldquo;corporate black car Phoenix,&rdquo;
            &ldquo;wedding limo near me.&rdquo; Each of those searches needs its
            own page. Your site ships with all of them, linked together so
            Google reads you as the authority in your market.
          </p>
          <div data-reveal>
            <Button
              href='https://niertransportation.com'
              target='_blank'
              btnType='black'
              text="See Nier's site"
              arrow
            />
          </div>
        </div>

        {/* The page types as a site map: each one hangs off the homepage
            and links to the others, with booking on every page. */}
        <div className={styles.mapWrap}>
          <div className={styles.map}>
            <div className={styles.root} data-reveal>
              <span className={styles.rootDot} aria-hidden='true' />
              Your homepage
              <span className={styles.rootNote}>Links to every page type</span>
            </div>

            <ul className={styles.list}>
              {pageTypes.map(({ Icon, ...page }) => (
                <li className={styles.row} key={page.id} data-reveal>
                  <span className={styles.joint} aria-hidden='true' />
                  <span className={styles.iconTile} aria-hidden='true'>
                    <Icon className={styles.icon} />
                  </span>
                  <span className={styles.rowText}>
                    <span className={`${styles.rowName} h6`}>{page.name}</span>
                    <span className={styles.rowDesc}>{page.desc}</span>
                  </span>
                  <span className={styles.count}>
                    <span className={styles.countNumber}>{page.nier}</span>
                    <span className={styles.countLabel}>
                      On Nier&apos;s site
                    </span>
                  </span>
                </li>
              ))}

              {/* Booking isn't a page type: it's on all of them. */}
              <li className={`${styles.row} ${styles.rowBooking}`} data-reveal>
                <span className={styles.joint} aria-hidden='true' />
                <span className={styles.iconTile} aria-hidden='true'>
                  <MouseIcon className={styles.icon} />
                </span>
                <span className={styles.rowText}>
                  <span className={styles.rowName}>Booking</span>
                  <span className={styles.rowDesc}>
                    A booking button near the top of every page
                  </span>
                </span>
                <span className={styles.count}>
                  <span className={styles.countNumber}>All</span>
                  <span className={styles.countLabel}>Every page</span>
                </span>
              </li>
            </ul>
          </div>

          <p className={styles.note} data-reveal>
            Nier Transportation&apos;s site has 40 city pages, 3 airport pages,
            10 route pages, 13 service pages and 9 vehicle pages.
          </p>
        </div>
      </div>
    </section>
  );
}
