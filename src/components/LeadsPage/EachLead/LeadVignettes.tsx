// The pictures on the "What comes with each lead" tabs: one piece of the
// leads tool for each tab, built in HTML the same way as the "What it does"
// cards on the booking software page. The labels and statuses are the real
// ones from the tool; the venue, names and dates are made up.

import styles from "./LeadVignettes.module.css";

// The lead with its verified contacts, the way it looks once it's saved.
export function DecisionMakerArt() {
  const people = [
    {
      initials: "MR",
      name: "Maria Reyes",
      title: "Event Sales Coordinator",
      link: "maria@boojumtree.com ↗",
    },
    {
      initials: "TA",
      name: "Tom Alvarez",
      title: "Director of Catering",
      link: "LinkedIn ↗",
    },
  ];
  return (
    <div className={styles.ui}>
      <div className={styles.head}>
        <span className={styles.mono}>Cold lead · Venue</span>
        <span className={styles.pill}>Lead score 78/100</span>
      </div>

      <div className={styles.business}>
        <span className={styles.name}>Boojum Tree Hidden Gardens</span>
        <span className={styles.mono}>Phoenix, AZ · ★ 4.7 (312 reviews)</span>
      </div>

      <span className={styles.label}>Verified contacts</span>
      {people.map((person) => (
        <div className={styles.contact} key={person.name}>
          <span className={styles.avatar}>{person.initials}</span>
          <span className={styles.contactText}>
            <span className={styles.contactName}>{person.name}</span>
            <span className={styles.value}>{person.title}</span>
            <span className={styles.link}>{person.link}</span>
          </span>
        </div>
      ))}

      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt className={styles.mono}>Phone</dt>
          <dd className={styles.value}>(602) 555-0148</dd>
        </div>
      </dl>

      <div className={styles.button}>+ Save lead</div>
    </div>
  );
}

// The email script, with the other two formats behind it.
export function ScriptArt() {
  return (
    <div className={styles.ui}>
      <div className={styles.head}>
        <div className={styles.formats}>
          <span className={`${styles.format} ${styles.formatActive}`}>
            Email
          </span>
          <span className={styles.format}>Cold call opener</span>
          <span className={styles.format}>LinkedIn DM</span>
        </div>
        <span className={styles.pill}>Copy</span>
      </div>

      <div className={styles.subject}>
        <span className={styles.mono}>Subject</span>
        <span className={styles.value}>
          Transportation for your couples and their guests
        </span>
      </div>

      <div className={styles.body}>
        <p className={styles.para}>
          Hi Maria, I run a chauffeured car service here in Phoenix, and I
          noticed Boojum Tree doesn&apos;t list a transportation partner for
          couples and their guests.
        </p>
        <p className={styles.para}>
          We handle wedding-party SUVs and guest shuttles for venues across the
          Valley, with flat pricing and one point of contact on the day. Would a
          10-minute call this week be worth it, to see if we&apos;d fit your
          preferred-vendor list?
        </p>
      </div>

      <div className={styles.button}>Open in mail app</div>
    </div>
  );
}

// The brief: the angle, who they use now, and when to reach out.
export function BriefArt() {
  return (
    <div className={styles.ui}>
      <div className={styles.head}>
        <span className={styles.mono}>Strategic brief</span>
        <span className={styles.pill}>Approaching peak</span>
      </div>

      <p className={styles.para}>
        Boojum Tree runs 80 to 150 weddings a year and lists no transportation
        partner on its site, so couples ask the venue who to call. Lead with the
        preferred-vendor angle: guest shuttles from the hotel block, a flat
        rate, and one contact on the day. The Event Sales Coordinator picks
        vendors; the owner isn&apos;t involved.
      </p>

      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt className={styles.mono}>Who they use now</dt>
          <dd className={styles.value}>No partner detected</dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.mono}>Busy season</dt>
          <dd className={styles.value}>Feb–May, then Sep–Oct</dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.mono}>Lead with</dt>
          <dd className={styles.value}>Guest shuttle, preferred-vendor spot</dd>
        </div>
      </dl>

      <span className={styles.label}>Pitch ideas</span>
      <ul className={styles.ideas}>
        <li className={styles.idea}>Hotel-to-venue shuttle</li>
        <li className={styles.idea}>Wedding-party SUV</li>
        <li className={styles.idea}>Late-night safe rides home</li>
      </ul>
    </div>
  );
}

// Where the lead sits, and the move for today.
export function NextStepArt() {
  const stages = ["New", "Contacted", "Nurturing", "Won"];
  const current = 1;
  return (
    <div className={styles.ui}>
      <div className={styles.head}>
        <span className={styles.mono}>Pipeline</span>
        <span className={styles.pill}>Follow-up due</span>
      </div>

      <ol className={styles.stages}>
        {stages.map((stage, i) => (
          <li
            className={`${styles.stage} ${i === current ? styles.stageActive : ""} ${i < current ? styles.stageDone : ""}`}
            key={stage}
          >
            {stage}
          </li>
        ))}
      </ol>

      <div className={styles.move}>
        <span className={styles.mono}>Recommended next move</span>
        <span className={styles.moveTitle}>No reply — call them today.</span>
        <span className={styles.value}>
          Email sent 6 days ago. Phone follow-up is the next move.
        </span>
      </div>

      <dl className={styles.rows}>
        <div className={styles.row}>
          <dt className={styles.mono}>Email sent</dt>
          <dd className={styles.value}>6d ago</dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.mono}>Lead created</dt>
          <dd className={styles.value}>9d ago</dd>
        </div>
      </dl>

      <div className={styles.button}>Log the call</div>
    </div>
  );
}
