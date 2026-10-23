// Your own questions for one client, written as a .md file and uploaded
// on their Files tab. They replace the standard questionnaire (another
// industry, say) or are added after it. Safe anywhere.
//
// The format, one question per line:
//
//   # About your practice                 a new section
//   A few basics for your homepage.       intro text under it
//
//   - What's the name of your practice? *               * = required
//   - What services do you offer? [long]                a big text box
//   - Do you accept insurance? [Yes | No | Some plans]  pick one
//   - Which do you want on the site? [Booking, Reviews, Blog] (multi)
//   - Your email [email]       also [phone] and [link]
//   > A line starting with > under a question is its help text.
//
// Each question's id comes from its wording, so re-uploading a file with
// a typo fixed elsewhere keeps the answers to the questions that didn't
// change.

import {
  questionnaireFor,
  type Question,
  type QuestionSection,
} from "./questionnaire";
import type { Client } from "./types";

export type CustomQuestions = {
  /** The file as uploaded. */
  markdown: string;
  fileName: string;
  /** Replace the standard questions, or add these after them. */
  mode: "replace" | "add";
  uploadedAt: string;
};

export type Parsed = {
  sections: QuestionSection[];
  /** Problems worth fixing, with the line they're on. */
  errors: string[];
  count: number;
};

const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

/** Reads the .md into sections of questions. */
export function parseQuestions(markdown: string): Parsed {
  const sections: QuestionSection[] = [];
  const errors: string[] = [];
  const ids = new Set<string>();
  let last: Question | undefined;

  const current = () => {
    if (!sections.length)
      sections.push({
        id: "custom_1",
        title: "A few more questions",
        intro: "",
        questions: [],
      });
    return sections[sections.length - 1];
  };

  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  lines.forEach((raw, index) => {
    const line = raw.trim();
    const at = `Line ${index + 1}`;
    if (!line) return;

    // A section.
    const heading = /^#{1,3}\s+(.+)$/.exec(line);
    if (heading) {
      sections.push({
        id: `custom_${sections.length + 1}`,
        title: heading[1].trim().slice(0, 120),
        intro: "",
        questions: [],
      });
      last = undefined;
      return;
    }

    // Help text for the question above.
    if (line.startsWith(">")) {
      const help = line.replace(/^>\s*/, "").slice(0, 500);
      if (last) last.help = last.help ? `${last.help} ${help}` : help;
      else errors.push(`${at}: help text (>) needs a question above it.`);
      return;
    }

    // A question.
    const item = /^(?:[-*•]|\d+[.)])\s+(.+)$/.exec(line);
    if (item) {
      let text = item[1].trim();
      let required = false;
      let multi = false;
      let type: Question["type"] = "text";
      let options: string[] | undefined;

      if (/\(multi\)/i.test(text)) {
        multi = true;
        text = text.replace(/\(multi\)/gi, "").trim();
      }
      if (/\*\s*$/.test(text)) {
        required = true;
        text = text.replace(/\s*\*\s*$/, "").trim();
      }
      // [long], [email], [phone], [link], or [A | B | C] options.
      for (const match of [...text.matchAll(/\[([^\]]*)\]/g)]) {
        const inside = match[1].trim();
        const word = inside.toLowerCase();
        if (word === "long") type = "textarea";
        else if (word === "email") type = "email";
        else if (word === "phone") type = "tel";
        else if (word === "link" || word === "url") type = "url";
        else {
          const list = inside
            .split(/\s*[|,]\s*/)
            .map((o) => o.trim())
            .filter(Boolean)
            .slice(0, 30);
          if (list.length < 2)
            errors.push(
              `${at}: choices need at least two options, like [Yes | No].`,
            );
          else options = list.map((o) => o.slice(0, 120));
        }
      }
      // Required can also come before the brackets: "Question * [long]".
      text = text.replace(/\[[^\]]*\]/g, "").trim();
      if (/\*\s*$/.test(text)) {
        required = true;
        text = text.replace(/\s*\*\s*$/, "").trim();
      }
      if (options) type = multi ? "multi" : "choice";
      else if (multi)
        errors.push(`${at}: (multi) needs options in brackets to pick from.`);

      if (!text) {
        errors.push(`${at}: this question has no wording.`);
        return;
      }

      const base = `md_${slug(text) || "question"}`;
      let id = base;
      for (let n = 2; ids.has(id); n++) id = `${base}_${n}`;
      ids.add(id);

      last = {
        id,
        label: text.slice(0, 300),
        type,
        ...(options ? { options } : {}),
        ...(required ? { required } : {}),
      };
      current().questions.push(last);
      return;
    }

    // Plain text: the intro of the section it's in.
    const section = current();
    if (section.questions.length === 0) {
      section.intro = section.intro ? `${section.intro} ${line}` : line;
    } else if (last) {
      // Text after a question reads as its help.
      last.help = last.help ? `${last.help} ${line}` : line;
    }
  });

  const kept = sections.filter((s) => s.questions.length > 0);
  for (const s of sections)
    if (!s.questions.length && s.title !== "A few more questions")
      errors.push(`"${s.title}" has no questions under it.`);
  const count = kept.reduce((n, s) => n + s.questions.length, 0);
  if (!count)
    errors.unshift(
      "No questions found. Start each question with a dash, like: - What's your business name?",
    );
  if (count > 150) errors.push("That's more than 150 questions. Split it up.");

  return { sections: kept, errors, count };
}

/**
 * The questions this client sees: the standard ones for their plan, theirs
 * from an uploaded file instead, or both. A file that no longer reads
 * falls back to the standard questions.
 */
export function questionsFor(client: Client): QuestionSection[] {
  const standard = questionnaireFor(client.website?.plan ?? "WEBSITE_ONLY");
  const custom = client.customQuestions;
  if (!custom) return standard;
  const { sections } = parseQuestions(custom.markdown);
  if (!sections.length) return standard;
  return custom.mode === "replace" ? sections : [...standard, ...sections];
}

/**
 * A client outside the limo world: their own questions replace the
 * standard ones, so the build steps and the tour skip rides and fleets.
 */
export const isGeneralClient = (client: Pick<Client, "customQuestions">) =>
  client.customQuestions?.mode === "replace";
