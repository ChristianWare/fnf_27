"use client";

// Make a preview for one prospect: their business (filled in from their
// prospect page), the market (which brings its airports, areas, wording
// and photos), the two photos they can swap for their own, and the
// preview's address and length. The summary on the right says what gets
// made. "Make the preview" sends it all to the demo platform (fnf-demos)
// and goes back to their page, where the preview's link now is.
//
// With `editing`, the same form changes a live preview in place: its name,
// contact details and photos. The market, address and length stay (a new
// market would mean new airports and bookings; a new address would break
// the link they already have).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Dashboard/icons";
import { Panel, Pill, btn, ui } from "@/components/Dashboard/ui/ui";
import { useToast } from "@/components/Dashboard/Toast/Toast";
import { editPreview, makePreview } from "@/app/admin/demos/actions";
import type { PreviewEditing } from "@/lib/demos/preview";
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
  /** Editing: their photo already on the preview, until it's replaced. */
  current?: string | null;
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

const startPhoto = (current: string | null | undefined): PhotoChoice =>
  current ? { own: true, file: null, current } : DEFAULT_PHOTO;

/** What to send for a photo when editing: a new file, "default", or
 *  nothing (keep what's there). */
function editedPhoto(choice: PhotoChoice, had: string | null): File | "default" | null {
  if (choice.own && choice.file) return choice.file.blob;
  if (choice.own && choice.current) return null;
  return had ? "default" : null;
}

