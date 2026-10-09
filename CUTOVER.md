# Moving from the old site to this one

The old site keeps running, untouched, until the very last step. Everything
before that happens on a copy of its database (a Neon branch).

## 1. Try it on a copy (any day)

1. **Neon → Branches → New branch** from your main branch, "current data".
   Call it `new-site-test`. Copy its connection string.
2. In this project's `.env` (see `.env.example`):
   - `DATABASE_URL` = the branch's connection string (not the live one).
   - `NEXT_PUBLIC_APP_URL=http://localhost:3000`
   - Stripe **test** keys. The code refuses live keys outside the live site.
   - `EMAIL_REDIRECT_TO=you@yours.com` if you want to see the emails.
     Without it they're printed in the terminal, and nobody else gets them.
3. Run:
   ```
   npm install
   npm run db:migrate -- --import-old-site
   ```
   It lists what it moved: clients, logins, invoices, documents, blueprint,
   change requests, conversations. The old tables are kept, untouched, in a
   schema called `old_site`.
4. `npm run dev`, sign in with your usual email and password. Check
   **Admin → Clients → Nier Transportation**, and "View as client".

Without `--import-old-site`, the migration refuses to touch a database that
still has the old site's tables. That's the guard against running it on the
live database by mistake.

## 2. The new Vercel project

Environment variables (Production: live values; Preview: test values and a
test branch of the database):

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | `https://fontsandfooters.com` |
| `DATABASE_URL` | Set on cutover day (step 3) |
| `AUTH_SECRET` | Can be the same as the old site's |
| `RESEND_API_KEY` | Same as the old site |
| `ADMIN_SMS_GATEWAY` | Same as the old site |
| `STRIPE_SECRET_KEY` | Live key on Production only |
| `STRIPE_WEBHOOK_SECRET` | Same as the old site (same endpoint) |
| `CLOUDINARY_CLOUD_NAME`, `_API_KEY`, `_API_SECRET` | Same as the old site |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Same as the old site |
| `CRON_SECRET` | A new random string |
| The Leads Tool's keys | See `LEADS.md`: Google (two keys), Ticketmaster, Apify, SerpApi, Apollo, Anthropic |

Leave `EMAIL_REDIRECT_TO` unset on Production.

## 3. Cutover day (about 15 minutes, not on the 1st)

1. **Neon:** make a fresh branch of the live database, `new-site`. Run the
   migration against it from your computer, using its direct (not pooled)
   connection string:
   ```
   DATABASE_URL="postgresql://…" npm run db:migrate -- --import-old-site
   ```
2. **Vercel (new project):** set Production `DATABASE_URL` to the
   `new-site` branch's pooled connection string, and redeploy.
3. **Stripe → Developers → Webhooks:** open the endpoint for
   `https://fontsandfooters.com/api/webhooks/stripe` (it stays the same).
   Make sure it sends:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `invoice.paid`, `invoice.payment_failed`,
   `customer.subscription.updated`, `customer.subscription.deleted`,
   `customer.updated`.
4. **Vercel → Domains:** remove `fontsandfooters.com` (and `www`) from the
   old project and add them to the new one.
5. Sign in at `/admin`. Open **Nier Transportation → Billing → Sync with
   Stripe**. Check it says $399 a month and the next bill on the 1st.
6. Send yourself a test: register with a spare email, confirm it, approve
   it, and sign the agreement. Then archive it.
7. **Admin → Leads Tool → Run now** for the Phoenix area (see `LEADS.md`).
   When its numbers look right, switch Nier on under "Who has it".

Everyone signs in once after the switch, with the same password. Anyone
who only ever used "Sign in with Google" on the old site sets a password
with "Forgot it?" on the login page.

## 4. Afterwards

- Watch Vercel's logs for `/api/webhooks/stripe` on the next 1st.
- When you're happy: `drop schema old_site cascade;` on the new branch, and
  later retire the old project and its database branch.
