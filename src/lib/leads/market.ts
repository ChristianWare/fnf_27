// Places and times every leads page shares: the cities offered as a base,
// and Arizona time. Safe anywhere.

const DAY = 86_400_000;
const AZ = 7 * 3_600_000;

/** A time in Arizona, `days` from today. */
export function azAt(now: Date, days: number, hour = 9, minute = 0) {
  const local = new Date(now.getTime() - AZ);
  return new Date(
    Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate() + days,
      hour,
      minute,
    ) + AZ,
  ).toISOString();
}

/** This morning's 6:00 in Arizona, when the morning email goes out. */
export function lastRun(now: Date) {
  const today = azAt(now, 0, 6);
  return new Date(today) <= now
    ? today
    : new Date(new Date(today).getTime() - DAY).toISOString();
}

/**
 * What counts as "new this morning": found since the morning email before
 * last, but not in a market's very first run (everything is new then).
 */
export function newSince(now: Date, firstLoadedAt?: string) {
  const since = new Date(new Date(lastRun(now)).getTime() - DAY).toISOString();
  return firstLoadedAt && firstLoadedAt > since ? firstLoadedAt : since;
}

/** Cities offered as a base, in Arizona. Anywhere else is looked up. */
export const CITIES: Record<string, { lat: number; lng: number }> = {
  Phoenix: { lat: 33.4484, lng: -112.074 },
  Scottsdale: { lat: 33.4942, lng: -111.9261 },
  "Paradise Valley": { lat: 33.5312, lng: -111.9426 },
  Tempe: { lat: 33.4255, lng: -111.94 },
  Mesa: { lat: 33.4152, lng: -111.8315 },
  Chandler: { lat: 33.3062, lng: -111.8413 },
  Gilbert: { lat: 33.3528, lng: -111.789 },
  Glendale: { lat: 33.5387, lng: -112.186 },
  Peoria: { lat: 33.5806, lng: -112.2374 },
  Surprise: { lat: 33.6292, lng: -112.3679 },
  Goodyear: { lat: 33.4353, lng: -112.3576 },
  "Fountain Hills": { lat: 33.6117, lng: -111.7174 },
  "Queen Creek": { lat: 33.2487, lng: -111.6343 },
  Sedona: { lat: 34.8697, lng: -111.761 },
  Cottonwood: { lat: 34.7392, lng: -112.0099 },
  Prescott: { lat: 34.54, lng: -112.4685 },
  Flagstaff: { lat: 35.1983, lng: -111.6513 },
  Tucson: { lat: 32.2226, lng: -110.9747 },
};
