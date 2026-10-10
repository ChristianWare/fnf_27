// Where visitors come from, in five groups anyone can read, made from
// Plausible's channels ("Organic Search", "Direct"…). Each group keeps its
// color everywhere, in this order, so a group never changes color when
// another one is missing. Safe anywhere.

export type ChannelKey = "search" | "direct" | "social" | "referral" | "other";

export const CHANNELS: { key: ChannelKey; label: string; about: string }[] = [
  {
    key: "search",
    label: "Search",
    about: "Google, Bing and the other search engines",
  },
  {
    key: "direct",
    label: "Direct",
    about: "Typed your address, or used a saved link",
  },
  {
    key: "social",
    label: "Social media",
    about: "Facebook, Instagram, YouTube and the like",
  },
  {
    key: "referral",
    label: "Other websites",
    about: "Links to you on other sites",
  },
  {
    key: "other",
    label: "Ads and other",
    about: "Ads, emails and everything else",
  },
];

const GROUPS: Record<string, ChannelKey> = {
  "organic search": "search",
  direct: "direct",
  "organic social": "social",
  "organic video": "social",
  referral: "referral",
};

/** Plausible's channel → our group. Ads, email and the rest are "other". */
export function channelOf(name: string): ChannelKey {
  return GROUPS[name.trim().toLowerCase()] ?? "other";
}

export const channelLabel = (key: ChannelKey) =>
  CHANNELS.find((c) => c.key === key)?.label ?? key;
