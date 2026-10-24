"use client";

// A city field with Google's suggestions as you type, so only a real US
// city goes through. Picking one looks up where it is (for the Leads
// Tool's distances); typing again clears the pick. The look of the input
// comes from the page it's on.

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { CitySuggestion } from "@/lib/market/peek";
import styles from "./CityPicker.module.css";

export type PickedCity = {
  /** "Phoenix" */
  name: string;
  /** "AZ" */
  state: string;
  /** "Phoenix, AZ" */
  text: string;
  lat: number;
  lng: number;
};

/** One token per spell of typing, so Google bills it as one session. */
const newSession = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "";

export default function CityPicker({
  id,
  name,
  defaultText = "",
  onPick,
  inputClassName,
  placeholder = "Start typing your city",
  autoFocus,
  disabled,
  invalid,
  label,
  area,
}: {
  id?: string;
  /** Posts the picked city ("Phoenix, AZ") with a form, under this name. */
  name?: string;
  /** What's in the field to start with: the city already saved. */
  defaultText?: string;
  /** A city was picked (and found), or the pick was cleared (null). */
  onPick?: (city: PickedCity | null) => void;
  inputClassName?: string;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  /** For screen readers, when there's no visible label. */
  label?: string;
  /** A Leads Tool area's id: only cities in it are suggested. */
  area?: string;
}) {
  const scoped = area ? `&area=${encodeURIComponent(area)}` : "";
  const listId = useId();
  const [text, setText] = useState(defaultText);
  const [picked, setPicked] = useState<string>(defaultText);
  const [cities, setCities] = useState<CitySuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [status, setStatus] = useState<"idle" | "finding" | "error">("idle");
  const [error, setError] = useState("");
  const session = useRef(newSession());
  const asked = useRef("");

  // Suggestions a short pause after each keystroke.
  useEffect(() => {
    const q = text.trim();
    if (q === picked || q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      asked.current = q;
      fetch(
        `/api/market/cities?q=${encodeURIComponent(q)}&session=${session.current}${scoped}`,
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
          // Nothing to suggest right now.
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, picked, scoped]);

  const choose = async (city: CitySuggestion) => {
    setText(city.text);
    setPicked(city.text);
    setCities([]);
    setOpen(false);
    setStatus("finding");
    setError("");
    try {
      const res = await fetch(
        `/api/market/city?place=${encodeURIComponent(city.id)}&session=${session.current}${scoped}`,
        { cache: "no-store" },
      );
      const body = (await res.json().catch(() => ({}))) as {
        city?: PickedCity;
        error?: string;
      };
      session.current = newSession();
      if (!res.ok || !body.city) {
        setStatus("error");
        setError(body.error ?? "That didn't work. Pick the city again.");
        setPicked("");
        onPick?.(null);
        return;
      }
      setText(body.city.text);
      setPicked(body.city.text);
      setStatus("idle");
      onPick?.(body.city);
    } catch {
      setStatus("error");
      setError("That didn't work. Check your connection and pick it again.");
      setPicked("");
      onPick?.(null);
    }
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
      void choose(cities[highlight]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const typedOnly = text.trim().length >= 2 && text.trim() !== picked;

  return (
    <div className={styles.combo}>
      <input
        id={id}
        className={inputClassName}
        type='text'
        autoComplete='off'
        spellCheck={false}
        placeholder={placeholder}
        value={text}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={label}
        role='combobox'
        aria-expanded={open && cities.length > 0}
        aria-controls={listId}
        aria-autocomplete='list'
        aria-activedescendant={
          open && cities.length ? `${listId}-${highlight}` : undefined
        }
        aria-invalid={invalid || status === "error" ? true : undefined}
        onChange={(event) => {
          const value = event.target.value;
          setText(value);
          setError("");
          setStatus("idle");
          if (picked) {
            setPicked("");
            onPick?.(null);
          }
          if (value.trim().length < 2) {
            setCities([]);
            setOpen(false);
          }
        }}
        onFocus={() => cities.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {name && <input type='hidden' name={name} value={picked} />}
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
              void choose(city);
            }}
            onMouseEnter={() => setHighlight(i)}
          >
            <span className={styles.optionName}>{city.name}</span>
            <span className={styles.optionRegion}>{city.region}</span>
          </li>
        ))}
      </ul>
      {status === "finding" && (
        <span className={styles.note} aria-live='polite'>
          Finding it…
        </span>
      )}
      {status === "error" && (
        <span className={`${styles.note} ${styles.error}`} role='alert'>
          {error}
        </span>
      )}
      {status === "idle" && typedOnly && !open && (
        <span className={styles.note}>Pick your city from the list.</span>
      )}
    </div>
  );
}
