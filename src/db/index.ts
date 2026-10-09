// One connection pool for the whole app, and the Drizzle client on top of
// it. Set DATABASE_URL to the Neon connection string (the pooled one, with
// "-pooler" in the host, on Vercel).

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const cached = globalThis as unknown as { fnfPool?: Pool };

const pool =
  cached.fnfPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
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
