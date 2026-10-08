// The plans, prices and links the dashboard uses. The prices match the
// pricing page (ComparePlans).

import type { PlanId } from "./types";

export const PLANS: Record<
  PlanId,
  { name: string; monthly: number; setup: number; blurb: string }
> = {
  FULL_PLATFORM: {
    name: "Full Platform",
    monthly: 499,
    setup: 500,
    blurb: "Your website with booking, dispatch and the Leads Tool built in.",
  },
  WEBSITE_ONLY: {
    name: "Website Only",
    monthly: 199,
    setup: 500,
    blurb: "A custom website built to rank, with hosting and edits.",
  },
};

export const LEADS = { name: "Leads Tool", monthly: 125, trialDays: 30 };

export const CALENDAR = "https://calendly.com/chris-ware-dev/discovery-call";
export const SUPPORT_EMAIL = "hello@fontsandfooters.com";

// The Leads Tool still runs on the current site. When it moves here, point
// the sidebar at the new page instead.
export const LEADS_TOOL_URL =
  "https://www.fontsandfooters.com/dashboard/leads/search";
