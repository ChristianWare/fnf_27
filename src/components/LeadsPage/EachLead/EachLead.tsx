"use client";

// What comes with each lead, in four tabs. Each tab swaps the picture (a
// piece of the leads tool built in HTML, in LeadVignettes.tsx) and the
// text, the same as the story section on the About page.

import { useState, type KeyboardEvent } from "react";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./EachLead.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Reveal from "@/components/shared/Reveal/Reveal";
import {
  BriefArt,
  DecisionMakerArt,
  NextStepArt,
  ScriptArt,
} from "./LeadVignettes";

const tabs = [
  {
    id: "contact",
    label: "The Decision-Maker",
    title: "Name, title, and a way to reach them",
    body: "Save a lead and the tool finds the person who books the rides: their name, title, and a work email when one can be found, plus the business's phone line. You reach the decision-maker, not a front desk.",
    Art: DecisionMakerArt,
  },
  {
    id: "script",
    label: "The Scripts",
    title: "An email, a text and a call opener, written for them",
    body: "Three scripts written for that business, in your words: an email with its subject line, a text, and a call opener. Each one names what they do, why their guests or staff need rides, and what to offer first, so your first message reads like you already know them.",
    Art: ScriptArt,
  },
  {
    id: "brief",
    label: "The Brief",
    title: "Why they need you, and how to pitch",
    body: "A short brief on every lead: why they need transportation, who they use now (the tool reads their website for a car service partner), when their busy season is, who to ask for, and the angle to lead with.",
    Art: BriefArt,
  },
  {
    id: "next",
    label: "The Next Step",
    title: "Where it sits, and what to do today",
    body: "Every saved lead sits in your pipeline, from New to Contacted, Talking and Won. Log the email, text, call or meeting, and the tool tells you who to follow up with today. Nothing goes cold because you forgot.",
    Art: NextStepArt,
  },
];

export default function EachLead() {
  const [active, setActive] = useState(0);
  const current = tabs[active];

  // Left and right arrow keys move between tabs, like any tab control.
  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    let next = active;
    if (e.key === "ArrowRight") next = (active + 1) % tabs.length;
    else if (e.key === "ArrowLeft")
      next = (active - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    setActive(next);
    document.getElementById(`lead-tab-${tabs[next].id}`)?.focus();
  }

  return (
    <section className={styles.container} aria-labelledby='each-lead'>
      <Reveal mode='together' />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.intro}>
            <EyeBrow text='Each lead' />
            <h2
              id='each-lead'
              className={styles.heading}
              data-reveal
              data-reveal-style='fade'
            >
              What Comes with <br />
              Every Lead
            </h2>
            <p className={styles.introCopy} data-reveal>
              Four things on every lead the tool finds: the person to contact,
              the scripts to reach them with, why they need you, and what to do
              next. Click through to see each one.
            </p>
          </div>

          <div
            className={styles.tabs}
            role='tablist'
            aria-label='What comes with each lead'
            data-reveal
          >
            {tabs.map((tab, i) => (
              <button
                key={tab.id}
                type='button'
                role='tab'
                id={`lead-tab-${tab.id}`}
                aria-selected={i === active}
                aria-controls='lead-panel'
                tabIndex={i === active ? 0 : -1}
                className={`${styles.tab} ${i === active ? styles.tabActive : ""}`}
                onClick={() => setActive(i)}
                onKeyDown={onKeyDown}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div
            className={styles.panel}
            role='tabpanel'
            id='lead-panel'
            aria-labelledby={`lead-tab-${current.id}`}
            data-reveal
          >
            {/* Decorative: the text beside it says what it is. Re-mounts on
                every tab change, which replays the fade. */}
            <div className={styles.art} aria-hidden='true'>
              <current.Art key={current.id} />
            </div>

            <div className={styles.text} key={current.id}>
              <span className={`${styles.note} h6`}>({current.label})</span>
              <div className={styles.textBottom}>
                <h3 className={`${styles.title} h4`}>{current.title}</h3>
                <p className={styles.body}>{current.body}</p>
              </div>
            </div>
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
