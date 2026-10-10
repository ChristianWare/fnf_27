// The free website audit, as it runs today: an operator asks for one on
// /audit, the request lands in the studio inbox, and we check the site and
// the Google listing by hand and email the audit back. The automatic audit,
// with the score on the page, comes later; its results view is already in
// components/AuditPage/AuditResults. Safe anywhere.

/** How soon the audit comes back. The page, the FAQ and the toast say it. */
export const TURNAROUND = "two business days";

/** The six checks, in the order the audit goes through them. */
export const AUDIT_CHECKS = [
  "Google visibility",
  "Your Google Business Profile",
  "Speed on a phone",
  "Online booking",
  "The pages riders search for",
  "AI readability",
];

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
