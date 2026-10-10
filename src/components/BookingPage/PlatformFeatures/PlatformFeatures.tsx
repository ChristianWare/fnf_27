"use client";

// Every feature of the Full Platform, in the same table as the pricing
// page's comparison: one row per feature, one column per person who uses
// it (riders, drivers, corporate accounts, and you), grouped by part.
// On a phone it's one column at a time, showing only what that person gets.

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./PlatformFeatures.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";

// Each column has its own color: the accent on its head and a lighter
// version on the cells under it. Your column stays black, the same as the
// Full Platform on the pricing page.
const columns = [
  { id: "riders", name: "Riders", featured: false, tone: styles.toneOne },
  { id: "drivers", name: "Drivers", featured: false, tone: styles.toneTwo },
  {
    id: "corporate",
    name: "Corporate accounts",
    featured: false,
    tone: styles.toneThree,
  },
  { id: "admin", name: "You", featured: true, tone: styles.toneFeatured },
];

// The tabs open on your column, the one the table highlights.
const DEFAULT_COLUMN = columns.findIndex((column) => column.featured);

// true = has it, false = not theirs, text = shown as written.
type Value = boolean | string;

type Group = {
  id: string;
  name: string;
  rows: { label: string; values: [Value, Value, Value, Value] }[];
};

