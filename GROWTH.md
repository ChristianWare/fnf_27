# The Growth page

Every client with a live site gets a Growth page: their visitors from
Google search, a row a day since launch day, against their 12-month plan.
They can look at them daily, weekly, monthly, year to date, all time, or
pick their own dates on the calendar. Nothing from before the site was
theirs shows.

Alongside: the searches that bring people in, their Google rating and
reviews, and the notes and weekly habits you write for them.

## Where the numbers come from

| What | From | Updated |
| --- | --- | --- |
| Visitors from Google, times shown, average position, the searches | Their site's property in **Google Search Console** | Every night, back to launch day (Search Console keeps 16 months) |
| Rating and review count | Their **Google listing**, through the Places API key the Leads Tool already uses | Every night; kept 30 days, as Google's terms ask |
| The 12-month plan, notes, habits | You, on their **Growth** tab | When you save |

Search Console settles each day's numbers over two or three days, so the
page always says how recent they are ("numbers through Oct 7"). Each night
reads the last ten days again for that reason.

## Setting it up (once)

Search Console is read with a **service account**: a robot Google account
in your Google Cloud project (the one with your Maps keys). Clients don't
do anything.

1. **Google Cloud → APIs & Services → Library → Google Search Console API
   → Enable.**
2. **APIs & Services → Credentials → Create credentials → Service
   account.** Any name, for example `fnf-growth`. Skip the optional steps.
3. Open it → **Keys → Add key → Create new key → JSON.** A file downloads.
   Keep it somewhere safe: it's the key.
4. In Vercel (Production and Preview) and in your `.env`, set
   `GOOGLE_SEARCH_CONSOLE_KEY` to the whole contents of that file. Paste
   it as it is, all on one line or not; base64 of it works too. Redeploy.

The service account's email (it ends in `.iam.gserviceaccount.com`) now
shows on every client's Growth tab, with a Copy button.

## For each client

1. **Search Console → their property → Settings → Users and permissions →
   Add user.** Paste the service account's email and choose
   **Restricted**. You need to be an Owner of the property to add someone.
2. **Admin → their client page → Growth → Pull now.** It finds their
   property from their domain (Site links on the Overview tab), reads
   everything since launch day, and it's on their Growth page straight
   away. If they have more than one property, **Change property** picks it.
3. **Google reviews → Find**, then **Use this one** on their listing.
4. Set their **12-month plan** (the standard one is a click), and when you
   look at their numbers each month, **What moved** and **Weekly habits**.

From then on it all updates itself at midnight Arizona time
(`/api/cron/growth` in `vercel.json`).

## Costs

- Search Console: free.
- Reviews: one Google listing lookup a night per client, Place Details
  Enterprise ($20 per 1,000 at list price): about 60 cents a month each.
  Finding a listing is one search ($35 per 1,000). Both show on **Admin →
  Leads Tool** with the other Google costs.

## Deleting a client

**Archive** stops their billing, signs them out and hides them; their
invoices and files are kept, and **Restore** brings them back. Once
they're archived, **Delete forever** (on their Overview) removes them for
good: their sign-ins, website, files, messages, invoices, saved leads and
Growth numbers. It asks you to type their business name. Stripe keeps its
own record of the customer and their payments either way.
