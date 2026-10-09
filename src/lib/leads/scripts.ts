// The email, text and call opener for one lead, written by the AI for this
// client in their words. If the AI isn't set up or fails, the scripts are
// written from the catalog's notes instead. Server only.

import { aiReady, askJson } from "./apis/ai";
import { briefFor, eventDates, writeScripts } from "./advice";
import { CATEGORIES, EVENT_TYPES } from "./catalog";
import type { Who } from "./usage";
import type { LeadsSettings, Script, Target } from "./types";
import { fmtWeekday } from "@/lib/dashboard/format";

export async function scriptsFor(
  target: Target,
  settings: LeadsSettings,
  now: string,
  who: Who,
): Promise<Script> {
  const fallback = writeScripts(target, settings);
  if (!aiReady()) return fallback;
  const op = settings.operator;
  const angle =
    target.kind === "ACCOUNT"
      ? CATEGORIES[target.category]
      : EVENT_TYPES[target.type];
  const facts =
    target.kind === "ACCOUNT"
      ? [
          `Business: ${target.name}, ${angle.label.toLowerCase()} in ${target.city}.`,
          target.carService === "HAS"
            ? `They already offer: ${target.carServiceNote ?? "some guest transportation"}. Pitch being the backup for busy weekends and longer trips.`
            : target.carService === "NONE"
              ? "Their website shows no car service partner: you'd be the first."
              : "",
          target.news ? `In the news: ${target.news.title}` : "",
        ]
      : [
          `Event: ${target.name}, on ${fmtWeekday(target.date)} (${eventDates(target)}) at ${target.venue || "a venue"} in ${target.city}.`,
          target.organizer ? `Organizer: ${target.organizer}.` : "",
          target.guests
            ? `About ${target.guests.toLocaleString("en-US")} guests.`
            : "",
        ];
  const brief = briefFor(target, now)
    .map((line) => `${line.label}: ${line.text}`)
    .join("\n");
  try {
    const answer = await askJson<{
      subject: string;
      email: string;
      text: string;
      call: string;
    }>({
      model: "good",
      who,
      maxTokens: 1200,
      system:
        "You write outreach for owner-operators of black car and limousine services. Sound like a real local operator: warm, brief, specific, confident. No hype words, no exclamation marks, no emoji, no LinkedIn. Never invent facts, prices, awards or past clients.",
      prompt: `Write three scripts for reaching out to this lead.

The operator:
- Company: ${op.company}
- Name: ${op.name}
- Based in: ${settings.base.city}
- Fleet: ${op.fleet}
- Best at: ${op.strength}
- Phone: ${op.phone}${op.website ? `\n- Website: ${op.website}` : ""}

The lead:
${facts.filter(Boolean).join("\n")}
${target.contact ? `Writing to: ${target.contact.name}, ${target.contact.title}.` : `No contact name yet: write to the person who handles ${angle.audience === "companies" ? "travel" : "transportation"}, without a name.`}
${target.note ? `About them: ${target.note}` : ""}

The brief:
${brief}

What to offer first: ${angle.offer}.

1. subject: the email's subject line, under 60 characters.
2. email: the email body, 90 to 140 words, greeting first, signed with the operator's first name and then "${[op.company, op.phone, op.website].filter(Boolean).join(" · ")}" on the next line.
3. text: a text message under 300 characters.
4. call: a call opener (a few sentences in quotes), then one line for "If they already have someone:" and one for "If they're interested:", each with what to say in quotes.`,
      schema: {
        type: "object",
        properties: {
          subject: { type: "string" },
          email: { type: "string" },
          text: { type: "string" },
          call: { type: "string" },
        },
        required: ["subject", "email", "text", "call"],
      },
    });
    if (!answer?.email || !answer.subject || !answer.text || !answer.call)
      return fallback;
    return {
      email: { subject: answer.subject.trim(), body: answer.email.trim() },
      text: answer.text.trim().slice(0, 480),
      call: answer.call.trim(),
    };
  } catch (error) {
    console.error(`[leads] AI scripts for ${target.name} failed:`, error);
    return fallback;
  }
}
