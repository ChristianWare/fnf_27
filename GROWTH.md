# The Growth page

Every client with a live site gets a Growth page: everyone who visits
their site, a row a day since launch day, split by where they came from,
against their 12-month plan. They can look at it daily, weekly, monthly,
year to date, all time, or pick their own dates on the calendar. Nothing
from before the site was theirs shows.

Alongside: the sites and apps that sent visitors and the pages they landed
on, how they show up on Google (visitors from Google, times shown, average
position and the searches behind them), their Google rating and reviews,
and the notes and weekly habits you write for them.

## Where the numbers come from

| What | From | Updated |
| --- | --- | --- |
| Visitors, pages viewed, where they came from, the pages they landed on | Their site in **Plausible** | Every night, back to launch day |
| Visitors from Google, times shown, average position, the searches | Their site's property in **Google Search Console** | Every night, back to launch day (Search Console keeps 16 months) |
| Rating and review count | Their **Google listing**, through the Places API key the Leads Tool already uses | Every night; kept 30 days, as Google's terms ask |
| The 12-month plan, notes, habits | You, on their **Growth** tab | When you save |

**Visitors** are Plausible's unique visitors. Plausible counts a person
once a day (it doesn't use cookies), so a month's visitors are the days'
visitors added up: the same number Plausible's own dashboard shows for
that month. The page shows whole days, up to yesterday.

**Where they came from** puts Plausible's channels into five groups:
Search (Google, Bing and the rest), Direct (typed the address or used a
saved link), Social media, Other websites, and Ads and other (ads, email
and everything else). Someone who came two ways in one day counts in both.

Search Console settles each day's numbers over two or three days, so the
Google numbers always run a little behind the visitor numbers, and the page
says so. Each night reads the last ten days of Google's numbers, and the
last three days of Plausible's, again for that reason.

Until a client's site is connected to Plausible, their Growth page counts
visitors from Google instead (the plan too), the way it did before.

## Setting it up (once)

### Plausible

1. **Plausible → Settings → API Keys → New API Key**
   (plausible.io/settings/api-keys). Name it, for example `fnf-growth`,
   choose the team your clients' sites are in, and **Stats API** if it
   asks which kind. Copy the key: Plausible shows it once.
2. In Vercel (Production and Preview) and in your `.env`, set
   `PLAUSIBLE_API_KEY` to it. Redeploy.

The key reads every site in that team, so each client's site needs to be
in that team. A key allows 600 questions an hour; a nightly pull is four
per site.

### Google Search Console

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

1. **All visitors → Pull now.** It finds their site in Plausible from
   their domain (Site links on the Overview tab), as `example.com` and then
   `www.example.com`, reads everything since launch day, and it's on their
   Growth page straight away. If their site has another name in Plausible,
   **Change site** and type it as Plausible shows it.
2. **Search Console → their property → Settings → Users and permissions →
   Add user.** Paste the service account's email and choose
   **Restricted**. You need to be an Owner of the property to add someone.
   Then **Visitors from Google → Pull now**. If they have more than one
   property, **Change property** picks it.
3. **Google reviews → Find**, then **Use this one** on their listing. A
   business with no storefront (a service area) shows as one; if theirs
   doesn't come up, find it on Google's Place ID Finder and paste the ID.
4. Set their **12-month plan**: visitors a month, from everywhere (the
   standard one is a click). When you look at their numbers each month,
   write **What moved** and the **Weekly habits**.

From then on it all updates itself at midnight Arizona time
(`/api/cron/growth` in `vercel.json`).

## Costs

- Plausible: part of your Business plan.
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
