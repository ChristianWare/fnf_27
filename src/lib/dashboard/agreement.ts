// The documents a client signs in the dashboard. PLACEHOLDER: plain-language
// drafts that follow the Terms of Service; have a lawyer review them before
// real clients sign.

import type { DocBlock, PlanId } from "./types";
import { PLANS } from "./plans";

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

export function serviceAgreement(business: string, plan: PlanId): DocBlock[] {
  const info = PLANS[plan];
  const full = plan === "FULL_PLATFORM";

  return [
    {
      heading: "Who this is between",
      text: `This agreement is between Fonts & Footers, of Phoenix, Arizona ("we"), and ${business} ("you"), for the ${info.name} plan.`,
    },
    {
      heading: "What we build and run",
      text: full
        ? "A custom website for your business with an SEO foundation and pages for the rides and places riders search for, plus the booking, dispatch, driver and admin software, flight tracking, payments through your own Stripe account, and the Leads Tool. Hosting, security, backups and edits are included."
        : "A custom website for your business with an SEO foundation and pages for the rides and places riders search for. Your Book now buttons link to the booking system you use today. Hosting, security, backups and edits are included.",
    },
    {
      heading: "Fees",
      text: `A one-time setup fee of ${money(info.setup)}, due before work starts and not refundable once work has begun. Then ${money(info.monthly)} a month, charged on the 1st of each month, starting the 1st after the setup fee is paid. There are no per-booking fees.`,
    },
    {
      heading: "Changes",
      text: "Change requests are unlimited while your plan is active. Most are done within two business days; bigger additions are scheduled with you first.",
    },
    {
      heading: "Your content and your domain",
      text: "Your name, logo, photos, text, prices, customer list and domain are yours. The design system, code and software are ours, and you use them as part of your plan.",
    },
    {
      heading: "Cancelling",
      text: "There is no long-term contract. Cancel anytime by email or from your dashboard; it takes effect at the end of that month, and we will export your content and data on request.",
    },
    {
      heading: "The rest",
      text: "Arizona law applies. The Terms of Service at fontsandfooters.com/terms are part of this agreement.",
    },
  ];
}

export function profileAccess(business: string): DocBlock[] {
  return [
    {
      heading: "What this allows",
      text: `You give Fonts & Footers manager access to the Google Business Profile for ${business}, so we can post updates, add photos, answer questions and keep your hours, services and booking link current.`,
    },
    {
      heading: "What it doesn't",
      text: "You stay the owner. We can't delete the profile, transfer it or remove you, and we never reply to reviews without your say-so.",
    },
    {
      heading: "Ending it",
      text: "Remove our access anytime in your Google Business Profile settings, or ask us and we'll remove ourselves the same day.",
    },
  ];
}
