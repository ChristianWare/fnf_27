# The Leads Tool

Every morning at 6 (Arizona time), each client with the Leads Tool gets the
hotels, venues, companies and events around their base that book rides:
the person to contact at each one, an email, a text and a call opener
written for them, and reminders to follow up. The studio has its own copy
under **Admin → Your leads**, free and always on.

## Setting it up (once)

Add these in Vercel (Production and Preview) and in `.env` locally. Any
that's missing just turns that part off. **Admin → Leads Tool → Services**
shows which are set, and **Check them all** asks each service what its key
can do: a key can be set and still be missing an API on Google's side, or
a permission. Each one answers in its own words, with what to turn on.

| Variable | Where it comes from | Used for |
| --- | --- | --- |
| `GOOGLE_MAPS_SERVER_KEY` | Google Cloud → APIs & Services → Credentials. Turn on **Places API (New)** and **Routes API**; restrict the key to those two. | Accounts, details, photos, venues, drive times |
| `NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY` | A second key with only the **Maps Embed API**, restricted to your sites (`fontsandfooters.com/*`, `*.vercel.app/*`, `localhost:3000/*`). | The small map on each lead |
| `TICKETMASTER_API_KEY` | developer.ticketmaster.com → My Apps → Consumer Key | Concerts, games and shows |
| `APIFY_API_TOKEN` | Apify → Settings → API & Integrations. A token **without limited permissions** (a scoped one needs Run on the actor and Read on runs and datasets, or it says "Insufficient permissions for the Actor"). | Eventbrite, through the `scrapio/eventbrite-scraper` actor (pay per event). `APIFY_EVENTBRITE_ACTOR` swaps in another. |
| `SERPAPI_API_KEY` | serpapi.com → Dashboard | Google Events: 4 searches per market each Monday (about 17 a month; 250 are free) |
| `APOLLO_API_KEY` | Apollo → Settings → Integrations → API. It must be a **master key**. | The decision-maker's work email when a lead is saved |
| `ANTHROPIC_API_KEY` | console.anthropic.com | Briefs, scripts, team pages, calendars without a feed, news |
| `CRON_SECRET` | Any long random string | Vercel's scheduled calls |

Set a budget alert in Google Cloud. In Google, everything but a place ID is
kept at most 30 days, as its terms ask: details are refreshed before then,
and anything older is cleared.

## The first run

1. `npm run db:migrate` adds the tables, the **Phoenix area** market and 8
   Phoenix-area calendars to start from. Full Platform clients start with
   the Leads Tool switched off.
2. **Admin → Leads Tool → Services → Check them all**, and fix anything
   that needs a look.
3. **Admin → Leads Tool → Run now.** It works in rounds of about four
   minutes (a first load takes a few) and starts the next round itself
   while that page is open. Close it and the run finishes tonight; a run
   left part done shows **Keep going**.
4. **Test** each calendar. Switch off any that find nothing, and add your
   own (iCal files, RSS feeds, or any events page: the AI reads those).
5. Turn Nier on under **Who has it**. They get a "your leads are in" email.

## How it runs

| Arizona time | What |
| --- | --- |
| 1, 2, 3, 4 and 5 AM | The nightly run, for each market someone's using. Every account searched on Google (IDs only, free), new ones' details, websites read, Ticketmaster, calendars; Eventbrite Mondays and Thursdays; Google Events Mondays; the news Sundays. Each call carries on where the last stopped. |
| 6 AM | Trials that ended without a card pause; reminders 3 days before a trial ends and on the day; the morning email. |
| 7 AM | Housekeeping and the studio summary, as before. |

On Vercel's Hobby plan each of these runs once a day sometime within its
hour; on Pro, on the minute.

A client's base picks their market: the nearest one within 30 miles, or a
new one made around them (the admins get an email). A market only runs
while someone's using it.

## Billing

A 30-day trial, no card. Adding a card (Stripe Checkout), or keeping it
with the card already on file from Billing, starts a subscription that
stays free until the trial ends, then charges the rest of that month and
$125 on the 1st. The rest of the month is worked out to the second, the
way Stripe charges it, so the price we quote is the price on the invoice.
Cancelling stops it at the end of the month (or the trial). When it ends,
saved leads are kept 90 days.

The Full Platform includes it, while that plan is running. Moving a client
to the Full Platform (approving them on it, or changing their plan) stops
a separate Leads Tool plan at the end of what they've paid for, with
nothing more charged.

## Costs

**Admin → Leads Tool** shows this month's calls and a rough cost per
service, per market and per client, at list prices before free tiers.

Some ceilings keep a bad day cheap:

- Each client can save 60 leads a day, with up to 200 AI calls and 60
  email lookups. Removing leads and saving them again still counts.
- Photos stop at 5,000 a day (about $35). After that, lists show icon
  tiles until the next day.
