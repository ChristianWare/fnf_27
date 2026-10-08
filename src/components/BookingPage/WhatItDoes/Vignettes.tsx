// The pictures on the "What it does" cards: one small piece of the software
// for each feature, built in HTML so it matches the site instead of a
// client's branding. The labels and statuses are the real ones from the
// booking system; the names, times and amounts are made up.

import styles from "./Vignettes.module.css";
import Plane from "@/components/shared/icons/Plane/Plane";

// A finished estimate, the way a rider sees it before submitting.
export function DirectBookingArt() {
  return (
    <div className={styles.ui}>
      <div className={styles.head}>
        <span className={styles.mono}>Estimate</span>
        <span className={styles.pill}>Executive SUV</span>
      </div>
      <div className={styles.big}>$185.00</div>
      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt className={styles.mono}>Pickup</dt>
          <dd className={styles.value}>Sky Harbor (PHX)</dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.mono}>Dropoff</dt>
          <dd className={styles.value}>Scottsdale</dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.mono}>When</dt>
          <dd className={styles.value}>Mon, Oct 12 · 9:00 AM</dd>
        </div>
      </dl>
      <div className={styles.button}>Submit request →</div>
    </div>
  );
}

// Three rides in one trip, with one total.
export function MultiRideArt() {
  const rides = [
    { n: 1, name: "Airport pickup", when: "Mon · 9:00 AM", price: "$185" },
    { n: 2, name: "Dinner transfer", when: "Tue · 7:30 PM", price: "$120" },
    { n: 3, name: "Return to PHX", when: "Thu · 6:00 AM", price: "$185" },
  ];
  return (
    <div className={styles.ui}>
      <div className={styles.head}>
        <span className={styles.mono}>Trip itinerary</span>
        <span className={styles.pill}>3 rides</span>
      </div>
      <ol className={styles.rides}>
        {rides.map((ride) => (
          <li className={styles.ride} key={ride.n}>
            <span className={styles.dot}>{ride.n}</span>
            <span className={styles.rideText}>
              <span className={styles.value}>{ride.name}</span>
              <span className={styles.mono}>{ride.when}</span>
            </span>
            <span className={styles.value}>{ride.price}</span>
          </li>
        ))}
      </ol>
      <div className={styles.total}>
        <span className={styles.mono}>Total · one payment</span>
        <span className={styles.value}>$490.00</span>
      </div>
    </div>
  );
}

// The driver's next trip on their phone, with the status stepper.
export function DriverPortalArt() {
  const steps = ["Assigned", "En Route", "Arrived", "Picked Up", "Completed"];
  const current = 1;
  return (
    <div className={`${styles.ui} ${styles.phone}`}>
      <div className={styles.head}>
        <span className={styles.mono}>Next trip</span>
        <span className={styles.pill}>in 3 hours</span>
      </div>
      <div className={styles.value}>Mon, Oct 12 · 9:00 AM</div>
      <div className={styles.route}>Sky Harbor (PHX) → Scottsdale</div>
      <ol className={styles.steps} aria-hidden='true'>
        {steps.map((step, i) => (
          <li
            className={`${styles.step} ${i <= current ? styles.stepDone : ""}`}
            key={step}
          />
        ))}
      </ol>
      <div className={styles.stepLabel}>
        <span className={styles.mono}>Status</span>
        <span className={styles.value}>{steps[current]}</span>
      </div>
      <div className={styles.button}>I&apos;ve Arrived</div>
    </div>
  );
}

