// Brings the database up to date: creates or changes the tables (the SQL
// files in /drizzle). Run it after pulling a change to src/db/schema.ts.
//
//   npm run db:migrate
//
// The first time, on a copy of the old site's database, it also moves the
// old site's data into the new tables. That only happens with a flag, so it
// can't run against the live database by accident:
//
//   npm run db:migrate -- --import-old-site
//
// Reads DATABASE_URL from .env (a DATABASE_URL set in the shell wins).

import { fileURLToPath } from "node:url";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { hasOldTables, importOldSite } from "./import-old-site.mjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL isn't set. Add it to .env first.");
  process.exit(1);
}

// The old site's times were stored without a time zone, in UTC. Read them
// as UTC whatever time zone this computer is in.
pg.types.setTypeParser(
  pg.types.builtins.TIMESTAMP,
  (s) => new Date(`${s.replace(" ", "T")}Z`),
);

const wantsImport = process.argv.includes("--import-old-site");
const where = (() => {
  try {
    const u = new URL(url);
    return `${u.hostname}/${u.pathname.slice(1)}`;
  } catch {
    return "the database in DATABASE_URL";
  }
})();

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  const old = await hasOldTables(client);
  if (old && !wantsImport) {
    console.error(
      [
        "",
        `This database (${where}) still has the old site's tables.`,
        "",
        "If the old site is still using it, stop here: the import moves those",
        "tables out of the way and the old site would stop working.",
        "",
        "Make a Neon branch of it first, put the branch's connection string in",
        "DATABASE_URL, then run:",
        "",
        "  npm run db:migrate -- --import-old-site",
        "",
      ].join("\n"),
    );
    process.exitCode = 1;
  } else {
    console.log(`Updating tables in ${where}…`);
    await migrate(drizzle(client), {
      migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
    });

    if (old) {
      console.log("Moving the old site's data in…");
      await client.query("begin");
      try {
        const counts = await importOldSite(client, (m) => console.log(m));
        await client.query("commit");
        for (const [what, n] of Object.entries(counts))
          console.log(`  ${String(n).padStart(4)}  ${what}`);
        console.log(
          "The old tables are kept, untouched, in a schema called old_site.",
        );
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }

    const { rows } = await client.query(
      `select count(*)::int as n from users where role = 'ADMIN'`,
    );
    if (rows[0].n === 0)
      console.log(
        "No admin yet. Add one with: npm run db:create-admin -- you@example.com",
      );
    console.log("The database is up to date.");
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end();
}
