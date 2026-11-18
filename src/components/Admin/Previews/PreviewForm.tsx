"use client";

// Make a preview for one prospect: their business (filled in from their
// prospect page), the market (which brings its airports and areas), the
// services and vehicles they run, a few photos, and the preview's address
// and length. The summary on the right says what gets made.
//
// Screens only for now: "Make the preview" makes nothing yet. It goes back
// to their page and shows a sample of what a made preview looks like.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { Panel, Pill, btn, ui } from "@/components/Dashboard/ui/ui";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { fmtDate } from "@/lib/dashboard/format";
import type { ProspectView } from "@/lib/prospects/view";
import {
  DEMO_DAYS,
  DEMO_DOMAIN,
  DEMO_MARKETS,
  DEMO_SERVICES,
  DEMO_VEHICLES,
  demoSlug,
  marketFor,
} from "@/lib/demos/options";
import styles from "./PreviewForm.module.css";

const MAX_PHOTOS = 6;

export default function PreviewForm({ p, now }: { p: ProspectView; now: string }) {
  const router = useRouter();
  const toast = useToast();
  const [business, setBusiness] = useState(p.business);
  const [slug, setSlug] = useState(demoSlug(p.business));
  const [slugEdited, setSlugEdited] = useState(false);
  const [marketId, setMarketId] = useState(marketFor(p.state).id);
  const [services, setServices] = useState<string[]>(
    DEMO_SERVICES.filter((s) => s.on).map((s) => s.id),
  );
  const [vehicles, setVehicles] = useState<string[]>(
    DEMO_VEHICLES.filter((v) => v.on).map((v) => v.id),
  );
  const [days, setDays] = useState<number>(30);
  const [photos, setPhotos] = useState<{ id: string; url: string; name: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const market = DEMO_MARKETS.find((m) => m.id === marketId) ?? DEMO_MARKETS[0];
  const expires = useMemo(
    () => new Date(new Date(now).getTime() + days * 86_400_000).toISOString(),
    [now, days],
  );

  // Photo previews live only in this tab; let them go when it closes.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((x) => URL.revokeObjectURL(x.url)), []);

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_PHOTOS - photos.length;
    const picked = [...files].filter((f) => f.type.startsWith("image/")).slice(0, room);
    setPhotos((list) => [
      ...list,
      ...picked.map((f) => ({
        id: `${f.name}-${f.size}-${f.lastModified}`,
        url: URL.createObjectURL(f),
        name: f.name,
      })),
    ]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = (id: string) =>
    setPhotos((list) => {
      const gone = list.find((x) => x.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return list.filter((x) => x.id !== id);
    });

  const ready = business.trim().length > 1 && services.length > 0 && vehicles.length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    toast("Nothing was made yet", {
      detail: "Previews are screens only for now. Here's how a made one will look.",
    });
    router.push(`/admin/prospects/${p.id}?preview=sample`);
  };

  return (
    <form className={styles.layout} onSubmit={submit}>
      <div className={styles.main}>
        {/* ── Their business ── */}
        <Panel
          title='Their business'
          text='Filled in from their prospect page. Change anything here and it changes on the preview only.'
        >
          <div className={styles.grid}>
            <label className={`${ui.field} ${styles.wide}`}>
              <span className={ui.label}>Business name</span>
              <input
                className={ui.input}
                value={business}
                required
                onChange={(e) => {
                  setBusiness(e.target.value);
                  if (!slugEdited) setSlug(demoSlug(e.target.value));
                }}
              />
            </label>
            <Field label='Short name for the logo' name='shortName' placeholder='Optional, e.g. Desert Star' />
            <Field label='Contact name' name='contactName' value={p.contactName} />
            <Field label='Phone on the site' name='phone' value={p.phone} type='tel' />
            <Field label='Email on the site' name='email' value={p.email} type='email' />
            <Field
              label='Office address'
              name='address'
              placeholder='Optional. Without one, the site shows their city.'
              wide
            />
          </div>
        </Panel>

        {/* ── Market ── */}
        <Panel
          title='Market'
          text='Sets the airports, neighborhoods, time zone and sample trips on their site.'
        >
          <div className={styles.markets} role='radiogroup' aria-label='Market'>
            {DEMO_MARKETS.map((m) => (
              <button
                key={m.id}
                type='button'
                role='radio'
                aria-checked={marketId === m.id}
                className={styles.market}
                onClick={() => setMarketId(m.id)}
              >
                <span className={styles.marketName}>
                  {m.city}, {m.state}
                </span>
                <span className={styles.marketNote}>
                  {m.airports.filter((a) => a.kind === "commercial").map((a) => a.code).join(", ")} ·{" "}
                  {m.timeZone} time
                </span>
                <span className={styles.marketTag}>
                  {m.ready ? (
                    <Pill tone='lime'>Ready</Pill>
                  ) : (
                    <Pill tone='yellow'>Market not built yet</Pill>
                  )}
                </span>
              </button>
            ))}
          </div>

          <div className={styles.marketDetail}>
            <div className={styles.detailCol}>
              <span className={ui.monoMuted}>Airports</span>
              <ul className={styles.airports}>
                {market.airports.map((a) => (
                  <li key={a.code}>
                    <span className={styles.code}>{a.code}</span>
                    {a.name}
                    <span className={styles.kind}>{a.kind === "private" ? "Private aviation" : "Commercial"}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.detailCol}>
              <span className={ui.monoMuted}>Areas on the site</span>
              <div className={styles.areaList}>
                {market.areas.map((a) => (
                  <span key={a} className={styles.area}>
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {!market.ready && (
            <p className={styles.help}>
              {market.city} still needs its market built on the demo platform. Pick Las
              Vegas to see a ready one.
            </p>
          )}
        </Panel>

        {/* ── Services ── */}
        <Panel title='Services' text='What their site offers and the booking tool lets riders pick.'>
          <div className={styles.checks}>
            {DEMO_SERVICES.map((s) => (
              <Check
                key={s.id}
                label={s.label}
                checked={services.includes(s.id)}
                onChange={() => setServices((list) => toggle(list, s.id))}
              />
            ))}
          </div>
        </Panel>

        {/* ── Fleet ── */}
        <Panel title='Fleet' text='Each gets a fleet page and sample rates, marked as samples.'>
          <div className={styles.checks}>
            {DEMO_VEHICLES.map((v) => (
              <Check
                key={v.id}
                label={v.label}
                note={v.seats}
                checked={vehicles.includes(v.id)}
                onChange={() => setVehicles((list) => toggle(list, v.id))}
              />
            ))}
          </div>
        </Panel>

        {/* ── Photos ── */}
        <Panel
          title='Photos'
          text='Up to 6 of their own, from their Instagram or Facebook. Used only inside their private preview. Without any, it uses photos of the city.'
        >
          <div className={styles.photos}>
            {photos.map((ph) => (
              <figure key={ph.id} className={styles.photo}>
                {/* Local previews of files they picked; not served by Next. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ph.url} alt={ph.name} className={styles.photoImg} />
                <button
                  type='button'
                  className={styles.photoRemove}
                  aria-label={`Remove ${ph.name}`}
                  onClick={() => removePhoto(ph.id)}
                >
                  <Icon name='close' />
                </button>
              </figure>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className={styles.drop}>
                <Icon name='upload' className={styles.dropIcon} />
                <span className={styles.dropText}>Add photos</span>
                <span className={styles.dropNote}>{MAX_PHOTOS - photos.length} more</span>
                <input
                  ref={fileRef}
                  type='file'
                  accept='image/*'
                  multiple
                  className={ui.srOnly}
                  onChange={(e) => addPhotos(e.target.files)}
                />
              </label>
            )}
          </div>
        </Panel>

        {/* ── Address and length ── */}
        <Panel title='Address and length'>
          <label className={ui.field}>
            <span className={ui.label}>Address</span>
            <span className={styles.slug}>
              <span className={styles.slugPre}>https://</span>
              <input
                className={styles.slugInput}
                value={slug}
                aria-label='Preview address'
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlug(demoSlug(e.target.value) || e.target.value.toLowerCase());
                }}
              />
              <span className={styles.slugPost}>.{DEMO_DOMAIN}</span>
            </span>
          </label>
          <div className={styles.daysRow}>
            <span className={ui.label}>Live for</span>
            <div className={ui.chips} role='radiogroup' aria-label='Live for'>
              {DEMO_DAYS.map((d) => (
                <button
                  key={d}
                  type='button'
                  role='radio'
                  aria-checked={days === d}
                  className={ui.chip}
                  onClick={() => setDays(d)}
                >
                  {d} days
                </button>
              ))}
            </div>
          </div>
          <label className={ui.field}>
            <span className={ui.label}>Notes to yourself</span>
            <textarea
              className={ui.textarea}
              rows={3}
              placeholder='When the walkthrough is, what they care about, what to show first'
            />
          </label>
        </Panel>
      </div>

      {/* ── What gets made ── */}
      <aside className={styles.side}>
        <div className={styles.summary}>
          <span className={styles.summaryEyebrow}>Their preview</span>
          <p className={styles.summaryName}>{business || "Their business"}</p>
          <p className={styles.summaryHost}>
            {slug || "their-name"}.{DEMO_DOMAIN}
          </p>

          <ul className={styles.made}>
            <li>
              <Icon name='globe' className={styles.madeIcon} />
              Their site in {market.city}, with {market.airports.length} airports
            </li>
            <li>
              <Icon name='booking' className={styles.madeIcon} />
              Booking and test payments for {services.length} service
              {services.length === 1 ? "" : "s"}
            </li>
            <li>
              <Icon name='card' className={styles.madeIcon} />
              {vehicles.length} vehicle type{vehicles.length === 1 ? "" : "s"} with sample rates
            </li>
            <li>
              <Icon name='users' className={styles.madeIcon} />
              Admin, driver and rider logins
            </li>
            <li>
              <Icon name='calendar' className={styles.madeIcon} />
              A few sample bookings, marked as samples
            </li>
          </ul>

          <dl className={styles.summaryFacts}>
            <div>
              <dt>Live until</dt>
              <dd>{fmtDate(expires)}</dd>
            </div>
            <div>
              <dt>Emails to them</dt>
              <dd>None. You send the link.</dd>
            </div>
          </dl>

          <button type='submit' className={`${btn("lime")} ${styles.submit}`} disabled={!ready}>
            Make the preview
            <Icon name='sparkle' className={styles.btnIcon} />
          </button>
          <Link href={`/admin/prospects/${p.id}`} className={`${btn("white")} ${styles.submit}`}>
            Cancel
          </Link>
          <p className={styles.summaryNote}>
            Screens only for now: nothing is made yet. You&apos;ll see a sample on their page.
          </p>
        </div>
      </aside>
    </form>
  );
}

function Field({
  label,
  name,
  value,
  placeholder,
  type = "text",
  wide,
}: {
  label: string;
  name: string;
  value?: string;
  placeholder?: string;
  type?: string;
  wide?: boolean;
}) {
  return (
    <label className={`${ui.field} ${wide ? styles.wide : ""}`}>
      <span className={ui.label}>{label}</span>
      <input className={ui.input} name={name} type={type} defaultValue={value} placeholder={placeholder} />
    </label>
  );
}

function Check({
  label,
  note,
  checked,
  onChange,
}: {
  label: string;
  note?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className={styles.check}>
      <input type='checkbox' className={styles.checkInput} checked={checked} onChange={onChange} />
      <span className={styles.checkBox} aria-hidden='true'>
        <Icon name='check' />
      </span>
      <span className={styles.checkText}>
        {label}
        {note && <span className={styles.checkNote}>{note}</span>}
      </span>
    </label>
  );
}
