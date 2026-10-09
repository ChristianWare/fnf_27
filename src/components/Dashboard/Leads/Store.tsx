"use client";

// The Leads Tool's state, shared by every leads page so a lead saved on
// Find shows up on Today and in the Pipeline straight away. Each change
// is saved on the server; small ones show at once and undo themselves if
// the save fails.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../Toast/Toast";
import { locate } from "@/lib/leads/advice";
import { stageOf } from "@/lib/leads/catalog";
import {
  addLeadNote,
  logOutreach,
  markWon,
  removeLead,
  rewriteScripts,
  saveLead,
  saveLeadSettings,
  setLeadStage,
  setReminder,
  type LeadsWhere,
} from "@/app/dashboard/leads/actions";
import type {
  Account,
  Contact,
  EventLead,
  LeadStage,
  LeadsSettings,
  LeadsWorkspace,
  Located,
  SavedLead,
} from "@/lib/leads/types";

type Outreach = "EMAIL" | "TEXT" | "CALL" | "MET";

type Leads = Omit<LeadsWorkspace, "accounts" | "events" | "saved"> & {
  /** Where these pages live: "/dashboard/leads" or "/admin/leads". */
  href: (path?: string) => string;
  where: LeadsWhere;
  /** An admin viewing a client's tool: nothing can change. */
  readOnly: boolean;
  accounts: Located<Account>[];
  events: Located<EventLead>[];
  saved: SavedLead[];
  /** Leads being saved right now. */
  saving: string[];
  target: (id: string) => Located | undefined;
  savedFor: (id: string) => SavedLead | undefined;
  save: (
    id: string,
    from: string,
  ) => Promise<{ lead: SavedLead; contact?: Contact } | undefined>;
  remove: (id: string) => Promise<boolean>;
  setStage: (id: string, stage: LeadStage) => Promise<boolean>;
  remind: (id: string, at?: string) => Promise<boolean>;
  /** Logs outreach and returns when to follow up. */
  log: (
    id: string,
    how: Outreach,
    text?: string,
  ) => Promise<string | undefined>;
  note: (id: string, text: string) => Promise<boolean>;
  win: (id: string, value: number, per: "MONTH" | "ONCE") => Promise<boolean>;
  rewrite: (id: string) => Promise<boolean>;
  /** Saves them, and gives back what was saved (the base found, say). */
  updateSettings: (
    settings: LeadsSettings,
  ) => Promise<LeadsSettings | undefined>;
};

const LeadsContext = createContext<Leads | null>(null);

export function useLeads() {
  const leads = useContext(LeadsContext);
  if (!leads) throw new Error("useLeads needs a LeadsProvider");
  return leads;
}

const VIEWING =
  "You're viewing as this client, so nothing here can be changed.";

