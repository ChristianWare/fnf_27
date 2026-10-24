"use client";

// The first time someone opens the Leads Tool: where they work (a real
// city, picked from Google's suggestions) and how far they'll drive. Their
// first leads start loading the moment they press the button.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "../icons";
import { PageHead, Panel, ui } from "../ui/ui";
import { useAction } from "../useAction";
import CityPicker, {
  type PickedCity,
} from "@/components/shared/CityPicker/CityPicker";
import { setUpLeads } from "@/app/dashboard/leads/actions";
import { fmtDate } from "@/lib/dashboard/format";
import styles from "./Setup.module.css";

const RADII = [10, 25, 50, 75];

export default function Setup({
  trialEndsAt,
  readOnly,
}: {
  trialEndsAt?: string;
  /** An admin viewing as the client: look, don't touch. */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [city, setCity] = useState<PickedCity | null>(null);
  const [radius, setRadius] = useState(50);

  const start = () => {
    if (!city || pending || readOnly) return;
    run(
      () => setUpLeads({ city: city.text, radius }),
      () => {
        router.refresh();
        return {
          message: `Finding your leads around ${city.name}`,
          detail: "The first load takes about half an hour.",
        };
      },
    );
  };

  return (
    <>
      <PageHead
        crumb='Leads'
        title='Leads Tool'
        text='The hotels, venues, companies and events near you that book rides, every morning.'
      />
      <Panel>
        <form
          className={styles.setup}
          onSubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <div className={styles.titles}>
            <span className={ui.monoMuted}>One question first</span>
            <h2 className={styles.title}>Where do you work from?</h2>
            <p className={styles.text}>
              Your leads are the businesses and events around this city. You
              can change it anytime in Lead settings.
            </p>
          </div>

          <div className={ui.field}>
            <label className={ui.label} htmlFor='leads-setup-city'>
              Your city
            </label>
            <CityPicker
              id='leads-setup-city'
              inputClassName={ui.input}
              placeholder='Start typing, e.g. Las Vegas'
              onPick={setCity}
              disabled={readOnly}
              autoFocus
            />
          </div>

          <div className={ui.field}>
            <span className={ui.label}>How far you&apos;ll drive</span>
            <div className={ui.chips} role='radiogroup' aria-label='Radius'>
              {RADII.map((r) => (
                <button
                  key={r}
                  type='button'
                  role='radio'
                  aria-checked={radius === r}
                  className={ui.chip}
                  onClick={() => setRadius(r)}
                >
                  {r} mi
                </button>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type='submit'
              className={`${ui.btn} ${ui.btn_black}`}
              disabled={!city || pending || readOnly}
            >
              {pending ? "Starting…" : "Find my leads"}
              <Icon name='arrow' className={ui.btnIcon} />
            </button>
            {trialEndsAt && (
              <span className={styles.note}>
                Your free trial runs until {fmtDate(trialEndsAt)}.
              </span>
            )}
          </div>
        </form>
      </Panel>
    </>
  );
}
