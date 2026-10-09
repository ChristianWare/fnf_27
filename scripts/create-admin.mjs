// Adds an admin, or makes an existing account an admin, and prints a link
// to set their password. For a brand-new database; the import brings the
// old site's admins over on its own.
//
//   npm run db:create-admin -- you@example.com "Your Name"

import { createHash, randomBytes } from "node:crypto";
import pg from "pg";
import { createId } from "./import-old-site.mjs";

const [emailArg, ...nameParts] = process.argv.slice(2);
const email = String(emailArg ?? "")
  .trim()
  .toLowerCase();
const name = nameParts.join(" ").trim();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error(
    'Usage: npm run db:create-admin -- you@example.com "Your Name"',
  );
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL isn't set. Add it to .env first.");
  process.exit(1);
}

const base = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query("begin");
  const owner = await client.query(`select 1 from users where is_owner`);
  const found = await client.query(`select id from users where email = $1`, [
    email,
  ]);
  let id = found.rows[0]?.id;
  if (id) {
    await client.query(
      `update users set role = 'ADMIN', client_id = null, is_owner = is_owner or $2,
         name = coalesce(nullif($3, ''), name), updated_at = now() where id = $1`,
      [id, owner.rows.length === 0, name],
    );
    console.log(`${email} is now an admin.`);
  } else {
    id = createId();
    await client.query(
      `insert into users (id, name, email, email_verified_at, role, is_owner)
       values ($1, $2, $3, now(), 'ADMIN', $4)`,
      [id, name, email, owner.rows.length === 0],
    );
    console.log(`Added ${email} as an admin.`);
  }

  const token = randomBytes(32).toString("base64url");
  await client.query(
    `insert into auth_tokens (id, user_id, kind, token_hash, expires_at)
     values ($1, $2, 'INVITE', $3, now() + interval '7 days')`,
    [createId(), id, createHash("sha256").update(token).digest("hex")],
  );
  await client.query("commit");
  console.log(`\nSet the password here (the link works for 7 days):\n`);
  console.log(`  ${base}/set-password?token=${token}\n`);
} catch (error) {
  await client.query("rollback");
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end();
}
