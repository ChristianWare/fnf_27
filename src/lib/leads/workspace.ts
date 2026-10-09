// Everything one client's Leads Tool needs: their settings, the accounts
// and events in their market, and the leads they've saved.
//
// SAMPLE: built from the sample market and a few saved leads per sample
// client. After the move, the settings and saved leads come from the
// database and the market from the nightly jobs.

import { leadsAccess, type LeadsAccess } from "@/lib/dashboard/helpers";
import { LEADS } from "@/lib/dashboard/plans";
import type { Client } from "@/lib/dashboard/types";
import { CATEGORIES, EVENT_TYPES } from "./catalog";
import { CITIES, azAt, sampleAccounts, sampleEvents } from "./market";
import type {
  AccountCategory,
  Account,
  ActivityKind,
  EventLead,
  EventType,
  LeadActivity,
  LeadsSettings,
  SavedLead,
} from "./types";

export type LeadsWorkspace = {
  now: string;
  access: Exclude<LeadsAccess, "NONE">;
  trialEndsAt?: string;
  monthly: number;
  settings: LeadsSettings;
  accounts: Account[];
  events: EventLead[];
  saved: SavedLead[];
};

const OPERATORS: Record<
  string,
  { fleet: string; strength: string; website?: string; radius: number }
> = {
  "desert-star": {
    fleet: "three Escalade ESVs, two Suburbans and a 14-passenger Sprinter",
    strength: "corporate accounts and resort transfers",
    website: "desertstar.example",
    radius: 30,
  },
  "mesa-executive": {
    fleet: "two Escalades and a Mercedes Sprinter",
    strength: "airport runs and East Valley weddings",
    radius: 25,
  },
  gilbert: {
    fleet: "a Cadillac XT6, two Suburbans and a stretch Chrysler 300",
    strength: "weddings, proms and nights out",
    radius: 30,
  },
  flagstaff: {
    fleet: "two Suburbans on snow tires",
    strength: "airport runs from the high country and Sedona day trips",
    radius: 60,
  },
  "saguaro-sedan": {
    fleet: "four Lincoln Navigators and a Sprinter",
    strength: "Scottsdale resorts and golf weekends",
    radius: 30,
  },
};

function settingsFor(client: Client): LeadsSettings {
  const city = client.city.split(",")[0].trim();
  const base = CITIES[city] ? city : "Phoenix";
  const op = OPERATORS[client.id];
  return {
    base: { city: base, ...CITIES[base] },
    radius: op?.radius ?? 50,
    categories: Object.keys(CATEGORIES) as AccountCategory[],
    eventTypes: Object.keys(EVENT_TYPES) as EventType[],
    morningEmail: true,
    operator: {
      company: client.business,
      name: client.contact.name,
      fleet: op?.fleet ?? "black SUVs and sedans",
      strength: op?.strength ?? "airport runs and events",
      phone: client.contact.phone,
      website: op?.website ?? client.website?.domain,
    },
  };
}

/* ── Saved leads ── */

type Step = [days: number, kind: ActivityKind, text: string];

function saved(
  now: Date,
  targetId: string,
  stage: SavedLead["stage"],
  steps: Step[],
  extra: Partial<SavedLead> = {},
): SavedLead {
  const activity: LeadActivity[] = steps.map(([days, kind, text], i) => {
    const at = azAt(now, -days, 9 + (i % 6), 10 * i);
    return {
      id: `${targetId}-${i}`,
      // Nothing happens in the future, even early in the morning.
      at: new Date(at) > now ? now.toISOString() : at,
      kind,
      text,
    };
  });
  return {
    targetId,
    stage,
    savedAt: activity[0]?.at ?? now.toISOString(),
    activity: activity.reverse(),
    ...extra,
  };
}

