// The guided tour a client sees the first time they sign in: one tour for
// each plan and stage, pointing at the sidebar items they actually have.
//
//   pending         Signed up for a website plan, waiting for approval
//   website:build   Website Only, before launch
//   platform:build  Full Platform, before launch
//   leads           The Leads Tool on its own
//   website:live    Website Only, the first visit after launch
//   platform:live   Full Platform, the first visit after launch
//
// A step points at a sidebar item by its href (the Shell marks each link
// with data-tour), at "fold" for Build history, or at nothing for a card
// in the middle of the screen. Steps whose item isn't in this client's
// sidebar are left out here, so nobody is pointed at a page they don't
// have. Whether they've seen a tour is kept on their account (tours.ts
// keys in users.notify, written by markTourSeen).

import type { NavGroup } from "@/components/Dashboard/Shell/nav";
import {
  awaitingApproval,
  isLive,
  leadsAccess,
  projectSteps,
} from "./helpers";
import { PLANS } from "./plans";
import type { Client } from "./types";

export const TOUR_IDS = [
  "pending",
  "website:build",
  "platform:build",
  "leads",
  "website:live",
  "platform:live",
] as const;

export type TourId = (typeof TOUR_IDS)[number];

/** The key in users.notify that says a tour has been seen. */
export const tourKey = (id: TourId) => `tour:${id}`;

export type TourStep = {
  /** A sidebar href, "fold", or none for a card in the middle. */
  target?: string;
  title: string;
  body: string;
};

export type Tour = {
  id: TourId;
  steps: TourStep[];
  /** The button on the last card: the first thing to do next. */
  finish: { label: string; href: string };
};

/** Every href (and the fold) in the sidebar. */
function targets(nav: NavGroup[]) {
  const set = new Set<string>();
  for (const group of nav) {
    for (const item of group.items) set.add(item.href);
    if (group.fold) set.add("fold");
  }
  return set;
}

