// What the Semrush numbers say, in plain sentences, for the report page
// and the PDF alike. Safe anywhere.

import type { SemrushData, SemrushKeyword } from "./types";

const n = (v: number) => Math.round(v).toLocaleString("en-US");
export const usd = (v: number) => `$${n(v)}`;
const pct = (part: number, whole: number) =>
  whole > 0 ? Math.round((part / whole) * 100) : 0;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-07" → "July 2026". */
export const monthName = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return MONTHS[mo - 1] ? `${MONTHS[mo - 1]} ${y}` : m;
};
/** "2026-07" → "Jul". */
export const monthShort = (m: string) => monthName(m).slice(0, 3);

/** "fabuloustransportation.com/events/sema-show/" → "/events/sema-show/". */
export const pagePath = (url: string) => {
  const p = url.replace(/^https?:\/\/(www\.)?/, "").replace(/^[^/]+/, "");
  return p || "/";
};

export type Insight = { title: string; text: string };

export function semrushInsights(data: SemrushData): Insight[] {
  const out: Insight[] = [];
  const p = data.positions;
  if (p) {
    out.push({
      title: "What Google sends you",
      text: `About ${n(p.traffic)} visits a month from ${n(p.keywords)} searches, with ${n(p.top10)} of them on page one. Bought as Google Ads, that traffic would cost about ${usd(p.value)} a month.`,
    });
    const money = pct(p.money.traffic, p.traffic);
    out.push({
      title: "Who those visitors are",
      text:
        p.traffic === 0
          ? "Almost nobody reaches the site from Google yet, so every ride search is room to grow."
          : money >= 50
            ? `${money}% of the visits come from people looking for a ride, which is the traffic that books. The job now is more of it.`
            : `Only ${money}% of the visits come from people looking for a ride. ${p.branded.traffic ? `${pct(p.branded.traffic, p.traffic)}% already know your name, and ` : ""}${pct(p.other.traffic, p.traffic)}% come from searches that rarely book a ride, like event dates and other businesses' names.`,
    });
    if (p.close.length) {
      const best = p.close[0];
      out.push({
        title: "The quickest wins",
        text: `${p.close.length === 12 ? "At least 12" : p.close.length} ride searches have you on page one or two, but below the top three, where most of the clicks go. The biggest is "${best.keyword}" (${n(best.volume)} searches a month, you're #${best.position}).`,
      });
    } else if (p.money.keywords === 0) {
      out.push({
        title: "The quickest wins",
        text: "The site doesn't show up for ride searches at all yet. Pages built around each service and city are the place to start.",
      });
    }
    if (p.aiOverview > 0 && p.keywords > 0)
      out.push({
        title: "Google's AI answers",
        text: `${pct(p.aiOverview, p.keywords)}% of your searches show Google's AI overview, which answers before anyone clicks. Pages with clear, quotable answers (rates, service areas, airports, vehicles) are the ones it cites.`,
      });
  }
  const t = data.trend;
  if (t && t.months.length) {
    const dir =
      t.change12 === undefined
        ? ""
        : t.change12 > 5
          ? `up ${t.change12}% on a year ago`
          : t.change12 < -5
            ? `down ${Math.abs(t.change12)}% on a year ago`
            : "about the same as a year ago";
    out.push({
      title: "Over time",
      text: `${dir ? `Traffic is ${dir}. ` : ""}${t.peak ? `The best month was ${monthName(t.peak.month)}, at about ${n(t.peak.traffic)} visits.` : ""}`.trim(),
    });
  }
  const c = data.competitors?.[0];
  if (c && p && c.traffic > p.traffic)
    out.push({
      title: "Who's ahead",
      text: `${c.domain} gets about ${n(c.traffic)} visits a month from Google, ${p.traffic ? `${Math.max(2, Math.round(c.traffic / Math.max(1, p.traffic)))} times yours` : "while you get almost none"}, and you share ${n(c.common)} searches.`,
    });
  const g = data.gap;
  if (g && g.missingCount)
    out.push({
      title: "Searches you're missing",
      text: `${n(g.missingCount)} searches have ${g.rivals.length === 1 ? g.rivals[0] : "the operators you were compared with"} in the top 20 and you nowhere${g.weakerCount ? `, and on ${n(g.weakerCount)} more they rank above you` : ""}.`,
    });
  const l = data.links;
  if (l)
    out.push({
      title: "Who links to you",
      text: `${n(l.domains)} sites link to you${l.follow !== undefined ? ` (${l.follow}% of the links count toward rankings)` : ""}.${l.spamCount ? ` ${n(l.spamCount)} look like spam. A few are normal, and Google mostly ignores them; a lot of them is worth cleaning up.` : " None look like spam."}`,
    });
  return out;
}

/** Where a keyword sits, in words: "#5 (page one)". */
export const placeOf = (k: Pick<SemrushKeyword, "position">) =>
  `#${k.position}${k.position <= 10 ? "" : " (page two)"}`;
