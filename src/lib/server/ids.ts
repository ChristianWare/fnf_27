// Ids and one-time tokens. Server only.

import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

/** A new id, like the old site's: "c" and 24 random letters and digits. */
export function createId() {
  const bytes = randomBytes(24);
  let id = "c";
  for (let i = 0; i < 24; i++) id += ALPHABET[bytes[i] % 36];
  return id;
}

/** A token for a link we email. Only its hash is stored. */
export const newToken = () => randomBytes(32).toString("base64url");

export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

function secret() {
  const value = process.env.AUTH_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production")
    throw new Error("AUTH_SECRET is not set.");
  return "fnf-development-only-secret-set-AUTH_SECRET-for-production";
}

/** A short signature for a value, e.g. an unsubscribe link. */
export const sign = (value: string) =>
  createHmac("sha256", secret()).update(value).digest("base64url").slice(0, 32);

export function signatureOk(value: string, signature: string) {
  const expected = Buffer.from(sign(value));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