export default function PreviewForm({
  p,
  now,
  editing,
}: {
  p: ProspectView;
  now: string;
  /** A live preview to change in place, instead of making a new one. */
  editing?: PreviewEditing;
}) {
  const router = useRouter();
  const toast = useToast();

  // A photo dropped just outside a slot would make the browser open it
  // and lose the form: ignore drops anywhere else on the page.
  useEffect(() => {
    const stop = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("dragover", stop);
      window.removeEventListener("drop", stop);
    };
  }, []);

  const [business, setBusiness] = useState(editing?.business ?? p.business);
  const [slug, setSlug] = useState(
    editing ? editing.url.replace(/^https?:\/\//, "").split(".")[0] : demoSlug(p.business),
  );
  const [slugEdited, setSlugEdited] = useState(false);
  const [marketId, setMarketId] = useState(editing?.marketId ?? marketFor(p.state).id);
  const [days, setDays] = useState<number>(30);
  const [hero, setHero] = useState<PhotoChoice>(startPhoto(editing?.heroUrl));
  const [about, setAbout] = useState<PhotoChoice>(startPhoto(editing?.aboutUrl));
  const [pending, setPending] = useState(false);

  const market = DEMO_MARKETS.find((m) => m.id === marketId) ?? DEMO_MARKETS[0];
  const expires = useMemo(
    () => editing?.expiresAt ?? new Date(new Date(now).getTime() + days * 86_400_000).toISOString(),
    [now, days, editing?.expiresAt],
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

  const ownCount = [hero, about].filter((x) => x.own && (x.file || x.current)).length;
  // "Their own" with no photo picked yet still counts as the default.
  const ready = business.trim().length > 1;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!ready || pending) return;
    // The named fields (contact, phone, email…), then the rest.
    const form = new FormData(e.currentTarget);
    form.set("ref", p.id);
    if (editing) {
      form.set("business", business.trim());
      const heroSend = editedPhoto(hero, editing.heroUrl);
      const aboutSend = editedPhoto(about, editing.aboutUrl);
      if (heroSend) form.set("hero", heroSend);
      if (aboutSend) form.set("about", aboutSend);
      setPending(true);
      const res = await editPreview(editing.id, form);
      setPending(false);
      if (!res.ok) {
        toast("The preview wasn't changed", { tone: "error", detail: res.error });
        return;
      }
      toast("Preview updated", { detail: "It can take up to half a minute to show everywhere." });
      router.push(`/admin/prospects/${p.id}`);
      router.refresh();
      return;
    }
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
          text={
            editing
              ? "What their preview shows now. Change anything and save: it changes on the preview only."
              : "Filled in from their prospect page. Change anything here and it changes on the preview only."
          }
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
            <Field
              label='Short name for the logo'
              name='shortName'
              value={editing?.shortName}
              placeholder='Optional, e.g. Desert Star'
            />
            <Field label='Contact name' name='contactName' value={editing?.contactName ?? p.contactName} />
            <Field label='Phone on the site' name='phone' value={editing?.phone ?? p.phone} type='tel' />
            <Field label='Email on the site' name='email' value={editing?.email ?? p.email} type='email' />
            <Field
              label='Office address'
              name='address'
              value={editing?.address}
              placeholder='Optional. Without one, the site shows their city.'
              wide
            />
          </div>
        </Panel>

        {/* ── Market ── */}
        {!editing && (
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
        )}

        {/* ── Photos ── */}
        <Panel
          title='Photos'
          text={
            editing
              ? `Swap either photo for a new one of theirs, or go back to the ${market.city} one.`
              : `Their site starts with the ${market.city} photos. Swap either one for a photo of theirs, from their Instagram or Facebook. Used only inside their private preview.`
          }
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
        {!editing && (
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
        )}
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
            {editing ? (
              <li>
                <Icon name='history' className={styles.madeIcon} />
                Same link, logins, bookings and visits
              </li>
            ) : (
              <li>
                <Icon name='booking' className={styles.madeIcon} />
                Booking and test payments
              </li>
            )}
            <li>
              <Icon name='image' className={styles.madeIcon} />
              {ownCount === 2
                ? "Their own photos on the home and About pages"
                : ownCount === 1
                  ? `One of their photos, one of ${market.city}`
                  : `The ${market.city} photos`}
            </li>
            {!editing && (
              <li>
                <Icon name='users' className={styles.madeIcon} />
                Admin, driver and rider logins
              </li>
            )}
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
            {editing ? (pending ? "Saving…" : "Save changes") : pending ? "Making it…" : "Make the preview"}
            <Icon name={editing ? "check" : "sparkle"} className={styles.btnIcon} />
          </button>
          <Link href={`/admin/prospects/${p.id}`} className={`${btn("white")} ${styles.submit}`}>
            Cancel
          </Link>
          <p className={styles.summaryNote}>
            {editing
              ? "Changes their live preview. It can take up to half a minute to show everywhere."
              : "Takes about half a minute. Then their link and logins are on their page."}
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
  const [over, setOver] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // dragenter/dragleave fire for every child; count them so the
  // highlight doesn't flicker while the photo moves across the slot.
  const depth = useRef(0);

  const takePhoto = async (f: File) => {
    setProblem(null);
    try {
      const blob = await shrink(f);
      if (value.file) URL.revokeObjectURL(value.file.url);
      onChange({ own: true, file: { url: URL.createObjectURL(blob), name: f.name, blob } });
    } catch {
      setProblem("That photo couldn't be read. Try a JPG or PNG.");
    }
  };

  const pick = async (files: FileList | null) => {
    const f = [...(files ?? [])].find((x) => x.type.startsWith("image/"));
    if (fileRef.current) fileRef.current.value = "";
    if (f) await takePhoto(f);
    else if (files?.length) setProblem("That isn't a photo. Use a JPG or PNG.");
  };

  /** A photo dragged in: a file from Finder or the desktop, or (when the
   *  site allows it) an image dragged straight from another tab. */
  const dropped = async (data: DataTransfer) => {
    if (data.files.length) return pick(data.files);
    const html = data.getData("text/html");
    const src =
      html.match(/<img[^>]+src="([^"]+)"/i)?.[1]?.replace(/&amp;/g, "&") ||
      data.getData("text/uri-list").split("\n").find((l) => l && !l.startsWith("#")) ||
      "";
    if (!/^(https?:|data:image\/)/i.test(src)) {
      setProblem("That isn't a photo. Use a JPG or PNG.");
      return;
    }
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) throw new Error("not an image");
      const ext = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
      await takePhoto(new File([blob], `photo.${ext}`, { type: blob.type }));
    } catch {
      setProblem("That site won't let its photos be dragged straight in. Save the photo to your Mac first, then drag the file here.");
    }
  };

  const dragProps = {
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      depth.current++;
      setOver(true);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: () => {
      depth.current = Math.max(0, depth.current - 1);
      if (!depth.current) setOver(false);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      depth.current = 0;
      setOver(false);
      void dropped(e.dataTransfer);
    },
  };

  const clear = () => {
    if (value.file) URL.revokeObjectURL(value.file.url);
    onChange({ own: true, file: null, current: null });
  };

  return (
    <div className={`${styles.slot} ${over ? styles.slotOver : ""}`} {...dragProps}>
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
      ) : value.current ? (
        <figure className={styles.slotPhoto}>
          {/* Their photo on the preview now (Cloudinary). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.current} alt={`${title} photo now`} className={styles.photoImg} />
          <span className={styles.slotTag}>
            <Pill tone='white'>On their preview</Pill>
          </span>
          <button
            type='button'
            className={styles.photoRemove}
            aria-label={`Replace the ${title.toLowerCase()} photo`}
            onClick={clear}
          >
            <Icon name='close' />
          </button>
        </figure>
      ) : (
        <label className={`${styles.drop} ${styles.slotDrop} ${over ? styles.dropOver : ""}`}>
          <Icon name='upload' className={styles.dropIcon} />
          <span className={styles.dropText}>{over ? "Drop it here" : "Add their photo"}</span>
          <span className={styles.dropNote}>Click or drag a photo here. A wide one works best.</span>
          <input
            ref={fileRef}
            type='file'
            accept='image/*'
            className={ui.srOnly}
            onChange={(e) => void pick(e.target.files)}
          />
        </label>
      )}
      {over && value.own && (value.file || value.current) && (
        <p className={styles.slotHint}>Drop to replace this photo</p>
      )}
      {problem && (
        <p className={styles.slotProblem} role='alert'>
          {problem}
        </p>
      )}
    </div>
  );
}
