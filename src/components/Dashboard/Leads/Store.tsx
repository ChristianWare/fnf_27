"use client";

// The Leads Tool's state, shared by every leads page so a lead saved on
// Find shows up on Today and in the Pipeline straight away.
//
// SAMPLE: changes last until you reload. After the move, each action here
// calls a server action that saves it, and saving a lead looks up the
// decision-maker (Apollo) and writes the scripts (AI) on the server.

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { followUpAfter, locate } from "@/lib/leads/advice";
import { stageOf } from "@/lib/leads/catalog";
import type { LeadsWorkspace } from "@/lib/leads/workspace";
import type {
  Account,
  ActivityKind,
  EventLead,
  LeadActivity,
  LeadStage,
  LeadsSettings,
  Located,
  SavedLead,
} from "@/lib/leads/types";
import { money } from "@/lib/dashboard/format";

type Outreach = "EMAIL" | "TEXT" | "CALL" | "MET";

type Leads = Omit<LeadsWorkspace, "accounts" | "events" | "saved"> & {
  accounts: Located<Account>[];
  events: Located<EventLead>[];
  saved: SavedLead[];
  target: (id: string) => Located | undefined;
  savedFor: (id: string) => SavedLead | undefined;
  save: (id: string, from: string) => SavedLead | undefined;
  remove: (id: string) => void;
  setStage: (id: string, stage: LeadStage) => void;
  remind: (id: string, at?: string) => void;
  /** Logs outreach and returns when to follow up. */
  log: (id: string, how: Outreach, text?: string) => string;
  note: (id: string, text: string) => void;
  win: (id: string, value: number, per: "MONTH" | "ONCE") => void;
  updateSettings: (settings: LeadsSettings) => void;
};

const LeadsContext = createContext<Leads | null>(null);

export function useLeads() {
  const leads = useContext(LeadsContext);
  if (!leads) throw new Error("useLeads needs a LeadsProvider");
  return leads;
}

const logText: Record<Outreach, string> = {
  EMAIL: "Sent an email",
  TEXT: "Sent a text",
  CALL: "Called",
  MET: "Met in person",
};

export function LeadsProvider({
  workspace,
  children,
}: {
  workspace: LeadsWorkspace;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState(workspace.settings);
  const [saved, setSaved] = useState(workspace.saved);

  const accounts = useMemo(
    () => locate(workspace.accounts, settings.base),
    [workspace.accounts, settings.base],
  );
  const events = useMemo(
    () => locate(workspace.events, settings.base),
    [workspace.events, settings.base],
  );

  const value = useMemo<Leads>(() => {
    const target = (id: string): Located | undefined =>
      accounts.find((a) => a.id === id) ?? events.find((e) => e.id === id);

    const entry = (kind: ActivityKind, text: string): LeadActivity => ({
      id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      kind,
      text,
    });

    const update = (id: string, change: (lead: SavedLead) => SavedLead) =>
      setSaved((list) =>
        list.map((lead) => (lead.targetId === id ? change(lead) : lead)),
      );

    return {
      ...workspace,
      settings,
      accounts,
      events,
      saved,
      target,
      savedFor: (id) => saved.find((lead) => lead.targetId === id),

      save: (id, from) => {
        const t = target(id);
        if (!t || saved.some((lead) => lead.targetId === id)) return undefined;
        // The decision-maker is looked up as soon as a lead is saved.
        const found = t.contact
          ? entry(
              "FOUND",
              `Found ${t.contact.name}, ${t.contact.title}${t.contact.verified ? "" : " (email not verified)"}`,
            )
          : entry(
              "FOUND",
              "No one found yet. Call the main line and ask who handles transportation.",
            );
        const lead: SavedLead = {
          targetId: id,
          stage: "NEW",
          savedAt: new Date().toISOString(),
          activity: [found, entry("SAVED", `Saved from ${from}`)],
        };
        setSaved((list) => [lead, ...list]);
        return lead;
      },

      remove: (id) =>
        setSaved((list) => list.filter((lead) => lead.targetId !== id)),

      setStage: (id, stage) =>
        update(id, (lead) =>
          lead.stage === stage
            ? lead
            : {
                ...lead,
                stage,
                remindAt:
                  stage === "WON" || stage === "NOT_NOW"
                    ? undefined
                    : lead.remindAt,
                activity: [
                  entry("STAGE", `Moved to ${stageOf(stage).label}`),
                  ...lead.activity,
                ],
              },
        ),

      remind: (id, at) => update(id, (lead) => ({ ...lead, remindAt: at })),

      log: (id, how, text) => {
        const at = followUpAfter(how, new Date().toISOString());
        update(id, (lead) => ({
          ...lead,
          stage: lead.stage === "NEW" ? "CONTACTED" : lead.stage,
          remindAt: at,
          activity: [
            entry(
              how,
              text?.trim() ? `${logText[how]}: ${text.trim()}` : logText[how],
            ),
            ...lead.activity,
          ],
        }));
        return at;
      },

      note: (id, text) =>
        update(id, (lead) => ({
          ...lead,
          activity: [entry("NOTE", text.trim()), ...lead.activity],
        })),

      win: (id, amount, per) =>
        update(id, (lead) => ({
          ...lead,
          stage: "WON",
          value: amount,
          per,
          wonAt: new Date().toISOString(),
          remindAt: undefined,
          activity: [
            entry(
              "WON",
              `Won, about ${money(amount)}${per === "MONTH" ? " a month" : ""}.`,
            ),
            ...lead.activity,
          ],
        })),

      updateSettings: setSettings,
    };
  }, [workspace, settings, accounts, events, saved]);

  return (
    <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>
  );
}