/** The tour for this client right now, or none. */
export function tourFor(client: Client, nav: NavGroup[]): Tour {
  const have = targets(nav);
  const first = client.contact.name.split(" ")[0] || client.contact.name;
  const website = client.website;
  const access = leadsAccess(client);
  const keep = (steps: TourStep[]) =>
    steps.filter((step) => !step.target || have.has(step.target));

  const support: TourStep = {
    target: "/dashboard/support",
    title: "Support",
    body: "Message me directly about anything: your site, your plan, or a quick question. You'll get a reply here and by email, usually within one business day.",
  };
  const billing: TourStep = {
    target: "/dashboard/billing",
    title: "Billing",
    body: "Your plan, your card and your invoices. Monthly charges go out automatically on the 1st, and every invoice is here to download.",
  };
  const profile: TourStep = {
    target: "/dashboard/profile",
    title: "Profile",
    body: "Your name, email, password and which emails you get from us.",
  };

  // ── Signed up for a website plan, waiting for approval ──
  if (awaitingApproval(client)) {
    const asked =
      client.request?.plan === "FULL_PLATFORM"
        ? PLANS.FULL_PLATFORM.name
        : PLANS.WEBSITE_ONLY.name;
    return {
      id: "pending",
      steps: keep([
        {
          title: `Welcome, ${first}`,
          body: `Thanks for signing up for the ${asked}. We're reviewing your sign-up and setting up your plan, usually within one business day. Here's a quick look at what happens next.`,
        },
        {
          target: "/dashboard",
          title: "Dashboard",
          body: "Your home base. Right now it shows the plan you asked for. Once you're approved, your build steps appear here, with your next step always at the top.",
        },
        {
          target: "/dashboard/billing",
          title: "Billing, Support and Profile",
          body: "These open as soon as your account is approved, with your plan and prices set up for you.",
        },
        {
          title: "Watch your inbox",
          body: "You'll get an email from us when your account is approved. Sign back in then, and we'll walk you through your full dashboard.",
        },
      ]),
      finish: { label: "Got it", href: "/dashboard" },
    };
  }

  // ── The Leads Tool on its own ──
  if (!website) {
    const ready = have.has("/dashboard/leads/find");
    return {
      id: "leads",
      steps: keep([
        {
          title: `Welcome, ${first}`,
          body: "This is your Leads Tool: the hotels, venues, companies and events near you that book rides, found for you every morning. This quick tour shows you where everything is. It takes about a minute.",
        },
        {
          target: "/dashboard",
          title: "Dashboard",
          body: "Your home base. It shows what's new and what needs you today.",
        },
        ready
          ? {
              target: "/dashboard/leads",
              title: "Today",
              body: "Your leads for today, each scored out of 100, with the person to ask for and a script written for that business. Start at the top.",
            }
          : {
              target: "/dashboard/leads",
              title: "Leads Tool",
              body: "Open the Leads Tool here. Tell it where you're based and the kinds of businesses you want, and it finds them for you.",
            },
        {
          target: "/dashboard/leads/find",
          title: "Find leads",
          body: "Search for a specific kind of business, like hotels, wedding venues or law firms, anywhere in your market.",
        },
        {
          target: "/dashboard/leads/pipeline",
          title: "Pipeline",
          body: "Every business you've contacted, by stage: reached out, talking, won. Move them along as conversations happen, and you'll get a reminder when it's time to follow up.",
        },
        {
          target: "/dashboard/leads/settings",
          title: "Lead settings",
          body: "Where you're based, how far you'll drive and the kinds of businesses you want. The better this is, the better your leads.",
        },
        support,
        billing,
        {
          title: "That's the tour",
          body:
            access === "TRIAL"
              ? "Your free trial is running. The best way to see what it's worth: call one lead today."
              : "The best way to get value from it: call one lead today.",
        },
      ]),
      finish: { label: "Open your leads", href: "/dashboard/leads" },
    };
  }

  const platform = website.plan === "FULL_PLATFORM";
  // The Leads Tool comes with the Full Platform; Website Only clients
  // only hear about it if they already have it.
  const leadsSteps: TourStep[] =
    platform || access !== "NONE"
      ? [
          {
            target: "/dashboard/leads",
            title: "Leads Tool",
            body: platform
              ? "Included in your plan: the hotels, venues and companies near you that book rides, every morning, with who to ask for and what to say."
              : "Your Leads Tool: the hotels, venues and companies near you that book rides, every morning, with who to ask for and what to say.",
          },
        ]
      : [];

  // ── After launch: what changed ──
  if (isLive(client)) {
    const booking = platform ? website.bookingAdminUrl : undefined;
    return {
      id: platform ? "platform:live" : "website:live",
      steps: keep([
        {
          title: "Your site is live",
          body: `Congratulations, ${first}. Your dashboard has changed now that your site is up. Here's a quick look at what's new.`,
        },
        {
          target: "/dashboard",
          title: "Dashboard",
          body: "Your home base, now showing how your site is doing and anything that needs you.",
        },
        {
          target: "/dashboard/growth",
          title: "Growth",
          body: "Your visits, the searches people find you for, and the calls and clicks your site brings in. Give it a couple of weeks to fill in.",
        },
        {
          target: "/dashboard/website/changes",
          title: "Change requests",
          body: "Need a new photo, a price change or a new page? Ask here and we'll take care of it, usually within two business days. Edits are included in your plan.",
        },
        ...(booking
          ? [
              {
                target: booking,
                title: "Booking dashboard",
                body: "Where your rides run: new bookings, assigning drivers, flight tracking and payments. It opens in a new tab.",
              },
            ]
          : []),
        {
          target: "fold",
          title: "Build history",
          body: "Your questionnaire, brand assets, blueprint and design are kept here if you ever need them.",
        },
        ...leadsSteps,
        support,
        {
          title: "You're all set",
          body: "Check your Growth page in a couple of weeks to see your first numbers.",
        },
      ]),
      finish: { label: "See your Growth page", href: "/dashboard/growth" },
    };
  }

  // ── Before launch: the build, in order ──
  const next = projectSteps(client).find((step) => step.state === "you");
  return {
    id: platform ? "platform:build" : "website:build",
    steps: keep([
      {
        title: `Welcome, ${first}`,
        body: `This is your Fonts & Footers dashboard, where we build your new ${platform ? "website and booking system" : "website"} together. This quick tour shows you where everything is. It takes about a minute.`,
      },
      {
        target: "/dashboard",
        title: "Dashboard",
        body: "Your home base. Your next step always shows at the top of this page, so if you're ever unsure what to do, start here.",
      },
      {
        target: "/dashboard/website",
        title: "Project status",
        body: "Every step of your build in order, and whether it's waiting on you or on us. A number in the sidebar means something is waiting for you.",
      },
      {
        target: "/dashboard/website/documents",
        title: "Documents",
        body: "Sign your agreement here first. Nothing starts until it's signed, and a copy stays here for you.",
      },
      {
        target: "/dashboard/website/questionnaire",
        title: "Questionnaire",
        body: platform
          ? "About 20 minutes on your rides, your fleet and your brand. Your site's pages and wording come from these answers, and your booking system is set up from them. It saves as you go."
          : "About 20 minutes on your rides, your fleet and your brand, and the booking system you use now. Your site's pages and wording come from these answers. It saves as you go.",
      },
      {
        target: "/dashboard/website/assets",
        title: "Brand assets",
        body: "Upload your logo, vehicle photos and anything else we should use. Real photos of your cars make the biggest difference.",
      },
      {
        target: "/dashboard/website/blueprint",
        title: "Blueprint",
        body: "The page-by-page plan for your site. Read it, comment on anything you'd change, then approve it.",
      },
      {
        target: "/dashboard/website/design",
        title: "Design",
        body: "Pick the look you like best from the options we prepare for you.",
      },
      {
        target: "/dashboard/website/changes",
        title: "Change requests and Growth",
        body: "These unlock when your site goes live. You'll ask for edits here and see your traffic on Growth.",
      },
      ...leadsSteps,
      support,
      billing,
      profile,
      {
        title: "That's the tour",
        body: next
          ? `Your first step: ${next.title.charAt(0).toLowerCase()}${next.title.slice(1)}. You can take this tour again anytime from your dashboard.`
          : "You can take this tour again anytime from your dashboard.",
      },
    ]),
    finish: next?.href
      ? { label: next.title, href: next.href }
      : { label: "See your project status", href: "/dashboard/website" },
  };
}
