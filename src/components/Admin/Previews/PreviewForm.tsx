"use client";

// Make a preview for one prospect: their business (filled in from their
// prospect page), the market (which brings its airports, areas, wording
// and photos), the two photos they can swap for their own, and the
// preview's address and length. The summary on the right says what gets
// made. "Make the preview" sends it all to the demo platform (fnf-demos)
// and goes back to their page, where the preview's link now is.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { Panel, Pill, btn, ui } from "@/components/Dashboard/ui/ui";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { makePreview } from "@/app/admin/demos/actions";
import { fmtDate } from "@/lib/dashboard/format";
import type { ProspectView } from "@/lib/prospects/view";
import {
  DEMO_ABOUT_THUMB,
  DEMO_DAYS,
  DEMO_DOMAIN,
  DEMO_MARKETS,
  type DemoMarket,
  demoSlug,
  marketFor,
} from "@/lib/demos/options";
import styles from "./PreviewForm.module.css";

/** One of the two photos: the market's default, or one of theirs. */
type PhotoChoice = {
  own: boolean;
  /** Their photo, already made smaller for the upload, and its preview. */
  file: { url: string; name: string; blob: File } | null;
};

/** Their photo at most 2400px wide, as a JPEG: phone photos are often
 *  several MB, and the upload has to stay small. */
async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / bitmap.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.82));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

const DEFAULT_PHOTO: PhotoChoice = { own: false, file: null };

