// What one audit's outside calls cost, added up as it runs and saved with
// it, so Admin → Audits can show the month's spend. List prices, before any
// free monthly credit. Server only.

/** Millionths of a dollar per call. */
export const AUDIT_PRICE = {
  /** Text Search Enterprise (the listing's rating, phone, hours): $35 per 1,000. */
  places_search: 35_000,
  /** One SERP in DataForSEO's live mode: $0.002. */
  serp: 2_000,
  /** Search volumes for a city, one task: about $0.075. */
  volumes: 75_000,
  /** PageSpeed Insights: free. */
  pagespeed: 0,
} as const;

export type AuditApi = keyof typeof AUDIT_PRICE;

export class Cost {
  micros = 0;

  add(api: AuditApi, calls = 1) {
    this.micros += AUDIT_PRICE[api] * calls;
  }

  /** A cost the service reported itself, or the AI's from its tokens. */
  addMicros(micros: number) {
    if (Number.isFinite(micros) && micros > 0)
      this.micros += Math.round(micros);
  }
}
