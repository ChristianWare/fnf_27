"use client";

// A look at the market before signing up: pick one of the areas the tool
// covers and see how many hotels, venues, other accounts and upcoming
// events it has there. From our own data, so it costs nothing to show.

import { useEffect, useState } from "react";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./LeadsInYourCity.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";

const kinds = [
  { key: "hotels", label: "Hotels and resorts", tone: styles.toneHotels },
  { key: "venues", label: "Wedding and event venues", tone: styles.toneVenues },
  {
    key: "accounts",
    label: "Corporate and other accounts",
    tone: styles.toneCorporate,
  },
  { key: "events", label: "Upcoming events", tone: styles.toneEvents },
] as const;

const n = (value: number) => value.toLocaleString("en-US");
const count = (c: { value: number; more?: boolean }) =>
  `${n(c.value)}${c.more ? "+" : ""}`;

type Area = {
  id: string;
  name: string;
  hotels: { value: number };
  venues: { value: number };
  accounts: { value: number };
  events: { value: number };
};

export default function LeadsInYourCity() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaId, setAreaId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const looking = !areas.length && !error;

  // The areas we cover, with what the tool has in each right now.
  useEffect(() => {
    let live = true;
    fetch("/api/market/areas")
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as {
          areas?: Area[];
        };
        if (!live) return;
        const list = body.areas ?? [];
        setAreas(list);
        setAreaId(list[0]?.id ?? "");
        if (!list.length) setError("Our areas are loading. Check back soon.");
      })
      .catch(() => live && setError("That didn't load. Try again in a minute."));
    return () => {
      live = false;
    };
  }, []);

  const picked = areas.find((a) => a.id === areaId);
  const market = picked
    ? { ...picked, area: picked.name, city: picked.name, from: "tool" as const }
    : null;

  // "in the Phoenix area" where the tool runs, "around Tucson, AZ" elsewhere.
  const where = market
    ? market.area
      ? `in the ${market.area}`
      : `around ${market.city}`
    : "";
  const summary = market
    ? [
        `${count(market.hotels)} hotels and resorts`,
        `${count(market.venues)} wedding and event venues`,
        `${count(market.accounts)} corporate and other accounts`,
        `${count(market.events)} upcoming events`,
      ].join(" · ")
    : "";

  return (
    <section className={styles.container} aria-labelledby='leads-in-your-city'>
      <Reveal />
      <LayoutWrapper>
        <div className={styles.content}>
          <div className={styles.left}>
            <EyeBrow text='Leads in your city' />
            <h2
              id='leads-in-your-city'
              className={`${styles.heading} h3`}
              data-reveal
              data-reveal-style='fade'
            >
              See what&apos;s in your area before you sign up
            </h2>
            <p className={styles.copy} data-reveal>
              Pick your area to see how many accounts and events the tool has
              there right now. More areas are opening soon.
            </p>
          </div>

          <div className={styles.right} data-reveal>
            {/* The areas we cover: pick one to see what's there. */}
            <div className={styles.areas} role='radiogroup' aria-label='Area'>
              {areas.map((a) => (
                <button
                  key={a.id}
                  type='button'
                  role='radio'
                  aria-checked={a.id === areaId}
                  className={`${styles.area} ${a.id === areaId ? styles.areaOn : ""}`}
                  onClick={() => setAreaId(a.id)}
                >
                  {a.name}
                </button>
              ))}
            </div>

            {error && (
              <p className={styles.error} role='alert'>
                {error}
              </p>
            )}

            {/* The result: one card per kind of lead. */}
            <ul
              className={`${styles.grid} ${looking ? styles.gridBusy : ""}`}
              aria-live='polite'
              aria-busy={looking}
            >
              {kinds.map((kind) => (
                <li className={styles.card} key={kind.key}>
                  <span
                    className={`${styles.swatch} ${market ? kind.tone : ""}`}
                  >
                    {market ? count(market[kind.key]) : "–"}
                  </span>
                  <span className={styles.cardText}>
                    <span className={styles.cardName}>{kind.label}</span>
                    <span className={styles.cardSub}>
                      {market ? where : "Pick your area"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            {market && (
              <>
                <p className={styles.note}>
                  What the tool has {where} right now, from its nightly
                  searches.
                </p>
                <div className={styles.unlock}>
                  <p className={styles.unlockText}>
                    {summary} {where}. The contacts and scripts unlock when you
                    sign up. Free for 30 days, no card.
                  </p>
                  <Button
                    href='/register?plan=leads'
                    btnType='black'
                    text='Show me the contacts'
                    arrow
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
