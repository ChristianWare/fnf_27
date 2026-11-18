// Sample previews, so the screens can be seen before the demo platform is
// built. Nothing here is real: no site exists at these links yet.

import { demoSlug, demoUrl, marketFor } from "./options";

export type PreviewStatus = "NOT_OPENED" | "OPENED" | "EXPIRING" | "EXPIRED";

export type PreviewEvent = { at: string; text: string };

export type PreviewView = {
  id: string;
  prospectId: string;
  business: string;
  contactName: string;
  phone: string;
  market: string;
  url: string;
  createdAt: string;
  expiresAt: string;
  status: PreviewStatus;
  views: number;
  firstOpenedAt: string | null;
  lastSeenAt: string | null;
  /** What they did, newest first. */
  events: PreviewEvent[];
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

type Seed = {
  id: string;
  business: string;
  contactName: string;
  phone: string;
  state: string;
};

/** The same sample, every time, for one prospect. `shape` picks how far
 *  along it is (0 to 3). */
export function samplePreview(p: Seed, now: Date, shape = 1): PreviewView {
  const t = now.getTime();
  const slug = demoSlug(p.business);
  const market = marketFor(p.state);
  const at = (msAgo: number) => new Date(t - msAgo).toISOString();
  const kinds: Omit<PreviewView, "id" | "prospectId" | "business" | "contactName" | "phone" | "market" | "url">[] = [
    {
      createdAt: at(3 * HOUR),
      expiresAt: new Date(t + 30 * DAY - 3 * HOUR).toISOString(),
      status: "NOT_OPENED",
      views: 0,
      firstOpenedAt: null,
      lastSeenAt: null,
      events: [],
    },
    {
      createdAt: at(2 * DAY),
      expiresAt: new Date(t + 28 * DAY).toISOString(),
      status: "OPENED",
      views: 4,
      firstOpenedAt: at(DAY + 5 * HOUR),
      lastSeenAt: at(2 * HOUR),
      events: [
        {
          at: at(2 * HOUR),
          text: `Made a test booking (${market.airports[0].name} to ${market.areas[0]})`,
        },
        { at: at(2 * HOUR + 600_000), text: "Logged into the admin" },
        { at: at(DAY + 4 * HOUR), text: "Browsed 6 pages on their phone" },
        { at: at(DAY + 5 * HOUR), text: "Opened it for the first time" },
      ],
    },
    {
      createdAt: at(27 * DAY),
      expiresAt: new Date(t + 3 * DAY).toISOString(),
      status: "EXPIRING",
      views: 2,
      firstOpenedAt: at(25 * DAY),
      lastSeenAt: at(9 * DAY),
      events: [
        { at: at(9 * DAY), text: "Browsed 3 pages" },
        { at: at(25 * DAY), text: "Opened it for the first time" },
      ],
    },
    {
      createdAt: at(34 * DAY),
      expiresAt: at(4 * DAY),
      status: "EXPIRED",
      views: 1,
      firstOpenedAt: at(33 * DAY),
      lastSeenAt: at(33 * DAY),
      events: [{ at: at(33 * DAY), text: "Opened it for the first time" }],
    },
  ];
  return {
    id: `sample-${p.id}`,
    prospectId: p.id,
    business: p.business,
    contactName: p.contactName,
    phone: p.phone,
    market: `${market.city}, ${market.state}`,
    url: demoUrl(slug),
    ...kinds[Math.max(0, Math.min(3, shape))],
  };
}

/** The text to send them, from your phone. */
export function previewText(p: { contactName: string; business: string; url: string }) {
  const first = p.contactName.split(/\s+/)[0];
  return `${first ? `Hi ${first}, ` : ""}it's Chris from Fonts & Footers. Here's the preview I put together for ${p.business}: ${p.url}. It's yours to click around for the next 30 days.`;
}
