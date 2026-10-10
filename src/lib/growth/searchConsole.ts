// Google Search Console: visitors from Google search for each client's
// site, read with a service account (a robot Google account that belongs
// to our Google Cloud project). Server only.
//
// GOOGLE_SEARCH_CONSOLE_KEY holds the service account's JSON key, as
// downloaded (or base64'd). Each site's property in Search Console lists
// the service account's email as a user; Restricted is enough.

import { createSign } from "node:crypto";
import { ApiError, callJson } from "@/lib/leads/apis/http";

const API = "https://www.googleapis.com/webmasters/v3";
const TOKEN_URI = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

type Key = { client_email: string; private_key: string; token_uri?: string };

function readKey(): Key | undefined {
  const raw = process.env.GOOGLE_SEARCH_CONSOLE_KEY?.trim();
  if (!raw) return undefined;
  try {
    const text = raw.startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf8");
    const key = JSON.parse(text) as Partial<Key>;
    if (!key.client_email || !key.private_key) return undefined;
    return {
      client_email: key.client_email,
      // Some pastes turn the key's line breaks into "\n".
      private_key: key.private_key.replace(/\\n/g, "\n"),
      token_uri: key.token_uri,
    };
  } catch {
    return undefined;
  }
}

/** What's wrong with the key, if anything. */
export function keyProblem() {
  if (!process.env.GOOGLE_SEARCH_CONSOLE_KEY?.trim())
    return "GOOGLE_SEARCH_CONSOLE_KEY isn't set.";
  if (!readKey())
    return "GOOGLE_SEARCH_CONSOLE_KEY isn't a service account key. Paste the whole JSON file Google gave you.";
  return undefined;
}

export const searchConsoleReady = () => !keyProblem();

/** The address to add to each property in Search Console. */
export const serviceAccountEmail = () => readKey()?.client_email;

let token: { value: string; until: number; email: string } | undefined;

/** A short-lived access token, signed with the service account's key. */
async function accessToken() {
  const key = readKey();
  if (!key) throw new ApiError("Search Console", 0, keyProblem() ?? "No key.");
  if (
    token &&
    token.email === key.client_email &&
    token.until > Date.now() + 60_000
  )
    return token.value;
  const uri = key.token_uri || TOKEN_URI;
  const now = Math.floor(Date.now() / 1000);
  const part = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${part({ alg: "RS256", typ: "JWT" })}.${part({
    iss: key.client_email,
    scope: SCOPE,
    aud: uri,
    iat: now,
    exp: now + 3600,
  })}`;
  let signature: string;
  try {
    signature = createSign("RSA-SHA256")
      .update(unsigned)
      .sign(key.private_key, "base64url");
  } catch {
    throw new ApiError(
      "Search Console",
      0,
      "GOOGLE_SEARCH_CONSOLE_KEY's private key can't sign. Download a fresh JSON key and paste it again.",
    );
  }
  const res = await callJson<{ access_token: string; expires_in?: number }>(
    "Search Console",
    uri,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${unsigned}.${signature}`,
      }).toString(),
    },
  );
  token = {
    value: res.access_token,
    until: Date.now() + (res.expires_in ?? 3600) * 1000,
    email: key.client_email,
  };
  return token.value;
}

const authed = async () => ({
  Authorization: `Bearer ${await accessToken()}`,
});

export type SiteEntry = {
  siteUrl: string;
  /** siteOwner, siteFullUser, siteRestrictedUser or siteUnverifiedUser. */
  permissionLevel: string;
};

/** Every property the service account has been added to. */
export async function listSites(): Promise<SiteEntry[]> {
  const res = await callJson<{ siteEntry?: SiteEntry[] }>(
    "Search Console",
    `${API}/sites`,
    { headers: await authed() },
  );
  return (res.siteEntry ?? []).filter(
    (s) => s.permissionLevel !== "siteUnverifiedUser",
  );
}

export type SearchRow = {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr?: number;
  position: number;
};

export type SearchQuery = {
  startDate: string;
  endDate: string;
  dimensions: ("date" | "query")[];
  rowLimit?: number;
  startRow?: number;
};

/** Search Analytics for one property: web results, fresh days included. */
export async function searchAnalytics(site: string, query: SearchQuery) {
  const res = await callJson<{
    rows?: SearchRow[];
    metadata?: { firstIncompleteDate?: string; first_incomplete_date?: string };
  }>(
    "Search Console",
    `${API}/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { ...(await authed()), "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "web",
        dataState: "all",
        rowLimit: 25_000,
        ...query,
      }),
      timeout: 40_000,
    },
  );
  return {
    rows: res.rows ?? [],
    /** Numbers from this day on can still change. */
    firstIncomplete:
      res.metadata?.firstIncompleteDate ?? res.metadata?.first_incomplete_date,
  };
}

/** The property for a domain: the whole domain first, then its URLs. */
export function pickProperty(sites: SiteEntry[], domain: string) {
  const bare = domain.toLowerCase().replace(/^www\./, "");
  const order = [
    `sc-domain:${bare}`,
    `https://www.${bare}/`,
    `https://${bare}/`,
    `http://www.${bare}/`,
    `http://${bare}/`,
  ];
  const urls = sites.map((s) => s.siteUrl.toLowerCase());
  const found = order.find((o) => urls.includes(o));
  return found
    ? sites.find((s) => s.siteUrl.toLowerCase() === found)?.siteUrl
    : undefined;
}

/** A site's domain, from what we have: "niertransportation.com". */
export function domainOf(site: {
  domain: string | null;
  liveUrl: string | null;
}) {
  const raw = (site.domain || site.liveUrl || "").trim();
  if (!raw) return undefined;
  try {
    return new URL(raw.includes("://") ? raw : `https://${raw}`).hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/\.$/, "");
  } catch {
    return undefined;
  }
}

/** What Google's answer means, in words for the admin. */
export function problemText(error: unknown, site?: string) {
  const email = serviceAccountEmail();
  if (error instanceof ApiError) {
    if (
      /has not been used|is disabled|SERVICE_DISABLED|accessNotConfigured/i.test(
        error.message,
      )
    )
      return "The Search Console API isn't turned on for the key's Google Cloud project. In Google Cloud: APIs & Services → Library → Google Search Console API → Enable.";
    if (error.status === 403 || error.status === 401)
      return site
        ? `Search Console won't share ${site} with us yet. In Search Console, open that property → Settings → Users and permissions, and add ${email ?? "the service account"} (Restricted is enough).`
        : `Google turned the key down: ${error.message}. Check the Search Console API is enabled in the key's Google Cloud project.`;
    if (
      error.status === 400 &&
      /invalid_grant|invalid JWT/i.test(error.message)
    )
      return "Google turned the key down. Download a fresh JSON key for the service account and paste it again.";
    return `Search Console: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}