export function LeadsProvider({
  workspace,
  base,
  where,
  readOnly = false,
  children,
}: {
  workspace: LeadsWorkspace;
  base: string;
  where: LeadsWhere;
  readOnly?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const [from, setFrom] = useState(workspace);
  const [settings, setSettings] = useState(workspace.settings);
  const [saved, setSaved] = useState(workspace.saved);
  const [accountList, setAccountList] = useState(workspace.accounts);
  const [eventList, setEventList] = useState(workspace.events);
  const [saving, setSaving] = useState<string[]>([]);

  // Fresh data from the server (after a new base, say) replaces ours.
  if (from !== workspace) {
    setFrom(workspace);
    setSettings(workspace.settings);
    setSaved(workspace.saved);
    setAccountList(workspace.accounts);
    setEventList(workspace.events);
  }

  const accounts = useMemo(
    () => locate(accountList, settings.base),
    [accountList, settings.base],
  );
  const events = useMemo(
    () => locate(eventList, settings.base),
    [eventList, settings.base],
  );

  const problem = useCallback(
    (error: string) => toast(error, { tone: "error" }),
    [toast],
  );

  const value = useMemo<Leads>(() => {
    const target = (id: string): Located | undefined =>
      accounts.find((a) => a.id === id) ?? events.find((e) => e.id === id);

    const update = (id: string, change: (lead: SavedLead) => SavedLead) =>
      setSaved((list) =>
        list.map((lead) => (lead.targetId === id ? change(lead) : lead)),
      );

    /** Shows a change now; puts it back if the server says no. */
    const optimistic = async (
      id: string,
      change: (lead: SavedLead) => SavedLead,
      send: () => Promise<{ ok: boolean; error?: string }>,
    ) => {
      if (readOnly) {
        problem(VIEWING);
        return false;
      }
      const before = saved;
      update(id, change);
      const result = await send().catch(() => ({
        ok: false,
        error: "Couldn't save that. Check your connection and try again.",
      }));
      if (!result.ok) {
        setSaved(before);
        problem(result.error ?? "Couldn't save that.");
        return false;
      }
      return true;
    };

    const withEntry = (id: string, entry: SavedLead["activity"][number]) =>
      update(id, (lead) =>
        lead.activity.some((a) => a.id === entry.id)
          ? lead
          : { ...lead, activity: [entry, ...lead.activity] },
      );

    return {
      ...workspace,
      href: (path = "") => (path ? `${base}/${path}` : base),
      where,
      readOnly,
      settings,
      accounts,
      events,
      saved,
      saving,
      target,
      savedFor: (id) => saved.find((lead) => lead.targetId === id),

      save: async (id, place) => {
        if (readOnly) {
          problem(VIEWING);
          return undefined;
        }
        if (saving.includes(id) || saved.some((l) => l.targetId === id))
          return undefined;
        setSaving((list) => [...list, id]);
        try {
          const result = await saveLead(where, id, place);
          if (!result.ok) {
            problem(result.error);
            return undefined;
          }
          const { lead, contact } = result.data!;
          setSaved((list) =>
            list.some((l) => l.targetId === id) ? list : [lead, ...list],
          );
          // Who to contact shows once it's saved.
          const reveal = <T extends Account | EventLead>(list: T[]) =>
            list.map((t) =>
              t.id === id ? { ...t, contact, contactReady: undefined } : t,
            );
          setAccountList(reveal);
          setEventList(reveal);
          return { lead, contact };
        } catch {
          problem("Couldn't save that lead. Try again.");
          return undefined;
        } finally {
          setSaving((list) => list.filter((x) => x !== id));
        }
      },

      remove: async (id) => {
        if (readOnly) {
          problem(VIEWING);
          return false;
        }
        const result = await removeLead(where, id).catch(() => undefined);
        if (!result?.ok) {
          problem(result && !result.ok ? result.error : "Couldn't remove it.");
          return false;
        }
        setSaved((list) => list.filter((lead) => lead.targetId !== id));
        const hide = <T extends Account | EventLead>(list: T[]) =>
          list.map((t) =>
            t.id === id && t.contact
              ? {
                  ...t,
                  contact: undefined,
                  contactReady: Boolean(t.contact.email),
                }
              : t,
          );
        setAccountList(hide);
        setEventList(hide);
        return true;
      },

      setStage: (id, stage) =>
        optimistic(
          id,
          (lead) => ({
            ...lead,
            stage,
            remindAt: stage === "NOT_NOW" ? undefined : lead.remindAt,
            value: undefined,
            per: undefined,
            wonAt: undefined,
            activity: [
              {
                id: `pending-${Date.now()}`,
                at: new Date().toISOString(),
                kind: "STAGE",
                text: `Moved to ${stageOf(stage).label}`,
              },
              ...lead.activity,
            ],
          }),
          async () => {
            const result = await setLeadStage(where, id, stage);
            if (result.ok) {
              update(id, (lead) => ({
                ...lead,
                activity: [
                  result.data!.entry,
                  ...lead.activity.filter((a) => !a.id.startsWith("pending-")),
                ],
              }));
            }
            return result;
          },
        ),

      remind: (id, at) =>
        optimistic(
          id,
          (lead) => ({ ...lead, remindAt: at }),
          () => setReminder(where, id, at ?? null),
        ),

      log: async (id, how, text) => {
        if (readOnly) {
          problem(VIEWING);
          return undefined;
        }
        const result = await logOutreach(where, id, how, text).catch(
          () => undefined,
        );
        if (!result?.ok) {
          problem(result && !result.ok ? result.error : "Couldn't log that.");
          return undefined;
        }
        const { entry, remindAt } = result.data!;
        update(id, (lead) => ({
          ...lead,
          stage: lead.stage === "NEW" ? "CONTACTED" : lead.stage,
          remindAt,
        }));
        withEntry(id, entry);
        return remindAt;
      },

      note: async (id, text) => {
        if (readOnly) {
          problem(VIEWING);
          return false;
        }
        const result = await addLeadNote(where, id, text).catch(
          () => undefined,
        );
        if (!result?.ok) {
          problem(
            result && !result.ok ? result.error : "Couldn't add that note.",
          );
          return false;
        }
        withEntry(id, result.data!.entry);
        return true;
      },

      win: async (id, amount, per) => {
        if (readOnly) {
          problem(VIEWING);
          return false;
        }
        const result = await markWon(where, id, amount, per).catch(
          () => undefined,
        );
        if (!result?.ok) {
          problem(result && !result.ok ? result.error : "Couldn't save that.");
          return false;
        }
        update(id, (lead) => ({
          ...lead,
          stage: "WON",
          value: amount,
          per,
          wonAt: result.data!.wonAt,
          remindAt: undefined,
        }));
        withEntry(id, result.data!.entry);
        return true;
      },

      rewrite: async (id) => {
        if (readOnly) {
          problem(VIEWING);
          return false;
        }
        const result = await rewriteScripts(where, id).catch(() => undefined);
        if (!result?.ok) {
          problem(
            result && !result.ok ? result.error : "Couldn't rewrite them.",
          );
          return false;
        }
        update(id, (lead) => ({ ...lead, scripts: result.data!.scripts }));
        return true;
      },

      updateSettings: async (next) => {
        if (readOnly) {
          problem(VIEWING);
          return undefined;
        }
        const result = await saveLeadSettings(where, next).catch(
          () => undefined,
        );
        if (!result?.ok) {
          problem(
            result && !result.ok
              ? result.error
              : "Couldn't save your settings.",
          );
          return undefined;
        }
        setSettings(result.data!.settings);
        // A new base: the server works out what's in reach from there.
        if (result.data!.moved) router.refresh();
        return result.data!.settings;
      },
    };
  }, [
    workspace,
    base,
    where,
    readOnly,
    settings,
    accounts,
    events,
    saved,
    saving,
    problem,
    router,
  ]);

  return (
    <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>
  );
}
