// Pictures and ticket prices, from whatever each source gives us: an
// event's own artwork, a website's share image, schema.org offers. Server
// only (the pages these read come through apis/http).

import { decodeEntities } from "./apis/http";

const PRIVATE =
  /^(localhost|.*\.local|.*\.internal|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/i;

/**
 * A picture address we're happy to show: https, public, not an icon.
 * Relative addresses are read against `base`.
 */
export function goodImage(value: unknown, base?: string): string | undefined {
  const raw =
    typeof value === "string"
      ? value
      : Array.isArray(value)
        ? value.find(
            (v) => typeof v === "string" || (v && typeof v === "object"),
          )
        : value && typeof value === "object"
          ? ((value as { url?: unknown; contentUrl?: unknown }).url ??
            (value as { contentUrl?: unknown }).contentUrl)
          : undefined;
  if (raw && typeof raw === "object") return goodImage(raw, base);
  if (typeof raw !== "string") return undefined;
  const text = decodeEntities(raw.trim());
  if (!text || text.startsWith("data:") || text.length > 1000) return undefined;
  let url: URL;
  try {
    url = base ? new URL(text, base) : new URL(text);
  } catch {
    return undefined;
  }
  // Plain http would be blocked on our https pages: ask for https.
  if (url.protocol === "http:") url.protocol = "https:";
  if (url.protocol !== "https:") return undefined;
  if (PRIVATE.test(url.hostname) || !url.hostname.includes("."))
    return undefined;
  if (/\.(ico|svg)(\?|$)|favicon|apple-touch-icon|sprite/i.test(url.pathname))
    return undefined;
  return url.toString();
}

/** The picture a page shares when it's linked: og:image, then twitter:image. */
export function shareImage(html: string, base: string) {
  const head = html.slice(0, 200_000);
  const meta = (attr: string, name: string) => {
    const re = new RegExp(
      `<meta\\b[^>]*${attr}\\s*=\\s*["']${name}["'][^>]*>`,
      "i",
    );
    const tag = re.exec(head)?.[0];
    return tag ? /content\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] : undefined;
  };
  const link = /<link\b[^>]*rel\s*=\s*["']image_src["'][^>]*>/i
    .exec(head)?.[0]
    ?.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
  for (const candidate of [
    meta("property", "og:image:secure_url"),
    meta("property", "og:image"),
    meta("name", "og:image"),
    meta("name", "twitter:image"),
    meta("property", "twitter:image"),
    link,
  ]) {
    const image = goodImage(candidate, base);
    if (image) return image;
  }
  return undefined;
}

/** "45.00", 45, "$45" → 45; anything else → undefined. */
const dollars = (value: unknown) => {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(/[$,\s]/g, ""))
        : NaN;
  return Number.isFinite(n) && n >= 0 && n < 100_000 ? n : undefined;
};

/** Ticket prices from schema.org offers (one offer, a list, or an aggregate). */
export function offerPrices(offers: unknown) {
  const list = (Array.isArray(offers) ? offers : [offers]).filter(
    (o): o is Record<string, unknown> => Boolean(o) && typeof o === "object",
  );
  const values: number[] = [];
  for (const o of list) {
    for (const key of ["lowPrice", "highPrice", "price"])
      if (o[key] !== undefined && o[key] !== null && o[key] !== "") {
        const n = dollars(o[key]);
        if (n !== undefined) values.push(n);
      }
  }
  if (!values.length) return undefined;
  return { min: Math.min(...values), max: Math.max(...values) };
}

/** "$109 – $3,203", "$45", "Free", or undefined when we don't know. */
export function priceText(minCents?: number | null, maxCents?: number | null) {
  if (minCents == null && maxCents == null) return undefined;
  const fmt = (cents: number) =>
    `$${(cents / 100).toLocaleString("en-US", {
      minimumFractionDigits: cents % 100 ? 2 : 0,
      maximumFractionDigits: 2,
    })}`;
  const min = minCents ?? maxCents!;
  const max = maxCents ?? minCents!;
  if (max === 0) return "Free";
  if (min === max) return fmt(max);
  if (min === 0) return `Free – ${fmt(max)}`;
  return `${fmt(min)} – ${fmt(max)}`;
}
