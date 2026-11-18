// What the prospects pages show for each prospect: the row, their audit's
// score, and whether the Leads Tool covers their area. Shared by the list
// (Admin → Prospects) and each prospect's own page.

import { inArray } from "drizzle-orm";
import { db, schema as s } from "@/db";
import type { Tone } from "@/components/Dashboard/ui/ui";
import { statewide, stateName } from "@/lib/leads/areas";
import { openAreas } from "@/lib/leads/workspace";
import type { CallOutcome, ProspectStage } from "./kinds";
import type { ProspectRow } from "./store";

export type ProspectView = {
  id: string;
  business: string;
  contactName: string;
  phone: string;
  email: string;
  website: string;
  mapsUrl: string;
  city: string;
  state: string;
  list: string;
  tags: string[];
  notes: string;
  rating: number | null;
  reviews: number | null;
  stage: ProspectStage;
  tries: number;
  calls: number;
  nextAt: string | null;
  lastCalledAt: string | null;
  lastOutcome: CallOutcome | null;
  clientId: string | null;
  audit: { id: string; score: number | null } | null;
  inviteSentAt: string | null;
  coverage: { tone: Tone; label: string };
  createdAt: string;
};

export async function prospectViews(rows: ProspectRow[]): Promise<ProspectView[]> {
  const auditIds = rows.map((r) => r.auditId).filter((x): x is string => Boolean(x));
  const [audits, areas] = await Promise.all([
    auditIds.length
      ? db
          .select({ id: s.audits.id, score: s.audits.score, status: s.audits.status })
          .from(s.audits)
          .where(inArray(s.audits.id, auditIds))
      : Promise.resolve([]),
    openAreas(),
  ]);
  const auditById = new Map(audits.map((a) => [a.id, a]));

  // Whether the Leads Tool has their area: the whole state, a city we
  // have an area for, or a state we don't cover yet.
  const coverage = (r: ProspectRow): ProspectView["coverage"] => {
    if (!r.state) return { tone: "gray", label: "Area unknown" };
    if (statewide(r.state)) return { tone: "lime", label: `Covered: all of ${stateName(r.state)}` };
    const inState = areas.filter((a) => a.state === r.state);
    if (!inState.length) return { tone: "red", label: `No leads in ${stateName(r.state)} yet` };
    const city = r.city?.toLowerCase();
    const match = inState.find((a) => a.city.toLowerCase().startsWith(city ?? "~"));
    return match
      ? { tone: "lime", label: `Covered: ${match.name}` }
      : { tone: "yellow", label: `Check: near ${inState.map((a) => a.name).join(" or ")}?` };
  };

  return rows.map((r) => {
    const audit = r.auditId ? auditById.get(r.auditId) : undefined;
    return {
      id: r.id,
      business: r.business,
      contactName: r.contactName ?? "",
      phone: r.phone ?? "",
      email: r.email ?? "",
      website: r.website ?? "",
      mapsUrl: r.mapsUrl ?? "",
      city: r.city ?? "",
      state: r.state ?? "",
      list: r.list ?? "",
      tags: r.tags,
      notes: r.notes,
      rating: r.rating,
      reviews: r.reviews,
      stage: r.stage,
      tries: r.tries,
      calls: r.calls,
      nextAt: r.nextAt?.toISOString() ?? null,
      lastCalledAt: r.lastCalledAt?.toISOString() ?? null,
      lastOutcome: r.lastOutcome,
      clientId: r.clientId,
      audit: audit
        ? { id: audit.id, score: audit.status === "DONE" ? audit.score : null }
        : null,
      inviteSentAt: r.inviteSentAt?.toISOString() ?? null,
      coverage: coverage(r),
      createdAt: r.createdAt.toISOString(),
    };
  });
}
