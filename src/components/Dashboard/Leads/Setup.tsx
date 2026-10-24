"use client";

// The first time someone opens the Leads Tool: which of our areas they
// work in, where in it (optional), and how far they'll drive. Only the
// areas we've opened are on offer, so nobody can start a new market.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "../icons";
import { Empty, PageHead, Panel, ui } from "../ui/ui";
import { useAction } from "../useAction";
import CityPicker, {
  type PickedCity,
} from "@/components/shared/CityPicker/CityPicker";
import { setUpLeads } from "@/app/dashboard/leads/actions";
import { fmtDate } from "@/lib/dashboard/format";
import type { LeadsArea } from "@/lib/leads/types";
import styles from "./Setup.module.css";

const RADII = [10, 25, 50, 75];

export default function Setup({
  areas,
  trialEndsAt,
  readOnly,
}: {
  areas: LeadsArea[];
  trialEndsAt?: string;
  /** An admin viewing as the client: look, don't touch. */
  readOnly?: boolean;
}) {
  const router = useRouter();
  const { run, pending } = useAction();
  const [areaId, setAreaId] = useState(areas.length === 1 ? areas[0].id : "");
  const [city, setCity] = useState<PickedCity | null>(null);
  const [radius, setRadius] = useState(50);
  const area = areas.find((a) => a.id === areaId);

  const start = () => {
    if (!area || pending || readOnly) return;
    run(
      () => setUpLeads({ areaId: area.id, city: city?.text, radius }),
      () => {
        router.refresh();
        return {
          message: `Your leads around ${city?.name ?? area.city}`,
          detail: area.ready
            ? "They're ready now."
            : "This area's first load takes about half an hour.",
        };
      },
    );
  };

  const head = (
    <PageHead
      crumb='Leads'
      title='Leads Tool'
      text='The hotels, venues, companies and events near you that book rides, every morning.'
    />
  );

  if (!areas.length) {
    return (
      <>
        {head}
        <Panel>
          <Empty
            icon='target'
            title='Opening soon'
            text="We're not covering any areas right now. Message us and we'll let you know as soon as yours opens."
          />
        </Panel>
      </>
    );
  }

  return (
    <>
      {head}
      <Panel>
        <form
          className={styles.setup}
          onSubmit={(e) => {
            e.preventDefault();
            start();
          }}
        >
          <div className={styles.titles}>
            <span className={ui.monoMuted}>Before your first leads</span>
            <h2 className={styles.title}>Which area do you work in?</h2>
            <p className={styles.text}>
              These are the areas the Leads Tool covers right now. You can
              change it anytime in Lead settings.
            </p>
          </div>

          <div className={styles.areas} role='radiogroup' aria-label='Area'>
            {areas.map((a) => (
              <button
                key={a.id}
                type='button'
                role='radio'
                aria-checked={a.id === areaId}
                className={`${styles.area} ${a.id === areaId ? styles.areaOn : ""}`}
                onClick={() => {
                  setAreaId(a.id);
                  setCity(null);
                }}
              >
                <span className={styles.areaName}>{a.name}</span>
                <span className={styles.areaNote}>
                  {a.ready ? "Leads ready now" : "First load in progress"}
                </span>
              </button>
            ))}
          </div>

          {area && (
            <div className={ui.field}>
              <label className={ui.label} htmlFor='leads-setup-city'>
                Where are you based in it? (optional)
              </label>
              <CityPicker
                key={area.id}
                id='leads-setup-city'
                area={area.id}
                inputClassName={ui.input}
                placeholder={`e.g. ${area.city}, or a city nearby`}
                onPick={setCity}
                disabled={readOnly}
              />
              <span className={styles.note}>
                Leads are sorted by distance from here. Skip it and we use the
                center of the {area.name}.
              </span>
            </div>
          )}

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
              disabled={!area || pending || readOnly}
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
