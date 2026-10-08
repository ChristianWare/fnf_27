// The shape of an audit result, and a placeholder result to design against
// until the page is connected to the real audit.

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

export type AuditResult = {
  url: string;
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

// PLACEHOLDER. The sample report's numbers, returned for any URL until the
// real audit is connected. Swap this for the API call.
export async function runAudit(url: string): Promise<AuditResult> {
  await new Promise((resolve) => setTimeout(resolve, 1800));
  return {
    url,
    score: 41,
    checks: [
      {
        id: "booking",
        name: "Online booking",
        passed: false,
        found: "There's no way to book on the site. Riders have to call.",
        why: "Most riders book from a phone after hours, and a call they can't make right then goes to the next operator.",
      },
      {
        id: "pages",
        name: "The pages riders search for",
        passed: false,
        found: "No airport page, and no pages for the cities you serve.",
        why: "Riders search for the exact ride they need, and a site without a page for it doesn't show up.",
      },
      {
        id: "profile",
        name: "Your Google Business Profile",
        passed: false,
        found:
          "A home address shows on the profile, with no fleet photos and no hours.",
        why: "For local searches, the map listing brings more calls than the website, and riders judge it in seconds.",
      },
      {
        id: "google",
        name: "Google visibility",
        passed: false,
        found: "The site doesn't rank for car service searches in its city.",
        why: "If riders can't find you for the searches they make, every other fix matters less.",
      },
      {
        id: "speed",
        name: "Speed on a phone",
        passed: true,
        found: "Loads in 2.1 seconds on a phone connection.",
        why: "Riders leave slow sites before the booking button shows up.",
      },
      {
        id: "ai",
        name: "AI readability",
        passed: true,
        found: "Service areas and policies are readable as plain text.",
        why: "ChatGPT and Perplexity can only recommend what they can read.",
      },
    ],
  };
}
