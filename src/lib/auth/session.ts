// Signed session cookies, with no extra packages.
//
// The cookie holds who is signed in and when that runs out, plus a
// signature (HMAC-SHA256) made with AUTH_SECRET. Nobody can change the
// cookie without the secret, so the server can trust it without looking
// anything up. The proxy (src/proxy.ts) uses it to send signed-out visitors
// to /login, and every dashboard page checks it again through the DAL
// (src/lib/auth/dal.ts).
//
// Set AUTH_SECRET in .env.local and on Vercel: a long random string, e.g.
// the output of `openssl rand -base64 32`. Without it, development uses a
// fixed secret and production refuses to sign anyone in.

export const SESSION_COOKIE = "fnf_session";
export const SESSION_DAYS = 7;

export type Session = {
  /** The signed-in user's id. */
  sub: string;
  /** When the session runs out, in seconds since 1970. */
  exp: number;
};

const DEV_SECRET = "fnf-development-only-secret-set-AUTH_SECRET-for-production";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (value) return value;
  return process.env.NODE_ENV === "production" ? null : DEV_SECRET;
}

/** False in production until AUTH_SECRET is set. */
export const authConfigured = () => secret() !== null;

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64 + "===".slice((base64.length + 3) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

const hmacKey = (value: string) =>
  crypto.subtle.importKey(
    "raw",
    encoder.encode(value),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

/** A new signed session for this user, and when it runs out. */
export async function signSession(sub: string) {
  const value = secret();
  if (!value) throw new Error("AUTH_SECRET is not set.");

  const session: Session = {
    sub,
    exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60,
  };
  const payload = toBase64Url(encoder.encode(JSON.stringify(session)));
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(value),
    encoder.encode(payload),
  );

  return {
    token: `${payload}.${toBase64Url(new Uint8Array(signature))}`,
    expires: new Date(session.exp * 1000),
  };
}

/** The session in this cookie, or null if it's missing, changed or old. */
export async function verifySession(
  token: string | undefined,
): Promise<Session | null> {
  const value = secret();
  if (!value || !token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(value),
      fromBase64Url(signature),
      encoder.encode(payload),
    );
    if (!valid) return null;

    const session = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payload)),
    ) as Partial<Session>;
    if (typeof session.sub !== "string" || typeof session.exp !== "number") {
      return null;
    }
    if (session.exp * 1000 < Date.now()) return null;
    return { sub: session.sub, exp: session.exp };
  } catch {
    return null;
  }
}

/** How the session cookie is stored: unreadable to scripts, https only. */
export const sessionCookieOptions = (expires: Date) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  expires,
});
