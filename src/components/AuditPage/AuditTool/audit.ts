// The shape of an automatic audit's result, for the results view
// (AuditResults). Not shown yet: today the audit is asked for on the page
// and done by hand (lib/audit.ts). When the automatic audit is built, it
// returns an AuditResult and the page shows it with AuditResults.

import type { ComponentType, SVGProps } from "react";
import Analytics from "@/components/shared/icons/Analytics/Analytics";
import Location from "@/components/shared/icons/Location/Location";
import Speedometer from "@/components/shared/icons/Speedometer/Speedometer";
import Cursor from "@/components/shared/icons/Cursor/Cursor";
import Multiple from "@/components/shared/icons/Multiple/Multiple";
import LightBulb from "@/components/shared/icons/LightBulb/LightBulb";

export type CheckId =
  "google" | "profile" | "speed" | "booking" | "pages" | "ai";

export type Check = {
  id: CheckId;
  name: string;
  passed: boolean;
  /** What the audit found, in one line. */
  found: string;
  /** Why it matters, in one line. Shown for the top three. */
  why: string;
};

export type AuditRequest = {
  name: string;
  url: string;
  email: string;
};

export type AuditResult = AuditRequest & {
  score: number;
  checks: Check[];
};

export const checkIcons: Record<
  CheckId,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  google: Analytics,
  profile: Location,
  speed: Speedometer,
  booking: Cursor,
  pages: Multiple,
  ai: LightBulb,
};

// The three failed checks costing the most, in the order the checks run.
export function topThree(result: AuditResult) {
  return result.checks.filter((check) => !check.passed).slice(0, 3);
}
