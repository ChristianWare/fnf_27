"use client";

// A look at the market before signing up: type a city, see how many
// hotels, venues, corporate accounts and upcoming events the tool has
// there. Until the real lookup is connected, the counts are placeholders.

import { useState, type FormEvent } from "react";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./LeadsInYourCity.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";

type Market = {
  city: string;
  hotels: number;
  venues: number;
  corporate: number;
  events: number;
};

// PLACEHOLDER. Steady made-up counts for any city, so the same city always
// shows the same numbers. Swap this for the API call.
function lookUp(city: string): Market {
  let seed = 0;
  for (const char of city.toLowerCase())
    seed = (seed * 31 + char.charCodeAt(0)) % 9973;
  const pick = (min: number, max: number, salt: number) =>
    min + ((seed * salt) % (max - min + 1));
  return {
    city,
    hotels: pick(24, 96, 7),
    venues: pick(18, 70, 11),
    corporate: pick(40, 160, 13),
    events: pick(6, 28, 17),
  };
}

const kinds = [
  { key: "hotels", label: "Hotels", tone: styles.toneHotels },
  { key: "venues", label: "Venues", tone: styles.toneVenues },
  { key: "corporate", label: "Corporate accounts", tone: styles.toneCorporate },
  { key: "events", label: "Upcoming events", tone: styles.toneEvents },
] as const;

export default function LeadsInYourCity() {
  const [city, setCity] = useState("");
  const [market, setMarket] = useState<Market | null>(null);
  const [error, setError] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = city.trim().replace(/\s+/g, " ");
    if (name.length < 2) {
      setError(true);
      return;
    }
    setError(false);
    setMarket(lookUp(name));
  }

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
              See what&apos;s in your market before you sign up
            </h2>
            <p className={styles.copy} data-reveal>
              Type your city and see how many accounts and events the tool has
              there right now.
            </p>
          </div>

          <div className={styles.right} data-reveal>
            {/* The city field and the button, in the bar across the top. */}
            <form className={styles.bar} onSubmit={onSubmit} noValidate>
              <label className={styles.field}>
                <span className={styles.label}>Your city</span>
                <input
                  className={styles.input}
                  type='text'
                  name='city'
                  autoComplete='address-level2'
                  placeholder='Phoenix'
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  aria-invalid={error ? true : undefined}
                />
              </label>
              <Button type='submit' btnType='black' text='Show my market' />
            </form>

            {error && (
              <p className={styles.error} role='alert'>
                Enter your city.
              </p>
            )}

            {/* The result: one card per kind of lead. */}
            <ul className={styles.grid} aria-live='polite'>
              {kinds.map((kind) => (
                <li className={styles.card} key={kind.key}>
                  <span
                    className={`${styles.swatch} ${market ? kind.tone : ""}`}
                  >
                    {market ? market[kind.key] : "–"}
                  </span>
                  <span className={styles.cardText}>
                    <span className={styles.cardName}>{kind.label}</span>
                    <span className={styles.cardSub}>
                      {market ? `in ${market.city}` : "Enter your city"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            {market && (
              <div className={styles.unlock}>
                <p className={styles.unlockText}>
                  {market.hotels} hotels · {market.venues} venues ·{" "}
                  {market.corporate} corporate accounts · {market.events}{" "}
                  upcoming events in {market.city}. The contacts and scripts
                  unlock when you sign up. Free for 30 days, no card.
                </p>
                <Button
                  href='/leads'
                  btnType='black'
                  text='Show me the contacts'
                  arrow
                />
              </div>
            )}
          </div>
        </div>
      </LayoutWrapper>
    </section>
  );
}
