// The free website audit, the parts any page can use: how soon the score
// shows, the six checks' names, and reading the website someone typed. The
// audit itself (checks, scoring, the run) is in the files beside this one,
// and runs on the server. Safe anywhere.

import { CHECK_IDS, CHECKS } from "./kinds";

/** How soon the score shows. The page, the FAQ and the pricing cards say it. */
export const RESULTS_IN = "about a minute";

/** The six checks, in the order the audit goes through them. */
export const AUDIT_CHECKS = CHECK_IDS.map((id) => CHECKS[id].name);

/**
 * A website as typed ("yourcompany.com", "www.yourcompany.com" or a full
 * address) as a full address, or null if it isn't one.
 */
export function cleanUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 300) return null;
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

/** The site's name without the www, for subject lines. */
export const hostOf = (url: string) =>
  new URL(url).hostname.replace(/^www\./, "");
