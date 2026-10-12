// The sample report on /audit/sample: a real audit an admin picked on
// Admin → Audits, shown with every name, address and number that could
// identify the operator taken out. Server only.

import { getSetting, setSetting } from "@/lib/data/write";
import { getAudit } from "./store";
import { toView } from "./view";

const KEY = "audit_sample";

export async function sampleId() {
  return (await getSetting<string | null>(KEY)) ?? undefined;
}

export const setSampleId = (id: string | null) => setSetting(KEY, id);

/** The sample, ready to show, or undefined when none is picked. */
export async function sampleView() {
  const id = await sampleId();
  if (!id) return undefined;
  const row = await getAudit(id);
  if (!row || row.status !== "DONE") return undefined;
  return toView(row, { sample: true });
}
