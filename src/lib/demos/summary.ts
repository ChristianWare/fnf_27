// The morning previews email: what prospects did in their previews in the
// last day, previews ending in the next 3 days (the expiry warning),
// previews still unopened after 2 days, and ones that just ended.

import { esc } from "@/lib/server/email";
import { url } from "@/lib/server/config";
import { daysBetween, fmtDay } from "@/lib/dashboard/format";
import { eventsSummary, type PlatformDemo } from "./preview";

const DAY = 86_400_000;
/** The expiry warning: this many days before the end, and every day after. */
export const WARN_DAYS = 3;
/** Unopened this long and it's worth a follow-up. */
const UNOPENED_DAYS = 2;

type Line = { demo: PlatformDemo; text: string };
type Section = { title: string; lines: Line[]; after?: string };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function previewsSummary(demos: PlatformDemo[], now: Date) {
  /** Calendar days left, in Arizona: ending Friday is 2 days on a Wednesday. */
  const left = (d: PlatformDemo) => daysBetween(now, d.expiresAt);
  const live = demos.filter((d) => d.status === "live");

  const active = live.filter((d) => d.events?.length);
  const ending = live.filter((d) => left(d) <= WARN_DAYS).sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  const unopened = live.filter(
    (d) =>
      !d.firstOpenedAt &&
      now.getTime() - new Date(d.createdAt).getTime() >= UNOPENED_DAYS * DAY &&
      !ending.includes(d),
  );
  const ended = demos.filter(
    (d) => d.status === "expired" && now.getTime() - new Date(d.expiresAt).getTime() < 1.5 * DAY,
  );

  const sections: Section[] = [
    {
      title: "In their previews since yesterday",
      lines: active.map((demo) => ({ demo, text: `${eventsSummary(demo.events ?? [])}.` })),
    },
    {
      title: `Ending in the next ${WARN_DAYS} days`,
      lines: ending.map((demo) => {
        const days = left(demo);
        return {
          demo,
          text: `ends ${fmtDay(demo.expiresAt)} (${days <= 1 ? "tomorrow" : `in ${days} days`}). ${
            demo.views ? `Opened, ${plural(demo.views, "page view")} in all.` : "Never opened."
          }`,
        };
      }),
      after: "Give one 14 more days from their page, or text them before it goes.",
    },
    {
      title: "Not opened yet",
      lines: unopened.map((demo) => {
        const days = Math.floor((now.getTime() - new Date(demo.createdAt).getTime()) / DAY);
        return { demo, text: `made ${days} days ago. Worth a follow-up text.` };
      }),
    },
    {
      title: "Ended",
      lines: ended.map((demo) => ({
        demo,
        text: `ended ${fmtDay(demo.expiresAt)}${demo.views ? ` after ${plural(demo.views, "page view")}` : ", never opened"}.`,
      })),
    },
  ].filter((s) => s.lines.length);

  if (!sections.length) return null;

  const subject = active.length
    ? `${plural(active.length, "prospect")} used their preview`
    : ending.length === 1
      ? `${ending[0].business}'s preview ends ${left(ending[0]) <= 1 ? "tomorrow" : `in ${left(ending[0])} days`}`
      : ending.length
        ? `${ending.length} previews end this week`
        : unopened.length
          ? `${plural(unopened.length, "preview")} not opened yet`
          : `${plural(ended.length, "preview")} ended`;

  const link = (d: PlatformDemo) => (d.ref ? url(`/admin/prospects/${d.ref}`) : url("/admin/demos"));
  const html = sections
    .map(
      (s) =>
        `<p style="margin:24px 0 8px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.2px;color:#6b6b70;">${esc(s.title)}</p>` +
        s.lines
          .map(
            (l) =>
              `<p style="margin:0 0 10px;font-size:16px;line-height:1.6;color:#3d3d40;"><a href="${esc(link(l.demo))}" style="color:#0d0d0e;font-weight:700;">${esc(l.demo.business)}</a>: ${esc(l.text)}</p>`,
          )
          .join("") +
        (s.after
          ? `<p style="margin:4px 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">${esc(s.after)}</p>`
          : ""),
    )
    .join("");
  const text = sections
    .map((s) =>
      [s.title.toUpperCase(), ...s.lines.map((l) => `• ${l.demo.business}: ${l.text}`), ...(s.after ? [s.after] : [])].join(
        "\n",
      ),
    )
    .join("\n\n");

  return {
    subject,
    counts: { active: active.length, ending: ending.length, unopened: unopened.length, ended: ended.length },
    content: {
      eyebrow: fmtDay(now),
      heading: "Your previews this morning",
      paragraphs: [],
      blocks: { html: `${html}<div style="height:16px;"></div>`, text },
      button: { label: "Open Previews", href: url("/admin/demos") },
    },
  };
}
