// A client's blueprint as a .md file: write it anywhere, upload it on
// their Blueprint tab, or download what's there to edit. Safe anywhere.
//
//   # Home                                a page
//   Path: /                               its address
//   Purpose: Turn a local search into a booking.
//   Keyword: black car service phoenix    the search it's written for
//
//   ## Hero                               a section on that page
//   Phoenix's on-time black car service.  its copy: one paragraph per
//                                         block, a blank line between
//   Second paragraph…
//
// Uploading again keeps every section whose wording didn't change exactly
// as it was (approved, with its comments); rewritten sections go back to
// the client to read again.

import type { BlueprintPage } from "./types";

export type BlueprintDraft = {
  name: string;
  path: string;
  purpose: string;
  keyword?: string;
  sections: { title: string; copy: string[] }[];
};

export type ParsedBlueprint = {
  pages: BlueprintDraft[];
  /** Problems worth fixing, with the line they're on. */
  errors: string[];
  sections: number;
};

const slug = (text: string) =>
  `/${text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;

/** Reads the .md into pages and sections. */
export function parseBlueprint(markdown: string): ParsedBlueprint {
  const pages: BlueprintDraft[] = [];
  const errors: string[] = [];
  let page: BlueprintDraft | undefined;
  let section: { title: string; copy: string[] } | undefined;
  // The paragraph being read: lines run together until a blank line.
  let para: string[] = [];

  const endPara = () => {
    if (section && para.length) section.copy.push(para.join(" ").trim());
    para = [];
  };

  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  lines.forEach((raw, index) => {
    const line = raw.trim();
    const at = `Line ${index + 1}`;

    if (!line) {
      endPara();
      return;
    }

    const h2 = /^##\s+(.+)$/.exec(line);
    if (h2) {
      endPara();
      if (!page) {
        errors.push(`${at}: a section (##) needs a page (#) above it.`);
        return;
      }
      section = { title: h2[1].trim().slice(0, 120), copy: [] };
      page.sections.push(section);
      return;
    }

    const h1 = /^#\s+(.+)$/.exec(line);
    if (h1) {
      endPara();
      section = undefined;
      const name = h1[1].trim().slice(0, 80);
      page = { name, path: "", purpose: "", sections: [] };
      pages.push(page);
      return;
    }

    // Page details, before its first section.
    const detail = /^(path|purpose|keyword)\s*:\s*(.*)$/i.exec(line);
    if (detail && page && !section) {
      const [, key, value] = detail;
      const v = value.trim();
      if (key.toLowerCase() === "path")
        page.path = (v.startsWith("/") ? v : `/${v}`).slice(0, 120);
      else if (key.toLowerCase() === "purpose") page.purpose = v.slice(0, 300);
      else page.keyword = v.slice(0, 120) || undefined;
      return;
    }

    if (!page) {
      errors.push(
        `${at}: text before the first page. Start with a page, like: # Home`,
      );
      return;
    }
    if (!section) {
      // Plain text under a page heading reads as its purpose.
      page.purpose = `${page.purpose} ${line}`.trim().slice(0, 300);
      return;
    }
    // Copy. Markdown list dashes and emphasis are kept as written.
    para.push(line);
  });
  endPara();

  for (const p of pages) {
    if (!p.path) p.path = p.name.toLowerCase() === "home" ? "/" : slug(p.name);
    if (!p.sections.length)
      errors.push(`"${p.name}" has no sections. Add one with ## under it.`);
    const titles = p.sections.map((s) => s.title.toLowerCase());
    const twice = titles.find((t, i) => titles.indexOf(t) !== i);
    if (twice)
      errors.push(
        `"${p.name}" has two sections called "${twice}". Give each its own name.`,
      );
  }
  const names = pages.map((p) => p.name.toLowerCase());
  const twice = names.find((n, i) => names.indexOf(n) !== i);
  if (twice) errors.push(`Two pages are called "${twice}". Name each its own.`);
  if (!pages.length)
    errors.unshift("No pages found. Start each page with #, like: # Home");
  if (pages.length > 40) errors.push("That's more than 40 pages. Split it up.");

  return {
    pages,
    errors,
    sections: pages.reduce((n, p) => n + p.sections.length, 0),
  };
}

/** The blueprint as a .md file, in the format parseBlueprint reads. */
export function blueprintToMarkdown(pages: BlueprintPage[]) {
  const out: string[] = [];
  for (const page of pages) {
    out.push(`# ${page.name}`);
    out.push(`Path: ${page.path}`);
    if (page.purpose) out.push(`Purpose: ${page.purpose}`);
    if (page.keyword) out.push(`Keyword: ${page.keyword}`);
    out.push("");
    for (const section of page.sections) {
      out.push(`## ${section.title}`);
      for (const line of section.copy) out.push(line, "");
      if (!section.copy.length) out.push("");
    }
  }
  return `${out.join("\n").trim()}\n`;
}
