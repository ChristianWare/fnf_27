"use client";

// Behind a client's Growth page. The numbers come in every night: all
// their visitors from Plausible, visitors from Google search from their
// site's Search Console property, and their rating and reviews from their
// Google listing. Here you see how that's going, connect the three, and
// set what's yours to set: their 12-month plan, this month's notes and
// their weekly habits.

import { useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { useAction } from "@/components/Dashboard/useAction";
import { Pill, ui } from "@/components/Dashboard/ui/ui";
import {
  findGoogleListings,
  publishGrowthNotes,
  pullGrowth,
  saveGrowthHabits,
  saveGrowthPlan,
  searchConsoleSites,
  setGoogleListing,
  setPlausibleSite,
  setSearchConsoleSite,
} from "@/app/admin/build-actions";
import { firstOfMonth } from "@/lib/dashboard/billing";
import {
  dayKey,
  fmtMonth,
  fmtMonthLong,
  fmtShort,
  fmtTime,
} from "@/lib/dashboard/format";
import type { Growth } from "@/lib/dashboard/types";
import { fmtDayLong, fmtDayShort } from "@/lib/growth/dates";
import type { GrowthAdmin } from "@/lib/growth/load";
import type { Listing } from "@/lib/leads/apis/google";
import styles from "./Client.module.css";

const STANDARD = [
  100, 150, 250, 400, 600, 900, 1300, 1800, 2400, 3100, 4000, 5000,
];

const num = (value: string) => Number(value.replace(/[^\d.]/g, "")) || 0;
const n = (value: number) => value.toLocaleString("en-US");

export default function GrowthSetup({
  clientId,
  growth,
  live,
  launchedAt,
  firstName,
  business,
  city,
  domain,
  admin,
  now,
}: {
  clientId: string;
  growth?: Growth;
  live: boolean;
  launchedAt?: string;
  firstName: string;
  business: string;
  city: string;
  domain?: string;
  admin: GrowthAdmin;
  now: string;
}) {
  const { run, pending } = useAction();
  // Which "Pull now" is running, for its label.
  const [pulling, setPulling] = useState<"google" | "plausible">();
  const everyone = admin.monthlyFrom === "visits";

  // A plan that's never been saved: 12 months from launch, standard targets.
  const planned = growth?.months.length ? growth.months : undefined;
  const months =
    planned?.map((m) => m.month) ??
    Array.from({ length: 12 }, (_, i) => firstOfMonth(launchedAt ?? now, i));
  const thisMonth = firstOfMonth(now);

  const [targets, setTargets] = useState<number[]>(
    planned?.map((m) => m.target) ?? STANDARD,
  );
  const [notes, setNotes] = useState<string[]>(
    growth?.notes.length ? growth.notes : [""],
  );
  const [habits, setHabits] = useState(
    growth?.habits.map((h) => h.text) ?? [
      "Ask three riders for a Google review",
      "Post one photo to your Google profile",
    ],
  );

  return (
    <div className={styles.split}>
      <div className={styles.column}>
        {!live && (
          <div className={ui.notice}>
            <Icon name='info' className={ui.noticeIcon} />
            <p>
              {firstName}&apos;s Growth page opens on launch day, and the
              numbers start then: nothing from before the site was theirs.
              Connect it now so it&apos;s ready the moment the site goes live.
            </p>
          </div>
        )}

        <Plausible
          clientId={clientId}
          admin={admin}
          live={live}
          domain={domain}
          pending={pending}
          pulling={pending && pulling === "plausible"}
          onPull={() => setPulling("plausible")}
          run={run}
        />

        <SearchConsole
          clientId={clientId}
          admin={admin}
          live={live}
          domain={domain}
          pending={pending}
          pulling={pending && pulling === "google"}
          onPull={() => setPulling("google")}
          run={run}
        />

        <Reviews
          clientId={clientId}
          admin={admin}
          search={[business, city].filter(Boolean).join(" ")}
          pending={pending}
          run={run}
        />
      </div>

      <div className={styles.column}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div className={styles.titles}>
              <h2 className={styles.heading}>
                {firstName}&apos;s 12-month plan
              </h2>
              <p>
                {everyone
                  ? "Visitors each month, from everywhere: the target is the dotted line on their chart. What they got fills in from Plausible by itself."
                  : "Visitors from Google each month, until Plausible is connected: the target is the dotted line on their chart. What they got fills in by itself."}
              </p>
            </div>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
              onClick={() => setTargets(STANDARD)}
            >
              Use the standard plan
            </button>
          </div>
          <div className={styles.targets}>
            {targets.map((target, i) => {
              const month = months[i];
              const key = month ? dayKey(month).slice(0, 7) : undefined;
              const actual = key ? admin.monthly[key] : undefined;
              return (
                <div key={i} className={styles.target}>
                  <span className={ui.monoMuted}>
                    {month ? fmtMonth(month) : `Month ${i + 1}`}
                  </span>
                  <input
                    className={ui.input}
                    inputMode='numeric'
                    value={String(target)}
                    onChange={(e) => {
                      const value = num(e.target.value);
                      setTargets((t) => t.map((x, j) => (j === i ? value : x)));
                    }}
                    aria-label={`Target for ${month ? fmtMonthLong(month) : `month ${i + 1}`}`}
                  />
                  {month && month <= thisMonth && actual !== undefined && (
                    <span
                      className={`${styles.actualText} ${actual >= target ? styles.actualMet : ""}`}
                    >
                      {n(actual)}
                      {month === thisMonth ? " so far" : ""}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className={styles.actions}>
            <span className={styles.help}>
              By month 12: {targets[11]?.toLocaleString("en-US")} visitors a
              month.
            </span>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              disabled={pending}
              onClick={() =>
                run(
                  () => saveGrowthPlan(clientId, targets),
                  () => ({
                    message: "Plan saved",
                    detail: `${firstName}'s chart is up to date.`,
                  }),
                )
              }
            >
              Save plan
            </button>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>
              What moved in {fmtMonthLong(now).split(" ")[0]}
            </h2>
            <p>
              Three or four lines in plain words. They show on {firstName}
              &apos;s Growth page.
            </p>
          </div>
          <ol className={styles.editList}>
            {notes.map((note, i) => (
              <li key={i} className={styles.editRow}>
                <textarea
                  className={`${ui.textarea} ${styles.shortArea}`}
                  value={note}
                  onChange={(e) =>
                    setNotes((list) =>
                      list.map((x, j) => (j === i ? e.target.value : x)),
                    )
                  }
                  placeholder='e.g. Your Sky Harbor page moved from #7 to #3.'
                  aria-label={`Note ${i + 1}`}
                />
                <button
                  type='button'
                  className={styles.remove}
                  onClick={() =>
                    setNotes((list) => list.filter((_, j) => j !== i))
                  }
                  aria-label={`Remove note ${i + 1}`}
                >
                  <Icon name='trash' />
                </button>
              </li>
            ))}
          </ol>
          <div className={styles.actions}>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
              onClick={() => setNotes((list) => [...list, ""])}
            >
              Add a line
              <Icon name='plus' className={ui.btnIcon} />
            </button>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              disabled={!notes.some((x) => x.trim()) || pending}
              onClick={() =>
                run(
                  () => publishGrowthNotes(clientId, notes),
                  () => ({
                    message: "Notes published",
                    detail: `They're on ${firstName}'s Growth page now.`,
                  }),
                )
              }
            >
              Publish
              <Icon name='send' className={ui.btnIcon} />
            </button>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.titles}>
            <h2 className={styles.heading}>Weekly habits</h2>
            <p>
              {firstName}&apos;s part. A checklist on their Growth page each
              week.
            </p>
          </div>
          <ol className={styles.editList}>
            {habits.map((habit, i) => (
              <li key={i} className={styles.editRow}>
                <input
                  className={ui.input}
                  value={habit}
                  onChange={(e) =>
                    setHabits((list) =>
                      list.map((x, j) => (j === i ? e.target.value : x)),
                    )
                  }
                  aria-label={`Habit ${i + 1}`}
                />
                <button
                  type='button'
                  className={styles.remove}
                  onClick={() =>
                    setHabits((list) => list.filter((_, j) => j !== i))
                  }
                  aria-label={`Remove habit ${i + 1}`}
                >
                  <Icon name='trash' />
                </button>
              </li>
            ))}
          </ol>
          <div className={styles.actions}>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
              onClick={() => setHabits((list) => [...list, ""])}
            >
              Add a habit
              <Icon name='plus' className={ui.btnIcon} />
            </button>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              disabled={pending}
              onClick={() =>
                run(
                  () => saveGrowthHabits(clientId, habits),
                  () => ({ message: "Habits saved" }),
                )
              }
            >
              Save habits
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

type Run = ReturnType<typeof useAction>["run"];

/** All their visitors: Plausible, and how the pulls are going. */
function Plausible({
  clientId,
  admin,
  live,
  domain,
  pending,
  pulling,
  onPull,
  run,
}: {
  clientId: string;
  admin: GrowthAdmin;
  live: boolean;
  domain?: string;
  pending: boolean;
  pulling: boolean;
  onPull: () => void;
  run: Run;
}) {
  const p = admin.plausible;
  const sync = admin.sync.visits;
  const connected = p.stored > 0 && Boolean(p.first) && !sync?.error;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(p.site ?? "");

  return (
    <section className={styles.card}>
      <div className={`${styles.cardHead} ${styles.growthHead}`}>
        <div className={styles.titles}>
          <h2 className={styles.heading}>All visitors</h2>
          <p>
            From Plausible, every night, back to launch day: everyone who
            visits, where they came from, and the pages they land on.
          </p>
        </div>
        <Pill tone={p.problem ? "red" : connected ? "lime" : "yellow"} dot>
          {p.problem
            ? "Key missing"
            : connected
              ? "Connected"
              : "Not connected yet"}
        </Pill>
      </div>

      {p.problem ? (
        <div className={`${ui.notice} ${ui.noticeBad}`}>
          <Icon name='info' className={ui.noticeIcon} />
          <p>
            {p.problem} The steps are in GROWTH.md: a Stats API key from
            Plausible, in Vercel. Until then their Growth page counts visitors
            from Google.
          </p>
        </div>
      ) : (
        <>
          <dl className={styles.miniFacts}>
            <div className={styles.factWide}>
              <dt>Site in Plausible</dt>
              <dd className={styles.propertyValue}>
                {p.site ??
                  `Found from their domain on the first pull${domain ? `: ${domain}` : ""}`}
              </dd>
            </div>
            <div>
              <dt>Numbers</dt>
              <dd>
                {p.first && p.through
                  ? `${fmtDayShort(p.first)} – ${fmtDayShort(p.through)}`
                  : "None yet"}
              </dd>
            </div>
            <div>
              <dt>Last pull</dt>
              <dd>
                {sync?.at
                  ? `${fmtShort(sync.at)}, ${fmtTime(sync.at)}`
                  : "Not yet"}
              </dd>
            </div>
          </dl>

          {sync?.error && (
            <div className={`${ui.notice} ${ui.noticeBad}`}>
              <Icon name='info' className={ui.noticeIcon} />
              <p>{sync.error}</p>
            </div>
          )}

          {editing && (
            <form
              className={styles.pickRow}
              onSubmit={(e) => {
                e.preventDefault();
                run(
                  () => setPlausibleSite(clientId, name.trim() || null),
                  () => {
                    setEditing(false);
                    return {
                      message: "Site saved",
                      detail: "Pull now to read its numbers.",
                    };
                  },
                );
              }}
            >
              <label className={ui.field}>
                <span className={ui.label}>
                  Their site&apos;s name in Plausible
                </span>
                <input
                  className={ui.input}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={domain ?? "example.com"}
                  autoComplete='off'
                  spellCheck={false}
                />
              </label>
              <button
                type='submit'
                className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
                disabled={pending || name.trim() === (p.site ?? "")}
              >
                Save
              </button>
            </form>
          )}

          <div className={styles.actions}>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
              onClick={() => {
                setName(p.site ?? "");
                setEditing((open) => !open);
              }}
            >
              {editing ? "Keep this one" : "Change site"}
            </button>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              disabled={pending || !live}
              onClick={() => {
                onPull();
                run(
                  () => pullGrowth(clientId, "plausible"),
                  (data) => ({
                    message: "Pulled from Plausible",
                    detail: data?.through
                      ? `Visitors through ${fmtDayLong(data.through)}. They're on their Growth page now.`
                      : "Their site went live today: its first whole day comes in tonight.",
                  }),
                );
              }}
            >
              {pulling ? "Pulling…" : "Pull now"}
              <Icon name='refresh' className={ui.btnIcon} />
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/** Their visitors from Google: Search Console, and how the pulls go. */
function SearchConsole({
  clientId,
  admin,
  live,
  domain,
  pending,
  pulling,
  onPull,
  run,
}: {
  clientId: string;
  admin: GrowthAdmin;
  live: boolean;
  domain?: string;
  pending: boolean;
  pulling: boolean;
  onPull: () => void;
  run: Run;
}) {
  const [sites, setSites] = useState<string[]>();
  const [choice, setChoice] = useState(admin.property ?? "");
  const [copied, setCopied] = useState(false);
  const traffic = admin.sync.traffic;
  const connected = admin.stored > 0 && !traffic?.error;

  const copy = async () => {
    if (!admin.email) return;
    try {
      await navigator.clipboard.writeText(admin.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The address is on screen to copy by hand.
    }
  };

  return (
    <section className={styles.card}>
      <div className={`${styles.cardHead} ${styles.growthHead}`}>
        <div className={styles.titles}>
          <h2 className={styles.heading}>Visitors from Google</h2>
          <p>
            From their site&apos;s property in Google Search Console, every
            night, back to launch day: the Google panel and searches on their
            Growth page.
          </p>
        </div>
        <Pill
          tone={admin.keyProblem ? "red" : connected ? "lime" : "yellow"}
          dot
        >
          {admin.keyProblem
            ? "Key missing"
            : connected
              ? "Connected"
              : "Not connected yet"}
        </Pill>
      </div>

      {admin.keyProblem ? (
        <div className={`${ui.notice} ${ui.noticeBad}`}>
          <Icon name='info' className={ui.noticeIcon} />
          <p>
            {admin.keyProblem} The steps are in GROWTH.md: a service account in
            Google Cloud, its JSON key in Vercel.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.copyBox}>
            <span className={ui.label}>Add this address to their property</span>
            <div className={styles.copyRow}>
              <code className={styles.copyText}>{admin.email}</code>
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                onClick={copy}
              >
                {copied ? "Copied" : "Copy"}
                <Icon name={copied ? "check" : "copy"} className={ui.btnIcon} />
              </button>
            </div>
            <p className={styles.help}>
              In Search Console, open {domain ? `${domain}'s` : "their"}{" "}
              property → Settings → Users and permissions → Add user, paste it,
              and choose Restricted. Then pull.
            </p>
          </div>

          <dl className={styles.miniFacts}>
            <div className={styles.factWide}>
              <dt>Property</dt>
              <dd className={styles.propertyValue}>
                {admin.property ?? "Found from their domain on the first pull"}
              </dd>
            </div>
            <div>
              <dt>Numbers</dt>
              <dd>
                {admin.first && admin.through
                  ? `${fmtDayShort(admin.first)} – ${fmtDayShort(admin.through)}`
                  : "None yet"}
              </dd>
            </div>
            <div>
              <dt>Last pull</dt>
              <dd>
                {traffic?.at
                  ? `${fmtShort(traffic.at)}, ${fmtTime(traffic.at)}`
                  : "Not yet"}
              </dd>
            </div>
          </dl>

          {traffic?.error && (
            <div className={`${ui.notice} ${ui.noticeBad}`}>
              <Icon name='info' className={ui.noticeIcon} />
              <p>{traffic.error}</p>
            </div>
          )}

          {sites && (
            <div className={styles.pickRow}>
              <label className={ui.field}>
                <span className={ui.label}>Their property</span>
                <select
                  className={ui.select}
                  value={choice}
                  onChange={(e) => setChoice(e.target.value)}
                >
                  <option value=''>Find it from their domain</option>
                  {sites.map((site) => (
                    <option key={site} value={site}>
                      {site}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
                disabled={pending || choice === (admin.property ?? "")}
                onClick={() =>
                  run(
                    () => setSearchConsoleSite(clientId, choice || null),
                    () => {
                      setSites(undefined);
                      return {
                        message: "Property saved",
                        detail: "Pull now to read its numbers.",
                      };
                    },
                  )
                }
              >
                Use this one
              </button>
            </div>
          )}

          <div className={styles.actions}>
            {!sites && (
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                disabled={pending}
                onClick={() =>
                  run(
                    () => searchConsoleSites(clientId),
                    (data) => {
                      if (!data) return;
                      setSites(data.sites);
                      setChoice(admin.property ?? data.suggested ?? "");
                      return data.sites.length
                        ? undefined
                        : {
                            message: "No properties yet",
                            tone: "info",
                            detail:
                              "Search Console hasn't shared any with us. Add the address above to theirs first.",
                          };
                    },
                  )
                }
              >
                Change property
              </button>
            )}
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              disabled={pending || !live}
              onClick={() => {
                onPull();
                run(
                  () => pullGrowth(clientId, "google"),
                  (data) => ({
                    message: "Pulled from Google",
                    detail: data?.through
                      ? `Numbers through ${fmtDayLong(data.through)}. They're on their Growth page now.`
                      : "Google has no final numbers for their site yet. They come in two or three days after launch.",
                  }),
                );
              }}
            >
              {pulling ? "Pulling…" : "Pull now"}
              <Icon name='refresh' className={ui.btnIcon} />
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/** Their rating and reviews: which Google listing is theirs. */
function Reviews({
  clientId,
  admin,
  search,
  pending,
  run,
}: {
  clientId: string;
  admin: GrowthAdmin;
  search: string;
  pending: boolean;
  run: Run;
}) {
  const [text, setText] = useState(search);
  const [found, setFound] = useState<Listing[]>();
  const [changing, setChanging] = useState(!admin.placeId);
  const listing = admin.reviews;
  const error = admin.sync.reviews?.error;

  const find = () =>
    run(
      () => findGoogleListings(clientId, text),
      (list) => {
        setFound(list ?? []);
        return list?.length
          ? undefined
          : {
              message: "Nothing found",
              tone: "info",
              detail:
                "Try their name as it shows on Google Maps, and the city.",
            };
      },
    );

  return (
    <section className={styles.card}>
      <div className={`${styles.cardHead} ${styles.growthHead}`}>
        <div className={styles.titles}>
          <h2 className={styles.heading}>Google reviews</h2>
          <p>
            Their rating and how many reviews they have, from their Google
            listing every night. A small tile on their Growth page.
          </p>
        </div>
        <Pill tone={admin.placeId ? (error ? "yellow" : "lime") : "gray"} dot>
          {admin.placeId ? (error ? "Needs a look" : "Connected") : "Not set"}
        </Pill>
      </div>

      {admin.placeId && !changing && (
        <>
          {listing ? (
            <div className={styles.listing}>
              <span className={styles.listingName}>{listing.name}</span>
              {listing.address && (
                <span className={styles.help}>{listing.address}</span>
              )}
              <span className={styles.listingStats}>
                {listing.rating ? `${listing.rating.toFixed(1)} stars · ` : ""}
                {n(listing.total)} reviews
                {listing.since
                  ? ` · ${n(listing.added ?? 0)} new since ${fmtDayShort(listing.since)}`
                  : ""}
              </span>
            </div>
          ) : (
            <p className={styles.help}>
              Their numbers come in with tonight&apos;s pull.
            </p>
          )}
          {error && (
            <div className={`${ui.notice} ${ui.noticeBad}`}>
              <Icon name='info' className={ui.noticeIcon} />
              <p>{error}</p>
            </div>
          )}
          <div className={styles.actions}>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
              disabled={pending}
              onClick={() =>
                run(
                  () => setGoogleListing(clientId, null),
                  () => {
                    setChanging(true);
                    return {
                      message: "Listing removed",
                      tone: "info",
                      detail: "The reviews tile is off their Growth page.",
                    };
                  },
                )
              }
            >
              Remove
            </button>
            <button
              type='button'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              onClick={() => setChanging(true)}
            >
              Change listing
            </button>
          </div>
        </>
      )}

      {(changing || !admin.placeId) && (
        <>
          <form
            className={styles.pickRow}
            onSubmit={(e) => {
              e.preventDefault();
              find();
            }}
          >
            <label className={ui.field}>
              <span className={ui.label}>Their name and city</span>
              <input
                className={ui.input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder='e.g. Nier Transportation Phoenix'
              />
            </label>
            <button
              type='submit'
              className={`${ui.btn} ${ui.btn_black} ${ui.btnSmall}`}
              disabled={pending || !text.trim()}
            >
              Find
              <Icon name='search' className={ui.btnIcon} />
            </button>
          </form>

          {found && (
            <p className={styles.help}>
              Not theirs? Try the name exactly as Google Maps shows it, with the
              city. Or find it on{" "}
              <a
                href='https://developers.google.com/maps/documentation/places/web-service/place-id#find-id'
                target='_blank'
                rel='noopener noreferrer'
                className={styles.helpLink}
              >
                Google&apos;s Place ID Finder
              </a>{" "}
              and paste the ID (it starts with ChIJ) in the box above.
            </p>
          )}

          {found && found.length > 0 && (
            <ul className={styles.listingList}>
              {found.map((place) => (
                <li key={place.id} className={styles.listingItem}>
                  <span className={styles.listingText}>
                    <span className={styles.listingName}>{place.name}</span>
                    <span className={styles.help}>
                      {place.address ?? "No storefront: a service area"}
                    </span>
                    <span className={styles.listingStats}>
                      {place.rating
                        ? `${place.rating.toFixed(1)} stars · `
                        : ""}
                      {n(place.reviews)} reviews
                    </span>
                  </span>
                  <button
                    type='button'
                    className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                    disabled={pending}
                    onClick={() =>
                      run(
                        () => setGoogleListing(clientId, place.id),
                        () => {
                          setChanging(false);
                          setFound(undefined);
                          return {
                            message: "Listing connected",
                            detail: `${place.name}: ${n(place.reviews)} reviews. The tile is on their Growth page now.`,
                          };
                        },
                      )
                    }
                  >
                    Use this one
                  </button>
                </li>
              ))}
            </ul>
          )}

          {admin.placeId && (
            <div className={styles.actions}>
              <button
                type='button'
                className={`${ui.btn} ${ui.btn_light} ${ui.btnSmall}`}
                onClick={() => {
                  setChanging(false);
                  setFound(undefined);
                }}
              >
                Keep the one they have
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
