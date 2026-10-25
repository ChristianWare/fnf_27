"use client";

// The first time someone opens the Leads Tool: their state (only states
// where we have an area), their city in it, and how far they'll drive,
// with "All of Arizona" where we cover the whole state. A city outside our
// areas can use the nearest one, or ask us to open theirs.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "../icons";
import { Empty, PageHead, Panel, ui } from "../ui/ui";
import { useAction } from "../useAction";
import AreaPicker, { type AreaChoice } from "./AreaPicker";
import { setUpLeads } from "@/app/dashboard/leads/actions";
import { fmtDate } from "@/lib/dashboard/format";
import { radiiFor, radiusLabel, STATEWIDE_MILES } from "@/lib/leads/areas";
import type { LeadsArea } from "@/lib/leads/types";
import styles from "./Setup.module.css";

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
  const [choice, setChoice] = useState<AreaChoice | null>(null);
  const [radius, setRadius] = useState(50);
  // The state on its own is enough to offer "All of Arizona".
  const [state, setState] = useState(
    new Set(areas.map((a) => a.state)).size === 1 ? areas[0].state : "",
  );
  const radii = radiiFor(choice?.state ?? state);
  // "All of Arizona" picked, then a state without it: back to 50.
  const reach = radii.includes(radius) ? radius : 50;

  const start = () => {
    if (!choice || pending || readOnly) return;
    run(
      () =>
        setUpLeads({
          areaId: choice.area.id,
          city: choice.city?.text,
          radius: reach,
        }),
      () => {
        router.refresh();
        return {
          message: `Your leads around ${choice.city?.name ?? choice.area.city}`,
          detail: choice.area.ready
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
            <h2 className={styles.title}>Where do you work?</h2>
            <p className={styles.text}>
              Your leads are the businesses and events around your city. You
              can change this anytime in Lead settings.
            </p>
          </div>

          <AreaPicker
            areas={areas}
            onChange={setChoice}
            onState={setState}
            disabled={readOnly}
            idPrefix='leads-setup'
          />

          <div className={ui.field}>
            <span className={ui.label}>How far you&apos;ll drive</span>
            <div className={ui.chips} role='radiogroup' aria-label='Radius'>
              {radii.map((r) => (
                <button
                  key={r}
                  type='button'
                  role='radio'
                  aria-checked={reach === r}
                  className={ui.chip}
                  onClick={() => setRadius(r)}
                >
                  {radiusLabel(r, choice?.state ?? state)}
                </button>
              ))}
            </div>
            {reach === STATEWIDE_MILES && (
              <span className={styles.note}>
                Every lead in the state, closest to you first.
              </span>
            )}
          </div>

          <div className={styles.actions}>
            <button
              type='submit'
              className={`${ui.btn} ${ui.btn_black}`}
              disabled={!choice || pending || readOnly}
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