function sampleSaved(clientId: string, now: Date): SavedLead[] {
  const on = (days: number, hour = 9) => azAt(now, days, hour);
  switch (clientId) {
    case "desert-star":
      return [
        saved(
          now,
          "copper-canyon-suites",
          "WON",
          [
            [70, "SAVED", "Saved from Find"],
            [70, "FOUND", "Found Aisha Patel, Director of Sales"],
            [69, "EMAIL", "Sent the intro email"],
            [62, "CALL", "Talked with Aisha. She wants a guest rate sheet."],
            [62, "STAGE", "Moved to Talking"],
            [
              40,
              "WON",
              "Won, about $1,800 a month. The concierge desk books through us now.",
            ],
          ],
          { value: 1800, per: "MONTH", wonAt: on(-40) },
        ),
        saved(
          now,
          "harlow-vance",
          "WON",
          [
            [50, "SAVED", "Saved from Find"],
            [50, "FOUND", "Found Patricia Gomez, Office Manager"],
            [49, "EMAIL", "Sent the intro email"],
            [43, "TEXT", "Followed up by text"],
            [41, "MET", "Coffee with Patricia and one of the partners"],
            [20, "WON", "Won, about $900 a month for court and airport runs."],
          ],
          { value: 900, per: "MONTH", wonAt: on(-20) },
        ),
        saved(
          now,
          "valley-heart-ball",
          "TALKING",
          [
            [14, "SAVED", "Saved from Today"],
            [14, "FOUND", "Found Monica Reyes, Development Director"],
            [13, "EMAIL", "Sent the intro email"],
            [
              6,
              "CALL",
              "Monica wants a quote for 12 sponsor cars and rides home.",
            ],
            [6, "STAGE", "Moved to Talking"],
          ],
          { remindAt: on(0, 10) },
        ),
        saved(
          now,
          "ironwood-ballroom",
          "CONTACTED",
          [
            [9, "SAVED", "Saved from Find"],
            [9, "FOUND", "Found Victor Huang, Events Manager"],
            [6, "EMAIL", "Sent the intro email"],
          ],
          { remindAt: on(-1) },
        ),
        saved(now, "sun-corridor-health", "NEW", [
          [0, "SAVED", "Saved from Today"],
          [0, "FOUND", "Found Greg Lawson, Executive Assistant to the CEO"],
        ]),
        saved(
          now,
          "arizona-tech-summit",
          "CONTACTED",
          [
            [5, "SAVED", "Saved from Find"],
            [5, "FOUND", "Found Jordan Ellis, Event Manager"],
            [5, "EMAIL", "Sent the intro email"],
          ],
          { remindAt: on(2) },
        ),
        saved(now, "ahwatukee-ridge", "NOT_NOW", [
          [30, "SAVED", "Saved from Find"],
          [
            25,
            "CALL",
            "They use their own vans. Check back before tournament season.",
          ],
          [25, "STAGE", "Moved to Not now"],
        ]),
        saved(
          now,
          "desert-classic-auction",
          "NEW",
          [
            [2, "SAVED", "Saved from Find"],
            [2, "FOUND", "Found Ryan Cole, VIP Bidder Relations"],
          ],
          { remindAt: on(5) },
        ),
      ];
    case "mesa-executive":
      return [
        saved(
          now,
          "mesa-riverview",
          "CONTACTED",
          [
            [6, "SAVED", "Saved from Find"],
            [
              6,
              "FOUND",
              "Found Derek Owens, General Manager (email not verified)",
            ],
            [5, "EMAIL", "Sent the intro email"],
          ],
          { remindAt: on(0) },
        ),
        saved(
          now,
          "mesa-arts-gala",
          "NEW",
          [
            [1, "SAVED", "Saved from Today"],
            [1, "FOUND", "Found Grace Okafor, Event Chair"],
          ],
          { remindAt: on(0) },
        ),
        saved(
          now,
          "apex-aerospace",
          "TALKING",
          [
            [7, "SAVED", "Saved from Find"],
            [7, "FOUND", "Found Mike Delgado, Office Manager"],
            [7, "EMAIL", "Sent the intro email"],
            [
              5,
              "CALL",
              "Mike asked for a corporate rate sheet and our insurance certificate.",
            ],
            [5, "STAGE", "Moved to Talking"],
          ],
          { remindAt: on(1) },
        ),
        saved(now, "evergreen-desert", "NEW", [
          [2, "SAVED", "Saved from Find"],
          [2, "FOUND", "Found Robert Hayes, Funeral Director"],
        ]),
        saved(
          now,
          "harmony-grove",
          "WON",
          [
            [8, "SAVED", "Saved from Find"],
            [8, "FOUND", "Found Diane Foster, Life Enrichment Director"],
            [8, "EMAIL", "Sent the intro email"],
            [
              6,
              "CALL",
              "Diane wants a standing weekly run for residents' appointments.",
            ],
            [
              3,
              "MET",
              "Met Diane at the community and walked through the plan.",
            ],
            [1, "WON", "Won, about $600 a month."],
          ],
          { value: 600, per: "MONTH", wonAt: on(-1) },
        ),
      ];
    case "gilbert":
      return [
        saved(
          now,
          "sonoran-bloom",
          "WON",
          [
            [60, "SAVED", "Saved from Find"],
            [60, "FOUND", "Found Rachel Moreno, Venue Director"],
            [59, "EMAIL", "Sent the intro email"],
            [52, "MET", "Toured the venue with Rachel"],
            [
              35,
              "WON",
              "Won, on their preferred vendor list. About $1,200 a month.",
            ],
          ],
          { value: 1200, per: "MONTH", wonAt: on(-35) },
        ),
        saved(
          now,
          "gilbert-business-awards",
          "CONTACTED",
          [
            [4, "SAVED", "Saved from Find"],
            [4, "FOUND", "Found Kevin Marsh, Events Director"],
            [4, "EMAIL", "Sent the intro email"],
          ],
          { remindAt: on(1) },
        ),
        saved(
          now,
          "harmony-grove",
          "TALKING",
          [
            [12, "SAVED", "Saved from Find"],
            [12, "FOUND", "Found Diane Foster, Life Enrichment Director"],
            [11, "EMAIL", "Sent the intro email"],
            [7, "CALL", "Diane is comparing two services. Sending references."],
            [7, "STAGE", "Moved to Talking"],
          ],
          { remindAt: on(0) },
        ),
        saved(now, "chandler-fashion-suites", "NEW", [
          [1, "SAVED", "Saved from Today"],
        ]),
        saved(
          now,
          "winter-lights-gala",
          "NEW",
          [
            [3, "SAVED", "Saved from Find"],
            [3, "FOUND", "Found Heather Quinn, Development Director"],
          ],
          { remindAt: on(3) },
        ),
      ];
    case "saguaro-sedan":
      return [
        saved(
          now,
          "desert-classic-auction",
          "TALKING",
          [
            [20, "SAVED", "Saved from Find"],
            [20, "FOUND", "Found Ryan Cole, VIP Bidder Relations"],
            [19, "EMAIL", "Sent the intro email"],
            [12, "CALL", "Ryan wants cars for 30 VIP bidders all week."],
            [12, "STAGE", "Moved to Talking"],
          ],
          { remindAt: on(0) },
        ),
        saved(
          now,
          "pinnacle-peak-cc",
          "CONTACTED",
          [
            [10, "SAVED", "Saved from Find"],
            [10, "FOUND", "Found Steve Morrison, Director of Membership"],
            [9, "EMAIL", "Sent the intro email"],
          ],
          { remindAt: on(-2) },
        ),
        saved(now, "camelback-grand", "NOT_NOW", [
          [40, "SAVED", "Saved from Find"],
          [
            38,
            "CALL",
            "Their house car covers short trips. Try again before conference season.",
          ],
          [38, "STAGE", "Moved to Not now"],
        ]),
      ];
    default:
      return [];
  }
}

/** The Leads Tool for a client who has it, or undefined. */
export function leadsWorkspace(
  client: Client,
  nowIso: string,
): LeadsWorkspace | undefined {
  const access = leadsAccess(client);
  if (access === "NONE") return undefined;
  const now = new Date(nowIso);
  const yesterday = now.getTime() - 86_400_000;
  return {
    now: nowIso,
    access,
    trialEndsAt: client.leads.trialEndsAt,
    monthly: LEADS.monthly,
    settings: settingsFor(client),
    accounts: sampleAccounts(now),
    events: sampleEvents(now).filter(
      (e) => new Date(e.endDate ?? e.date).getTime() >= yesterday,
    ),
    saved: sampleSaved(client.id, now),
  };
}
