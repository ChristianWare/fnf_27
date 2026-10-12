// Calling the outside services the Leads Tool uses (Google, Ticketmaster,
// Apollo, the AI…) and reading business websites. Server only.
//
// For tests, LEADS_MOCK_URL sends every call to one stand-in server
// instead (never on the live site).

import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";
import { IS_LIVE } from "@/lib/server/email";

export class ApiError extends Error {
  constructor(
    readonly api: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const mockBase = () =>
  !IS_LIVE ? process.env.LEADS_MOCK_URL?.replace(/\/$/, "") : undefined;

/** Where a request really goes: the service, or the test stand-in. */
export function outside(url: string) {
  const mock = mockBase();
  if (!mock) return url;
  const u = new URL(url);
  return `${mock}/${u.host}${u.pathname}${u.search}`;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type CallOptions = RequestInit & {
  /** Milliseconds before giving up. */
  timeout?: number;
  /** Tries again once on a busy or failing service. */
  retry?: boolean;
};

export async function call(url: string, options: CallOptions = {}) {
  const { timeout = 15_000, retry = true, ...init } = options;
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(outside(url), {
        ...init,
        signal: controller.signal,
        cache: "no-store",
      });
      if (retry && attempt === 0 && (res.status === 429 || res.status >= 500)) {
        await res.body?.cancel().catch(() => undefined);
        await wait(res.status === 429 ? 2_000 : 800);
        continue;
      }
      return res;
    } catch (error) {
      if (retry && attempt === 0) {
        await wait(800);
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

/** A JSON API call. Throws ApiError with the service's message on failure. */
export async function callJson<T>(
  api: string,
  url: string,
  options: CallOptions = {},
): Promise<T> {
  const res = await call(url, options);
  const text = await res.text();
  if (!res.ok) {
    let message = text.slice(0, 300);
    try {
      const body = JSON.parse(text) as {
        error?: { message?: string } | string;
        message?: string;
        fault?: { faultstring?: string };
      };
      message =
        (typeof body.error === "string" ? body.error : body.error?.message) ??
        body.message ??
        body.fault?.faultstring ??
        message;
    } catch {
      // Not JSON: keep the start of the text.
    }
    throw new ApiError(
      api,
      res.status,
      `${api} said ${res.status}: ${message}`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(
      api,
      res.status,
      `${api} sent something that isn't JSON.`,
    );
  }
}

/* ── Reading other people's websites ── */

/** Names that only mean something on a private network. */
const LOCAL_NAME =
  /^(localhost|.+\.(localhost|local|internal|lan|home\.arpa))$/i;

/** Addresses that aren't on the public internet. */
const PRIVATE_IPS = new BlockList();
for (const [net, bits] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  PRIVATE_IPS.addSubnet(net, bits, "ipv4");
for (const [net, bits] of [
  ["::", 127],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const)
  PRIVATE_IPS.addSubnet(net, bits, "ipv6");

/** True for a loopback, private, link-local or reserved address. */
function isPrivateIp(address: string) {
  const version = isIP(address);
  if (version === 4) return PRIVATE_IPS.check(address, "ipv4");
  if (version !== 6) return false;
  // An IPv4 address written as IPv6 ("::ffff:127.0.0.1", "::ffff:7f00:1").
  const mapped = address.match(/^::ffff:(?:0:)?(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return PRIVATE_IPS.check(mapped[1], "ipv4");
  const hex = address.match(/^::ffff:(?:0:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (hex) {
    const [hi, lo] = [parseInt(hex[1], 16), parseInt(hex[2], 16)];
    return PRIVATE_IPS.check(
      `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`,
      "ipv4",
    );
  }
  return PRIVATE_IPS.check(address, "ipv6");
}

/** A public http(s) address, or undefined: never anything on our network. */
export function publicUrl(value: string | undefined | null) {
  if (!value) return undefined;
  try {
    const u = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    if (u.protocol !== "https:" && u.protocol !== "http:") return undefined;
    const host = u.hostname.replace(/\.+$/, "");
    if (!host || host.startsWith("[") || LOCAL_NAME.test(host))
      return undefined;
    if (isIP(host)) return isPrivateIp(host) ? undefined : u;
    if (!host.includes(".")) return undefined;
    return u;
  } catch {
    return undefined;
  }
}

/**
 * Throws unless the address's name leads to the public internet, so a name
 * pointed at a private address (127.0.0.1.nip.io, say) is never fetched.
 * Not in tests, where the stand-in server answers for every name.
 */
async function checkPublic(u: URL) {
  if (mockBase()) return;
  const host = u.hostname.replace(/\.+$/, "");
  if (isIP(host)) return;
  let found: { address: string }[];
  try {
    found = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new ApiError("website", 0, "That address doesn't exist.");
  }
  if (!found.length || found.some((f) => isPrivateIp(f.address)))
    throw new ApiError("website", 0, "That address isn't a public website.");
}

export const BOT_AGENT =
  "Mozilla/5.0 (compatible; FontsAndFootersBot/1.0; +https://fontsandfooters.com)";

/**
 * A page's text, at most `limit` bytes of it, or undefined. Redirects are
 * followed by hand, so every hop is checked to be a public address. The
 * page gets `timeout` to answer and as long again to arrive; a slow one is
 * read as far as it got.
 */
export async function readPage(
  address: string,
  {
    limit = 1_500_000,
    timeout = 10_000,
    agent = BOT_AGENT,
  }: { limit?: number; timeout?: number; agent?: string } = {},
) {
  let current = publicUrl(address);
  if (!current) return undefined;
  let res: Response | undefined;
  for (let hop = 0; hop < 6; hop++) {
    await checkPublic(current);
    res = await call(current.toString(), {
      timeout,
      retry: false,
      redirect: "manual",
      headers: {
        "User-Agent": agent,
        Accept:
          "text/html,application/xhtml+xml,application/xml,text/calendar,application/rss+xml,*/*;q=0.8",
      },
    });
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) break;
    await res.body?.cancel().catch(() => undefined);
    const next = publicUrl(new URL(location, current).toString());
    if (!next)
      throw new ApiError(
        "website",
        res.status,
        "It redirects somewhere we won't follow.",
      );
    current = next;
    res = undefined;
  }
  if (!res) throw new ApiError("website", 310, "Too many redirects.");
  if (!res.ok) {
    await res.body?.cancel().catch(() => undefined);
    throw new ApiError("website", res.status, `The page said ${res.status}.`);
  }
  const url = current.toString();
  const reader = res.body?.getReader();
  if (!reader) return { body: "", type: "", url };
  const chunks: Uint8Array[] = [];
  let size = 0;
  // Cancelling ends a read that's waiting, as if the page had finished.
  let late = false;
  const slow = setTimeout(() => {
    late = true;
    reader.cancel().catch(() => undefined);
  }, timeout);
  try {
    while (size < limit) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
    }
  } catch (error) {
    if (!late) throw error;
  } finally {
    clearTimeout(slow);
  }
  await reader.cancel().catch(() => undefined);
  const body = new TextDecoder("utf-8", { fatal: false }).decode(
    Buffer.concat(chunks.map((c) => Buffer.from(c))),
  );
  return { body, type: res.headers.get("content-type") ?? "", url };
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  hellip: "…",
};

export function decodeEntities(text: string) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n =
        code[1] === "x" || code[1] === "X"
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

/** The words on a web page, without the code. */
export function pageText(html: string, limit = 30_000) {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article|header|footer)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\v\r]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim()
    .slice(0, limit);
}

/** Every link on a page, made absolute. */
export function pageLinks(html: string, base: string) {
  const links: { href: string; text: string }[] = [];
  const re = /<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && links.length < 400) {
    try {
      links.push({
        href: new URL(decodeEntities(m[1]), base).toString(),
        text: pageText(m[2], 200),
      });
    } catch {
      // A link we can't read.
    }
  }
  return links;
}

/** "camelbackgrand.com" from any address on it. */
export function domainOf(value: string | undefined | null) {
  const u = publicUrl(value);
  return u ? u.hostname.replace(/^www\./i, "").toLowerCase() : undefined;
}
