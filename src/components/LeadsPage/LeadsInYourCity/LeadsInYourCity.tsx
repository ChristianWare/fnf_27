"use client";

// A look at the market before signing up: type a city, pick it from
// Google's suggestions, and see how many hotels, venues, other accounts
// and upcoming events the tool has there. Only a real US city goes
// through: anything else asks for a pick from the list.

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import LayoutWrapper from "@/components/shared/LayoutWrapper";
import styles from "./LeadsInYourCity.module.css";
import EyeBrow from "@/components/shared/EyeBrow/EyeBrow";
import Button from "@/components/shared/Button/Button";
import Reveal from "@/components/shared/Reveal/Reveal";
import type { CitySuggestion, Peek } from "@/lib/market/peek";

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

/** One token per spell of typing, so Google bills it as one session. */
const newSession = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "";

export default function LeadsInYourCity() {
  const listId = useId();
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<CitySuggestion | null>(null);
  const [cities, setCities] = useState<CitySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [market, setMarket] = useState<Peek | null>(null);
  const session = useRef(newSession());
  const asked = useRef("");

  // Suggestions as they type, a short pause after each keystroke. (The
  // list is cleared where the text changes, not here.)
  useEffect(() => {
    const q = text.trim();
    if (picked || q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      asked.current = q;
      fetch(
        `/api/market/cities?q=${encodeURIComponent(q)}&session=${session.current}`,
        { signal: controller.signal, cache: "no-store" },
      )
        .then(async (res) => {
          const body = (await res.json().catch(() => ({}))) as {
            cities?: CitySuggestion[];
          };
          if (asked.current !== q) return;
          setCities(body.cities ?? []);
          setHighlight(0);
          setOpen(true);
        })
        .catch(() => {
          // Nothing to suggest right now; the form says so on submit.
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, picked]);

  const choose = (city: CitySuggestion) => {
    setPicked(city);
    setText(city.text);
    setCities([]);
    setOpen(false);
    setError(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || !cities.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((i) => (i + 1) % cities.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((i) => (i - 1 + cities.length) % cities.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(cities[highlight]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Typed but not picked: the first suggestion, if there is one.
    const city = picked ?? (cities.length ? cities[0] : null);
    if (!city) {
      setError(
        text.trim().length < 2
          ? "Type your city."
          : "We couldn't find that city. Pick one from the list as you type.",
      );
      return;
    }
    if (!picked) choose(city);
    setError(null);
    setLooking(true);
    try {
      const res = await fetch(
        `/api/market/peek?place=${encodeURIComponent(city.id)}&session=${session.current}`,
        { cache: "no-store" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        market?: Peek;
        error?: string;
      };
      if (!res.ok || !body.market) {
        setError(body.error ?? "That didn't work. Try again in a minute.");
        return;
      }
      setMarket(body.market);
      // The next spell of typing is a new session for Google.
      session.current = newSession();
    } catch {
      setError("That didn't work. Check your connection and try again.");
    } finally {
      setLooking(false);
    }
  }

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
              See what&apos;s in your market before you sign up
            </h2>
            <p className={styles.copy} data-reveal>
              Type your city and pick it from the list to see how many accounts
              and events the tool finds there.
            </p>
          </div>

          <div className={styles.right} data-reveal>
            {/* The city field and the button, in the bar across the top. */}
            <form className={styles.bar} onSubmit={onSubmit} noValidate>
              <div className={styles.field}>
                <label className={styles.label} htmlFor='leads-city'>
                  Your city
                </label>
                <div className={styles.combo}>
                  <input
                    id='leads-city'
                    className={styles.input}
                    type='text'
                    name='city'
                    autoComplete='off'
                    spellCheck={false}
                    placeholder='Phoenix'
                    value={text}
                    role='combobox'
                    aria-expanded={open && cities.length > 0}
                    aria-controls={listId}
                    aria-autocomplete='list'
                    aria-activedescendant={
                      open && cities.length
                        ? `${listId}-${highlight}`
                        : undefined
                    }
                    aria-invalid={error ? true : undefined}
                    onChange={(event) => {
                      setText(event.target.value);
                      setPicked(null);
                      setError(null);
                      if (event.target.value.trim().length < 2) {
                        setCities([]);
                        setOpen(false);
                      }
                    }}
                    onFocus={() => cities.length && setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    onKeyDown={onKeyDown}
                  />
                  <ul
                    id={listId}
                    role='listbox'
                    aria-label='Cities'
                    className={styles.list}
                    hidden={!open || !cities.length}
                  >
                    {cities.map((city, i) => (
                      <li
                        key={city.id}
                        id={`${listId}-${i}`}
                        role='option'
                        aria-selected={i === highlight}
                        className={`${styles.option} ${i === highlight ? styles.optionOn : ""}`}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          choose(city);
                        }}
                        onMouseEnter={() => setHighlight(i)}
                      >
                        <span className={styles.optionName}>{city.name}</span>
                        <span className={styles.optionRegion}>
                          {city.region}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <Button
                type='submit'
                btnType='black'
                text={looking ? "Looking…" : "Show my market"}
              />
            </form>

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
                      {market ? where : "Pick your city"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            {market && (
              <>
                <p className={styles.note}>
                  {market.from === "tool"
                    ? `What the tool has ${where} right now, from its nightly searches.`
                    : `A quick look ${where}: the tool's Google searches, within 25 miles, and the events Ticketmaster lists in the next 90 days. Once you sign up, the nightly search goes deeper and adds Eventbrite, convention centers and city calendars.`}
                </p>
                <div className={styles.unlock}>
                  <p className={styles.unlockText}>
                    {summary} {where}. The contacts and scripts unlock when you
                    sign up. Free for 30 days, no card.
                  </p>
                  <Button
                    href='/leads'
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
