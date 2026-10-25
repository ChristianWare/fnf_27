"use client";

// Where a client works, the way the Leads Tool asks it: their state (only
// states where we have an area), then their city in it. A city in one of
// our areas is matched to it; one outside them all gets the nearest area
// to use instead, or a "let me know" that tells the studio. Used by the
// first-visit setup and by Lead settings.

import { useState } from "react";
import Icon from "../icons";
import { ui } from "../ui/ui";
import { useToast } from "../Toast/Toast";
import CityPicker, {
  type PickedCity,
} from "@/components/shared/CityPicker/CityPicker";
import { askForArea } from "@/app/dashboard/leads/actions";
import { stateName, statewide } from "@/lib/leads/areas";
import type { LeadsArea } from "@/lib/leads/types";
import styles from "./AreaPicker.module.css";

export type AreaChoice = {
  state: string;
  area: LeadsArea;
  /** Their city, or none: the area's center. */
  city?: PickedCity;
};

export default function AreaPicker({
  areas,
  initialState = "",
  initialCity = "",
  onChange,
  onState,
  disabled,
  idPrefix = "area",
}: {
  areas: LeadsArea[];
  initialState?: string;
  initialCity?: string;
  onChange: (choice: AreaChoice | null) => void;
  /** The state as soon as it's picked, before a city. */
  onState?: (state: string) => void;
  disabled?: boolean;
  idPrefix?: string;
}) {
  const toast = useToast();
  const states = [...new Set(areas.map((a) => a.state).filter(Boolean))].sort();
  const [state, setState] = useState(
    states.includes(initialState)
      ? initialState
      : states.length === 1
        ? states[0]
        : "",
  );
  const [picked, setPicked] = useState<PickedCity | null>(null);
  const [usingNearest, setUsingNearest] = useState(false);
  const [asked, setAsked] = useState(false);
  const [asking, setAsking] = useState(false);
  const inState = areas.filter((a) => a.state === state);

  const pickState = (next: string) => {
    if (next === state) return;
    setState(next);
    onState?.(next);
    setPicked(null);
    setUsingNearest(false);
    setAsked(false);
    onChange(null);
  };

  const pickCity = (city: PickedCity | null) => {
    setPicked(city);
    setUsingNearest(false);
    setAsked(false);
    const area = city?.area && areas.find((a) => a.id === city.area!.id);
    onChange(city && area && city.area!.covered ? { state, area, city } : null);
  };

  const nearest =
    picked?.area && !picked.area.covered
      ? areas.find((a) => a.id === picked.area!.id)
      : undefined;

  return (
    <div className={styles.picker}>
      <div className={ui.field}>
        <span className={ui.label}>Which state do you work in?</span>
        <div className={styles.states} role='radiogroup' aria-label='State'>
          {states.map((code) => {
            const list = areas.filter((a) => a.state === code);
            return (
              <button
                key={code}
                type='button'
                role='radio'
                aria-checked={code === state}
                disabled={disabled}
                className={`${styles.state} ${code === state ? styles.stateOn : ""}`}
                onClick={() => pickState(code)}
              >
                <span className={styles.stateName}>{stateName(code)}</span>
                <span className={styles.stateNote}>
                  {statewide(code)
                    ? `All of ${stateName(code)}`
                    : list.map((a) => a.name).join(", ")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {state && (
        <div className={ui.field}>
          <label className={ui.label} htmlFor={`${idPrefix}-city`}>
            Your city
          </label>
          <CityPicker
            key={state}
            id={`${idPrefix}-city`}
            state={state}
            defaultText={state === initialState ? initialCity : ""}
            inputClassName={ui.input}
            placeholder={`Start typing a city in ${stateName(state)}`}
            onPick={pickCity}
            disabled={disabled}
          />
          {picked?.area?.covered && (
            <span className={styles.ok}>
              <Icon name='check' />
              You&apos;re in our {picked.area.name}.
            </span>
          )}
          {nearest && picked && (
            <div className={styles.outside} role='status'>
              <p>
                We don&apos;t cover {picked.name} yet. In {stateName(state)},
                we cover the {inState.map((a) => a.name).join(", ")} (the
                nearest is {picked.area!.miles} mi away).
              </p>
              <div className={styles.outsideActions}>
                <button
                  type='button'
                  className={`${ui.btn} ${usingNearest ? ui.btn_black : ui.btn_light} ${ui.btnSmall}`}
                  disabled={disabled}
                  onClick={() => {
                    setUsingNearest(true);
                    onChange({ state, area: nearest });
                  }}
                >
                  {usingNearest
                    ? `Using the ${nearest.name}`
                    : `Use the ${nearest.name} anyway`}
                  {usingNearest && (
                    <Icon name='check' className={ui.btnIcon} />
                  )}
                </button>
                <button
                  type='button'
                  className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                  disabled={disabled || asked || asking}
                  onClick={async () => {
                    setAsking(true);
                    const result = await askForArea({ city: picked.text });
                    setAsking(false);
                    if (!result.ok) {
                      toast(result.error, { tone: "error" });
                      return;
                    }
                    setAsked(true);
                    toast("We'll let you know", {
                      detail: `Thanks. We'll email you when we open ${picked.name}.`,
                    });
                  }}
                >
                  {asked ? "We'll let you know" : "Let me know when you open my area"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