export default function PreviewForm({ p, now }: { p: ProspectView; now: string }) {
  const router = useRouter();
  const toast = useToast();
  const [business, setBusiness] = useState(p.business);
  const [slug, setSlug] = useState(demoSlug(p.business));
  const [slugEdited, setSlugEdited] = useState(false);
  const [marketId, setMarketId] = useState(marketFor(p.state).id);
  const [days, setDays] = useState<number>(30);
  const [hero, setHero] = useState<PhotoChoice>(DEFAULT_PHOTO);
  const [about, setAbout] = useState<PhotoChoice>(DEFAULT_PHOTO);
  const [pending, setPending] = useState(false);

  const market = DEMO_MARKETS.find((m) => m.id === marketId) ?? DEMO_MARKETS[0];
  const expires = useMemo(
    () => new Date(new Date(now).getTime() + days * 86_400_000).toISOString(),
    [now, days],
  );

  // Photo previews live only in this tab; let them go when it closes.
  const filesRef = useRef([hero.file, about.file]);
  useEffect(() => {
    filesRef.current = [hero.file, about.file];
  }, [hero.file, about.file]);
  useEffect(
    () => () => filesRef.current.forEach((f) => f && URL.revokeObjectURL(f.url)),
    [],
  );

  const ownCount = [hero, about].filter((x) => x.own && x.file).length;
  // "Their own" with no photo picked yet still counts as the default.
  const ready = business.trim().length > 1;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!ready || pending) return;
    // The named fields (contact, phone, email…), then the rest.
    const form = new FormData(e.currentTarget);
    form.set("ref", p.id);
    form.set("business", business.trim());
    form.set("slug", slug);
    form.set("marketId", marketId);
    form.set("days", String(days));
    if (hero.own && hero.file) form.set("hero", hero.file.blob);
    if (about.own && about.file) form.set("about", about.file.blob);

    setPending(true);
    const res = await makePreview(form);
    setPending(false);
    if (!res.ok) {
      toast("The preview wasn't made", { tone: "error", detail: res.error });
      return;
    }
    toast("Preview made", { detail: res.data?.url.replace(/^https:\/\//, "") });
    router.push(`/admin/prospects/${p.id}`);
    router.refresh();
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
          text='Sets the airports, neighborhoods, time zone, wording and photos on their site.'
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
                    <span className={styles.kind}>
                      {a.kind === "private" ? "Private aviation" : a.kind === "tours" ? "Air tours" : "Commercial"}
                    </span>
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
        </Panel>

        {/* ── Photos ── */}
        <Panel
          title='Photos'
          text={`Their site starts with the ${market.city} photos. Swap either one for a photo of theirs, from their Instagram or Facebook. Used only inside their private preview.`}
        >
          <div className={styles.slots}>
            <PhotoSlot
              title='Home page'
              note='The big photo at the top.'
              market={market}
              defaultSrc={market.heroThumb}
              value={hero}
              onChange={setHero}
            />
            <PhotoSlot
              title='About page'
              note='The wide photo under the heading.'
              market={market}
              defaultSrc={DEMO_ABOUT_THUMB}
              value={about}
              onChange={setAbout}
            />
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
              Booking and test payments
            </li>
            <li>
              <Icon name='image' className={styles.madeIcon} />
              {ownCount === 2
                ? "Their own photos on the home and About pages"
                : ownCount === 1
                  ? `One of their photos, one of ${market.city}`
                  : `The ${market.city} photos`}
            </li>
            <li>
              <Icon name='users' className={styles.madeIcon} />
              Admin, driver and rider logins
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

          <button
            type='submit'
            className={`${btn("lime")} ${styles.submit}`}
            disabled={!ready || pending}
            aria-busy={pending}
          >
            {pending ? "Making it…" : "Make the preview"}
            <Icon name='sparkle' className={styles.btnIcon} />
          </button>
          <Link href={`/admin/prospects/${p.id}`} className={`${btn("white")} ${styles.submit}`}>
            Cancel
          </Link>
          <p className={styles.summaryNote}>
            Takes about half a minute. Then their link and logins are on their page.
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

/** One of the two photos: the market's default or their own, with a
 *  preview of whichever the site will use. */
function PhotoSlot({
  title,
  note,
  market,
  defaultSrc,
  value,
  onChange,
}: {
  title: string;
  note: string;
  market: DemoMarket;
  defaultSrc: string;
  value: PhotoChoice;
  onChange: (next: PhotoChoice) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = async (files: FileList | null) => {
    const f = [...(files ?? [])].find((x) => x.type.startsWith("image/"));
    if (fileRef.current) fileRef.current.value = "";
    if (!f) return;
    const blob = await shrink(f);
    if (value.file) URL.revokeObjectURL(value.file.url);
    onChange({ own: true, file: { url: URL.createObjectURL(blob), name: f.name, blob } });
  };

  const clear = () => {
    if (value.file) URL.revokeObjectURL(value.file.url);
    onChange({ own: true, file: null });
  };

  return (
    <div className={styles.slot}>
      <div className={styles.slotHead}>
        <span className={styles.slotTitle}>{title}</span>
        <span className={styles.slotNote}>{note}</span>
      </div>

      <div className={ui.chips} role='radiogroup' aria-label={`${title} photo`}>
        <button
          type='button'
          role='radio'
          aria-checked={!value.own}
          className={ui.chip}
          onClick={() => onChange({ ...value, own: false })}
        >
          The {market.city} default
        </button>
        <button
          type='button'
          role='radio'
          aria-checked={value.own}
          className={ui.chip}
          onClick={() => onChange({ ...value, own: true })}
        >
          Their own
        </button>
      </div>

      {!value.own ? (
        <figure className={styles.slotPhoto}>
          {/* A small copy of the demo platform's photo, from /public. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={defaultSrc} alt='' className={styles.photoImg} />
          <span className={styles.slotTag}>
            <Pill tone='white'>{market.city} default</Pill>
          </span>
        </figure>
      ) : value.file ? (
        <figure className={styles.slotPhoto}>
          {/* A local preview of the file they picked; not served by Next. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.file.url} alt={value.file.name} className={styles.photoImg} />
          <button
            type='button'
            className={styles.photoRemove}
            aria-label={`Remove ${value.file.name}`}
            onClick={clear}
          >
            <Icon name='close' />
          </button>
        </figure>
      ) : (
        <label className={`${styles.drop} ${styles.slotDrop}`}>
          <Icon name='upload' className={styles.dropIcon} />
          <span className={styles.dropText}>Add their photo</span>
          <span className={styles.dropNote}>A wide one works best</span>
          <input
            ref={fileRef}
            type='file'
            accept='image/*'
            className={ui.srOnly}
            onChange={(e) => void pick(e.target.files)}
          />
        </label>
      )}
    </div>
  );
}