// One value per column, in the same order as the columns above.
const groups: Group[] = [
  {
    id: "booking",
    name: "Booking",
    rows: [
      {
        label: "Book online, any hour, on your own site",
        values: [true, false, true, "By hand too, for phone bookings"],
      },
      {
        label: "A live estimate from the route, traffic and vehicle",
        values: [true, false, true, "You set the rates"],
      },
      {
        label: "Point-to-point, hourly and flat-rate services",
        values: [true, false, true, true],
      },
      {
        label: "Airport pickups and drop-offs, with the flight number",
        values: [true, "Flight status on the trip", true, true],
      },
      {
        label: "Extra stops, passenger count and luggage",
        values: [true, "On every trip sheet", true, true],
      },
      {
        label: "Vehicle choice that fits the group, with photos and capacity",
        values: [true, false, true, "Your categories and units"],
      },
      {
        label: "Multi-ride trips: up to ten rides, one bill",
        values: [true, false, true, true],
      },
      {
        label: "Special requests: child seats, meet and greet, more",
        values: [true, "Flagged on the trip", true, true],
      },
      {
        label: "Discount codes and share links",
        values: [
          "Use them",
          false,
          "A negotiated rate instead",
          "Make them, with limits",
        ],
      },
      {
        label: "Request, review, then a payment link",
        values: [
          "Request, then pay by link",
          false,
          "Confirmed straight away",
          "Approve and set the price",
        ],
      },
      {
        label: "Booking as a guest, no account needed",
        values: [true, false, false, false],
      },
      {
        label: "An estimate PDF by email, and a page to track the request",
        values: [true, false, false, "Send an estimate any time"],
      },
      {
        label: "Blackout dates and 36 hours' notice",
        values: [
          "Applied as they book",
          false,
          "Applied as they book",
          "You set the dates",
        ],
      },
    ],
  },
  {
    id: "dispatch",
    name: "Dispatch and drivers",
    rows: [
      {
        label: "Assign a driver and a vehicle, with conflict warnings",
        values: [false, "Emailed the trip", false, true],
      },
      {
        label: "Trip status: en route, arrived, picked up, completed",
        values: [
          "A text at each step",
          "One tap each",
          "A text at each step",
          "Updated live",
        ],
      },
      {
        label: "The driver's schedule and calendar on their phone",
        values: [false, true, false, "Every driver's calendar"],
      },
      {
        label: "Navigation to the pickup and the drop-off",
        values: [false, "Google Maps, Waze or Apple Maps", false, false],
      },
      {
        label: "The customer's name, phone and requests on the trip",
        values: [false, "Call or text from the trip", false, true],
      },
      {
        label: "A meet-and-greet sign on the phone",
        values: [false, true, false, false],
      },
      {
        label: "No-shows, with a wait timer and a reason",
        values: [false, true, false, true],
      },
      {
        label: "Driver pay per ride, as a share of the fare",
        values: [
          false,
          "Earnings by day, month and year",
          false,
          "Rates, statements and CSVs",
        ],
      },
      {
        label: "Driver documents: license, permit and insurance expiry",
        values: [false, false, false, "Expiry dates on the list"],
      },
      {
        label: "Dispatch and emergency lines one tap away",
        values: [false, true, false, "From your company settings"],
      },
    ],
  },
  {
    id: "payments",
    name: "Payments",
    rows: [
      {
        label: "Card payments through your own Stripe account",
        values: [true, false, true, "Your money, your account"],
      },
      {
        label: "Pay by emailed link, no login needed",
        values: [true, false, true, "Send or resend any time"],
      },
      {
        label: "Deposits from 10% to 100%, with a balance due date",
        values: [true, false, false, true],
      },
      {
        label: "A card on file",
        values: [true, false, true, "Charge it, or save one for them"],
      },
      {
        label: "Tips at checkout, all of it to the driver",
        values: [true, "Shown with their pay", false, true],
      },
      {
        label: "Cash payments recorded by hand",
        values: [false, false, false, true],
      },
      {
        label: "Refunds, full or partial, in step with Stripe",
        values: ["See the status", false, false, true],
      },
      {
        label: "Receipts and invoices as PDFs, by email",
        values: [true, false, true, true],
      },
      {
        label: "One-off invoices with a pay link and a tip option",
        values: ["Pay online", false, false, "For anything outside a ride"],
      },
      {
        label: "Per-booking fees",
        values: ["None", "None", "None", "None"],
      },
    ],
  },
  {
    id: "corporate",
    name: "Corporate accounts",
    rows: [
      {
        label: "A portal for each company account",
        values: [false, false, true, "Approve, suspend or close"],
      },
      {
        label: "Book for employees, with cost centers and project codes",
        values: [false, false, true, true],
      },
      {
        label: "An employee roster, by department",
        values: [false, false, true, true],
      },
      {
        label: "A negotiated rate, applied to every ride",
        values: [false, false, true, "You set the percentage"],
      },
      {
        label: "Net 15, 30 or 45 terms, or due on receipt",
        values: [false, false, true, true],
      },
      {
        label: "Invoices by ride, or a card on file charged per ride",
        values: [false, false, true, true],
      },
      {
        label: "Spend by month, department and employee",
        values: [false, false, true, "Ride volume per account"],
      },
      {
        label: "An inquiry form on your site, into an account in one click",
        values: [false, false, "Apply online", true],
      },
    ],
  },
  {
    id: "riders",
    name: "Riders' accounts",
    rows: [
      {
        label: "Trip history with status, payment and date filters",
        values: [true, "Their trips", true, "Every booking, every filter"],
      },
      {
        label: "Driver, vehicle and plate on the trip, with call and text",
        values: [true, false, true, false],
      },
      {
        label: "Pay an open balance from the trip page",
        values: [true, false, false, false],
      },
      {
        label: "Frequent pickups, drop-offs and routes remembered",
        values: [true, false, false, false],
      },
      {
        label: "Reminders 24 hours and 2 hours before pickup",
        values: [true, false, true, false],
      },
      {
        label: "Payment reminders when a link sits unpaid",
        values: [true, false, false, "And a heads-up on rides that need you"],
      },
      {
        label: "In-app notifications for every status change",
        values: [true, false, false, "Email and push alerts"],
      },
      {
        label: "A support page with your lines and a trip picker",
        values: [true, true, false, false],
      },
      {
        label: "Sign in with email and password, or Google",
        values: [true, true, true, true],
      },
    ],
  },
  {
    id: "admin",
    name: "Your admin dashboard",
    rows: [
      {
        label: "Today's rides, alerts and what needs you",
        values: [false, false, false, "Unassigned, unpaid, stuck in review"],
      },
      {
        label: "Every booking: approve, price, assign, edit, duplicate",
        values: [false, false, false, true],
      },
      {
        label: "Trash with a 7-day restore, and a full activity log",
        values: [false, false, false, true],
      },
      {
        label: "A calendar with blackout dates and each driver's day",
        values: [false, false, false, true],
      },
      {
        label: "Services, rates and fees: per mile, per minute, per hour",
        values: [false, false, false, true],
      },
      {
        label: "Vehicle categories and units, with photos",
        values: [false, false, false, true],
      },
      {
        label: "The airports you serve",
        values: [false, false, false, true],
      },
      {
        label: "Earnings: captured, refunded, net and driver pay, as CSV",
        values: [false, false, false, true],
      },
      {
        label: "Reports: revenue, operations, driver pay, a tax-year package",
        values: [false, false, false, true],
      },
      {
        label: "Users and roles: rider, driver, admin, corporate",
        values: [false, false, false, true],
      },
      {
        label: "Discount codes with windows and limits",
        values: [false, false, false, true],
      },
      {
        label: "Company settings: name, hours, lines, social links",
        values: [false, false, false, true],
      },
      {
        label: "Website analytics",
        values: [false, false, false, true],
      },
      {
        label: "Install on a phone, with shortcuts to admin and driver",
        values: [false, true, false, true],
      },
    ],
  },
  {
    id: "website",
    name: "Your website",
    rows: [
      {
        label: "A page for every airport, route, city, service and vehicle",
        values: [
          "What riders find on Google",
          false,
          false,
          "Edits and new pages included",
        ],
      },
      {
        label: "Venue and partner pages with their own flat rates",
        values: [true, false, false, true],
      },
      {
        label: "A blog, FAQs and a contact form",
        values: [true, false, false, "Messages emailed to you"],
      },
      {
        label: "Hosting, security and search setup",
        values: [false, false, false, true],
      },
    ],
  },
];