// A tracked flight: live status, with the pickup following it.
export function FlightTrackingArt() {
  return (
    <div className={styles.ui}>
      <div className={styles.head}>
        <span className={styles.airline}>
          <span className={styles.code}>AA</span>
          <span className={styles.mono}>AA 2315</span>
        </span>
        <span className={`${styles.pill} ${styles.pillLanded}`}>Landed</span>
      </div>
      <div className={styles.flightRoute}>
        <span className={styles.big}>CLT</span>
        <Plane className={styles.plane} aria-hidden='true' />
        <span className={styles.big}>PHX</span>
      </div>
      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt className={styles.mono}>Arrived</dt>
          <dd className={styles.value}>8:07 AM · 12 min early</dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.mono}>Terminal</dt>
          <dd className={styles.value}>Terminal 4 · Gate B12</dd>
        </div>
      </dl>
    </div>
  );
}

// Every way a ride gets paid, on one booking.
export function PaymentsArt() {
  const lines = [
    { label: "Deposit (50%)", value: "$92.50", status: "Paid" },
    { label: "Balance", value: "$92.50", status: "Link emailed" },
    { label: "Card on file", value: "Visa ···· 4242", status: "Saved" },
    { label: "Refund", value: "$40.00", status: "Issued" },
  ];
  return (
    <div className={styles.ui}>
      <div className={styles.head}>
        <span className={styles.mono}>Payment</span>
        <span className={styles.pill}>Secured by Stripe</span>
      </div>
      <dl className={styles.rows}>
        {lines.map((line) => (
          <div className={styles.row} key={line.label}>
            <dt className={styles.mono}>{line.label}</dt>
            <dd className={styles.rowRight}>
              <span className={styles.value}>{line.value}</span>
              <span className={styles.status}>{line.status}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// The three messages the system sends on its own.
export function RemindersArt() {
  const notes = [
    { when: "24 hours before", text: "Your ride is tomorrow at 9:00 AM" },
    { when: "2 hours before", text: "Your ride is in about 2 hours" },
    { when: "Link unpaid", text: "Your ride still needs payment" },
  ];
  return (
    <div className={styles.stack}>
      {notes.map((note) => (
        <div className={`${styles.ui} ${styles.note}`} key={note.when}>
          <span className={styles.bell} aria-hidden='true' />
          <span className={styles.noteText}>
            <span className={styles.mono}>{note.when}</span>
            <span className={styles.value}>{note.text}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

// A company account: its people, its spend, its invoice.
export function CorporateArt() {
  return (
    <div className={styles.ui}>
      <div className={styles.head}>
        <span className={styles.mono}>Corporate account</span>
        <span className={styles.pill}>Net 30</span>
      </div>
      <div className={styles.company}>Saguaro Partners</div>
      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt className={styles.mono}>Rides</dt>
          <dd className={styles.statValue}>48</dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.mono}>People</dt>
          <dd className={styles.statValue}>14</dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.mono}>Spend</dt>
          <dd className={styles.statValue}>$6,240</dd>
        </div>
      </dl>
      <div className={styles.total}>
        <span className={styles.mono}>INV-2026-0042 · Monthly</span>
        <span className={styles.status}>Sent</span>
      </div>
    </div>
  );
}

// The month's earnings chart from the admin dashboard.
export function AdminArt() {
  // Daily net, as a share of the tallest day.
  const days = [34, 52, 41, 68, 45, 30, 58, 76, 50, 100, 62, 44, 70, 56];
  return (
    <div className={styles.ui}>
      <div className={styles.head}>
        <span className={styles.mono}>October earnings</span>
        <span className={styles.pill}>Net $8,468</span>
      </div>
      <div className={styles.chart} aria-hidden='true'>
        {days.map((h, i) => (
          <span
            className={`${styles.bar} ${h === 100 ? styles.barTop : ""}`}
            style={{ height: `${h}%` }}
            key={i}
          />
        ))}
      </div>
      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt className={styles.mono}>Captured</dt>
          <dd className={styles.statValue}>$8,468</dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.mono}>Refunded</dt>
          <dd className={styles.statValue}>$0</dd>
        </div>
        <div className={styles.stat}>
          <dt className={styles.mono}>Pending</dt>
          <dd className={styles.statValue}>19</dd>
        </div>
      </dl>
    </div>
  );
}
