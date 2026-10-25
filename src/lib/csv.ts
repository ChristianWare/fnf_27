// Reading a CSV (or a tab-separated paste) into rows. Quotes, commas and
// line breaks inside quotes, a byte-order mark and Windows line endings
// are all handled. Safe anywhere.

/** The rows of a CSV, each a list of cells. Blank lines are dropped. */
export function parseCsv(text: string, delimiter?: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const sep =
    delimiter ??
    // A paste from a spreadsheet comes tab-separated.
    ((src.split("\n", 1)[0].match(/\t/g)?.length ?? 0) >
    (src.split("\n", 1)[0].match(/,/g)?.length ?? 0)
      ? "\t"
      : src.split("\n", 1)[0].includes(";") && !src.split("\n", 1)[0].includes(",")
        ? ";"
        : ",");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"' && cell === "") quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows.map((r) => r.map((x) => x.trim()));
}

/** A header, made easy to match: "Search Volume" → "searchvolume". */
export const headerKey = (h: string) =>
  h.toLowerCase().replace(/[^a-z0-9%]+/g, "");

/** "1,234", "$1.2K", "12%", "n/a" → a number, or 0. */
export function num(value: string | undefined): number {
  if (!value) return 0;
  const v = value.replace(/[$,%\s]/g, "");
  const m = v.match(/^(-?\d*\.?\d+)([kmb])?$/i);
  if (!m) return 0;
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[m[2]?.toLowerCase() as "k"] ?? 1;
  return Number(m[1]) * mult;
}