const FEATURE_COUNT = groups.reduce((n, g) => n + g.rows.length, 0);

function Check() {
  return (
    <span className={styles.check}>
      <svg viewBox='0 0 24 24' fill='none' aria-hidden='true'>
        <path
          d='m5 12.5 4.5 4.5L19 7.5'
          stroke='currentColor'
          strokeWidth='2.4'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </svg>
    </span>
  );
}

function Cell({ value }: { value: Value }) {
  if (value === true) {
    return (
      <>
        <Check />
        <span className={styles.srOnly}>Yes</span>
      </>
    );
  }
  if (value === false) {
    return (
      <>
        <span className={styles.dash} aria-hidden='true' />
        <span className={styles.srOnly}>Not theirs</span>
      </>
    );
  }
  return <span className={styles.text}>{value}</span>;
}

export default function PlatformFeatures() {
  const [selected, setSelected] = useState(DEFAULT_COLUMN);
  const column = columns[selected];
  const sectionRef = useRef<HTMLElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Left and right arrow keys move between the tabs.
  function onTabKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    let next = selected;
    if (e.key === "ArrowRight") next = (selected + 1) % columns.length;
    else if (e.key === "ArrowLeft")
      next = (selected - 1 + columns.length) % columns.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = columns.length - 1;
    else return;
    e.preventDefault();
    setSelected(next);
    document.getElementById(`features-tab-${columns[next].id}`)?.focus();
  }

  // The "See every … feature" links above point at a group's row in the
  // table. On a phone the table is hidden, so the link lands on the
  // section instead.
  useEffect(() => {
    const land = () => {
      if (!/^#features-/.test(window.location.hash)) return;
      const table = tableRef.current;
      if (table && table.offsetParent === null)
        sectionRef.current?.scrollIntoView({ block: "start" });
    };
    land();
    window.addEventListener("hashchange", land);
    return () => window.removeEventListener("hashchange", land);
  }, []);

  return (
    <section
      ref={sectionRef}
      className={styles.container}
      id='platform-features'
      aria-labelledby='platform-features-heading'
    >
      <Reveal mode='together' />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.top}>
            <div className={styles.topLeft}>
              <EyeBrow text='Every feature' />
              <h2
                id='platform-features-heading'
                className={styles.heading}
                data-reveal
                data-reveal-style='fade'
              >
                The Whole Platform, <br /> Feature by Feature
              </h2>
              <p className={styles.copy} data-reveal>
                Everything in the Full Platform, and who it&apos;s for: your
                riders, your drivers, your corporate accounts, and you.
              </p>
            </div>
            <span className={styles.count} data-reveal>
              ({FEATURE_COUNT} features)
            </span>
          </div>

          {/* Wide screens: the full table. */}
          <div ref={tableRef} className={styles.tableWrap} data-reveal>
            <table className={styles.table}>
              <caption className={styles.srOnly}>
                Every feature of the Full Platform, and who uses it
              </caption>
              <thead>
                <tr>
                  <td className={styles.corner} />
                  {columns.map((c) => (
                    <th
                      key={c.id}
                      scope='col'
                      className={`${styles.planHead} ${c.tone} ${c.featured ? styles.featuredHead : ""}`}
                    >
                      {c.name}
                      {c.featured && (
                        <span className={styles.badge}>
                          The admin dashboard
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              {groups.map((group) => (
                <tbody key={group.id} className={styles.group}>
                  <tr className={styles.groupRow}>
                    <th
                      scope='rowgroup'
                      colSpan={columns.length + 1}
                      id={`features-${group.id}`}
                      className={styles.groupLabel}
                    >
                      <span className={styles.groupText}>{group.name}</span>
                    </th>
                  </tr>
                  {group.rows.map((row) => (
                    <tr key={row.label}>
                      <th scope='row' className={styles.rowLabel}>
                        {row.label}
                      </th>
                      {row.values.map((value, i) => (
                        <td
                          key={columns[i].id}
                          className={`${styles.cell} ${columns[i].tone}`}
                        >
                          <Cell value={value} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>

          {/* 968px and below: one person at a time, only what they get. */}
          <div className={styles.mobile} data-reveal>
            <div
              className={styles.tabs}
              role='tablist'
              aria-label='Choose who to see the features for'
            >
              {columns.map((c, i) => (
                <button
                  key={c.id}
                  type='button'
                  role='tab'
                  id={`features-tab-${c.id}`}
                  aria-selected={i === selected}
                  aria-controls='features-panel'
                  tabIndex={i === selected ? 0 : -1}
                  className={`${styles.tab} ${i === selected ? styles.tabActive : ""}`}
                  onClick={() => setSelected(i)}
                  onKeyDown={onTabKeyDown}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div
              className={`${styles.panel} ${column.tone} ${column.featured ? styles.panelFeatured : ""}`}
              role='tabpanel'
              id='features-panel'
              aria-labelledby={`features-tab-${column.id}`}
            >
              <div className={styles.panelHead}>
                <span className={styles.panelName}>{column.name}</span>
                {column.featured && (
                  <span className={styles.panelBadge}>The admin dashboard</span>
                )}
              </div>
              {/* Re-mounts on every tab change, which replays the fade. */}
              <div className={styles.list} key={column.id}>
                {groups
                  .map((group) => ({
                    ...group,
                    rows: group.rows.filter(
                      (row) => row.values[selected] !== false,
                    ),
                  }))
                  .filter((group) => group.rows.length)
                  .map((group) => (
                    <dl className={styles.listGroup} key={group.id}>
                      <dt className={styles.listGroupName}>{group.name}</dt>
                      {group.rows.map((row) => (
                        <dd className={styles.listRow} key={row.label}>
                          <span className={styles.listLabel}>{row.label}</span>
                          <span className={styles.listValue}>
                            <Cell value={row.values[selected]} />
                          </span>
                        </dd>
                      ))}
                    </dl>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
