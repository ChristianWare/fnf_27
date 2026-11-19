// One connection pool for the whole app, and the Drizzle client on top of
// it. Set DATABASE_URL to the Neon connection string (the pooled one, with
// "-pooler" in the host, on Vercel).

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/** Neon's strings say sslmode=require; pg now warns that it treats that as
 *  verify-full. Say verify-full outright: the same secure connection,
 *  without the warning. */
export function pgUrl(url: string | undefined) {
  if (!url || /[?&]uselibpqcompat=/.test(url)) return url;
  return url.replace(/([?&]sslmode=)(require|prefer|verify-ca)\b/, "$1verify-full");
}

const cached = globalThis as unknown as { fnfPool?: Pool };

const pool =
  cached.fnfPool ??
  new Pool({
    connectionString: pgUrl(process.env.DATABASE_URL),
    max: 5,
    idleTimeoutMillis: 10_000,
  });

// Next reloads modules in development; keep one pool across reloads.
if (process.env.NODE_ENV !== "production") cached.fnfPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
export type Db = typeof db;
/** Inside db.transaction(async (tx) => …). */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
