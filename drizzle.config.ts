import type { Config } from "drizzle-kit";

// `npm run db:generate` writes a SQL migration to /drizzle from the schema.
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
} satisfies Config;
