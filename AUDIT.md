# The free website audit

An operator types their website (or their business name and city, if
they don't have one) on `/audit`, says which Google listing is theirs, and
lands on their report's own page, `/audit/report/<id>`, where the six
checks come in as they finish. About a minute later they see their score
out of 100 and the three things costing them the most. The full report
(every check, the proof, the operators near them, the PDF) is free too,
once they give a name and an email: it opens on the page and goes to
their inbox. You get an alert when someone runs it, with their score and
the phone number on their Google listing, and again if they ask for the
full report.

Everything is under **Admin → Audits**: every run, its score, how to reach
them, where you are with them, and your notes. **Run an audit** there does
one for an operator without emailing them, and its report opens unlocked,
ready to text during a call. **A list** runs several, one after another,
while the page stays open.

## Setting it up (once)

Add these in Vercel (Production and Preview) and in `.env` locally. Any
that's missing turns its part off: that check says it couldn't run and
doesn't count for or against the score. **Admin → Audits** shows which
are set.

| Variable | Where it comes from | Used for |
| --- | --- | --- |
| `GOOGLE_MAPS_SERVER_KEY` | The Leads Tool's key (see `LEADS.md`): Places API (New). | "Is this your listing?", the Business Profile check |
| `PAGESPEED_API_KEY` | Google Cloud → APIs & Services: turn on **PageSpeed Insights API**, then Credentials → Create API key, restricted to that one API. Free. | Speed on a phone, the phone screenshot, booking widgets added by scripts |
| `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD` | DataForSEO dashboard → API Access: the API login and password (the old site's). | Google visibility: the map results, page one, and how often each search is made |
| `ANTHROPIC_API_KEY` | The Leads Tool's key. | AI readability, the first-screen look, the fixes written for each site |
| `AUDIT_DAILY_CAP` | Optional. Default 150. | How many audits the public page may start in a day, across everyone |

Then `npm run db:migrate` adds the `audits` and `audit_searches` tables.

Turn on the alert under **Admin → Settings → Notifications → Someone runs
the free audit** (it's on unless you switch it off).

## Before you share it: check it against operators you know

1. **Admin → Audits → Run an audit → A list.** Paste the 25 sites with
   confirmed websites from the Arizona sheet, one per line (Nier is one of
   them), and run them.
2. Read down the scores. The strong sites (State 48, Detailed Drivers,
   PV Black Car) should land high, the dated ones low, and Nier near the
   top. Open any that look wrong: each check shows what it was based on.
3. Tell me what's off and I'll tune the rules. Each audit saves the rules
   version it ran under (`RULES_VERSION` in `src/lib/audit/kinds.ts`).
4. Pick a good example and press **Use as the sample report**. The audit
   page then shows "See a sample report", with the name, site, address,
   phone, quotes from their site and the operators near them taken out.
   Their review count, rating and where they rank stay, and those can be
   looked up, so pick an operator who's fine being shown (a client, say).

## What it checks

| Check | Worth | What it looks at |
| --- | --- | --- |
| Google visibility | 20 | Where they show up in the map results and on page one for the 5 biggest rider searches in their city, weighted by how often each is made. Plus the homepage title and nothing keeping Google out. |
| Your Google Business Profile | 20 | Reviews against the top 3 operators near them, rating, photos, hours, and whether the listing and the site agree on the website and phone. A street address showing is noted, not scored. |
| Speed on a phone | 15 | Time until the main content shows on a mid-range phone (Google's line for good is 2.5 s), Google's score, and how much the page downloads. |
| Online booking | 20 | Follows the Book and Reserve links: a booking system or a form that asks for the ride, a quote form, or nothing. A number to tap, and a way to book or call on the first phone screen. |
| The pages riders search for | 15 | A page for airport rides, the fleet, the cities they serve, and each kind of ride the site mentions (corporate, weddings, events, hourly). |
| AI readability | 10 | Whether an AI reading the site can quote where they drive, the airports, the vehicles, how to book and their policies. Plus business details in the code (schema.org), AI crawlers let in by robots.txt, and words that load without scripts. |

A check that can't run (a site that turns PageSpeed away, say) is left
out of the score; the others fill in. Nothing is made up: the only
estimate is searches a month, from Google Ads, and it's labeled. Booking
systems are named, never assumed to charge fees. The AI only gets credit
for what it can quote from the page.

The booking systems it knows by address are in
`src/lib/audit/booking-systems.ts`; add to it as you meet new ones.

## What it costs

About 20 to 25 cents a run at list price: Google's listing search
(3.5¢), DataForSEO (10 searches at $0.002, plus a city's search numbers
once a month), the AI (about 10¢), PageSpeed (free). **Admin → Audits**
shows the month's spend. The same site run again within a day is copied,
at no cost.

## Protection

The public page has Cloudflare's box, the trap field and the stamp (like
the contact form), at most 6 starts an hour and 20 a day from one address,
the daily cap, and it turns away sites that aren't car services before
any paid call. Websites are read through the Leads Tool's reader, which
looks up where each address points (at every redirect) and only fetches
public ones, so nothing on our own network is ever read. A full report goes
out at most 3 times per audit.

## Google's terms

The listing's details and the operators near them are cleared within 30
days: the 7 AM housekeeping clears them at 28, since a run copied from the
day before carries details a day older. The place ID, the score, the
business name and the city stay. **Run it again** looks the listing up
fresh. A run is only copied within 24 hours, and never from a copy. Report
links never show up in Google (they're marked noindex).
