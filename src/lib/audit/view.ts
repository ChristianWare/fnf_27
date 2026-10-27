// An audit as the report pages draw it. Until they give an email, the page
// shows the score, the six checks' scores and headlines, and the top three;
// the details (every part, the proof, the searches, the operators near
// them, the phone screenshot) stay on the server. The sample report is a
// real audit with every name, address and number that could identify it
// taken out. Server only.

import { CHECK_IDS, CHECKS } from "./kinds";
import { bandOf, summaryOf, topThree } from "./score";
import type { AuditRow } from "./store";
import type { AuditView, CheckResult, Checks } from "./types";

const lock = (r: CheckResult): CheckResult => ({
  id: r.id,
  score: r.score,
  found: r.found,
  parts: [],
  ...(r.skipped ? { skipped: r.skipped } : {}),
});

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Quoted words of our own that never identify anyone. */
const GENERIC_QUOTES = new Set([
  "book now",
  "chauffeur service",
  "disallow: /",
  "discourage search engines",
  "limousine service",
  "noindex",
]);

/** Takes out anything that could identify the operator. */
function scrubber(row: AuditRow) {
  const names = [
    row.business,
    row.listing?.name,
    // What they typed, when it's a name or an address rather than one word.
    /[\s.]/.test(row.input.trim()) ? row.input.trim() : undefined,
    row.domain,
    row.domain?.replace(/\.[a-z]+$/, ""),
    row.listing?.address,
  ]
    .filter((n): n is string => Boolean(n && n.length > 2))
    .sort((a, b) => b.length - a.length);
  const rivals = (row.rivals ?? []).map((r) => r.name).filter(Boolean);
  const city = row.city?.toLowerCase();
  return (text: string) => {
    let out = text;
    for (const name of names)
      out = out.replace(new RegExp(escape(name), "gi"), "the operator");
    rivals.forEach((name, i) => {
      out = out.replace(
        new RegExp(escape(name), "gi"),
        `Operator ${"ABC"[i] ?? i + 1}`,
      );
    });
    return (
      out
        .replace(/https?:\/\/[^\s)"]+/g, (url) => {
          try {
            return new URL(url).pathname;
          } catch {
            return "";
          }
        })
        .replace(
          /\(?\b[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
          "(xxx) xxx-xxxx",
        )
        // Anything quoted from their site (a page title, say) goes; the
        // searches ("airport car service phoenix") and our own words stay.
        .replace(/"([^"]{1,200})"|“([^”]{1,200})”/g, (whole, a, b) => {
          const inner = String(a ?? b ?? "").trim();
          const search =
            inner === inner.toLowerCase() && city && inner.endsWith(city);
          return search ||
            GENERIC_QUOTES.has(inner.toLowerCase()) ||
            inner.includes("the operator")
            ? whole
            : '"…"';
        })
        .replace(/:\s*"…"(?=[.,;]|$)/g, "")
        .replace(/(^|[.!?]\s+)the operator/g, "$1The operator")
    );
  };
}

/**
 * A page or booking link, without the operator in it: the path on their
 * own site, or just the booking service's address.
 */
function scrubLink(row: AuditRow, label: string, scrub: (t: string) => string) {
  const m = label.match(/^([a-z0-9-]+(?:\.[a-z0-9-]+)+)(\/.*)?$/i);
  if (!m) return scrub(label);
  const host = m[1].replace(/^www\./i, "").toLowerCase();
  return host === row.domain ? scrub(m[2] || "/") : host;
}

function scrubChecks(
  row: AuditRow,
  checks: Checks,
  scrub: (t: string) => string,
): Checks {
  const out: Checks = {};
  for (const id of CHECK_IDS) {
    const r = checks[id];
    if (!r) continue;
    out[id] = {
      ...r,
      found: scrub(r.found),
      fix: r.fix ? scrub(r.fix) : undefined,
      notes: r.notes?.map(scrub),
      // Their own words, quoted from the site, aren't shown at all.
      parts: r.parts.map((p) => ({
        ...p,
        quote: undefined,
        found: scrub(p.found),
        proof: p.proof?.map((x) => ({
          label: x.href ? scrubLink(row, x.label, scrub) : scrub(x.label),
        })),
      })),
    };
  }
  return out;
}

export function toView(
  row: AuditRow,
  options: { admin?: boolean; sample?: boolean } = {},
): AuditView {
  const sample = Boolean(options.sample);
  const unlocked = Boolean(
    options.admin || sample || row.source === "ADMIN" || row.unlockedAt,
  );
  const scrub = sample ? scrubber(row) : (t: string) => t;
  const checks = sample ? scrubChecks(row, row.checks, scrub) : row.checks;
  const done = row.status === "DONE";
  const score = done ? row.score : null;
  const place =
    row.city && row.state
      ? `${row.city}, ${row.state}`
      : (row.city ?? undefined);

  return {
    id: row.id,
    status: row.status,
    steps: row.steps,
    source: row.source,
    business: sample
      ? `A ${row.city ?? "local"}-area operator`
      : row.business || row.listing?.name || row.domain || row.input,
    domain: sample ? undefined : (row.domain ?? undefined),
    url: sample ? undefined : (row.url ?? undefined),
    hasSite: Boolean(row.url),
    place,
    score,
    band: score !== null ? bandOf(score) : undefined,
    summary: score !== null ? summaryOf(score, Boolean(row.url)) : undefined,
    checks: CHECK_IDS.map((id) => {
      const result = checks[id];
      return {
        id,
        name: CHECKS[id].name,
        result: result ? (unlocked ? result : lock(result)) : undefined,
      };
    }),
    top: done ? topThree(checks) : [],
    searches: unlocked ? (row.searches ?? []) : [],
    rivals: unlocked
      ? (row.rivals ?? []).map((r, i) =>
          sample
            ? { ...r, name: `Operator ${"ABC"[i] ?? i + 1}`, domain: undefined }
            : r,
        )
      : [],
    listing:
      unlocked && row.listing
        ? {
            name: sample ? "Their listing" : row.listing.name,
            rating: row.listing.rating,
            reviews: row.listing.reviews,
            mapsUrl: sample ? undefined : row.listing.mapsUrl,
          }
        : undefined,
    phoneShot: unlocked && !sample ? (row.phoneShot ?? undefined) : undefined,
    unlocked,
    createdAt: row.createdAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString(),
    error:
      row.status === "FAILED" ? (row.error ?? "The audit stopped.") : undefined,
    sample,
    semrush:
      unlocked && !sample && row.semrush?.files.length ? row.semrush : undefined,
    compare:
      unlocked && !sample && row.compare?.show && row.compare.before && row.compare.after
        ? row.compare
        : undefined,
  };
}
