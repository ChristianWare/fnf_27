// The full audit as a PDF: the score and the six checks on the first page,
// then every check in detail, the searches, the operators nearby, and how
// it was checked. Emailed when an operator asks for the full report, and
// downloadable from the report page. The same fonts and colors as the
// invoices. Server only: it reads the fonts and the logo from /public.

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { fmtDate } from "@/lib/dashboard/format";
import { CALL_BELOW, CHECKS } from "./kinds";
import type { AuditView, Part } from "./types";
import type { SemrushData } from "./semrush/types";
import {
  monthName,
  monthShort,
  pagePath,
  placeOf,
  semrushInsights,
  usd,
} from "./semrush/insights";

const publicDir = path.join(process.cwd(), "public");
const font = (file: string) => path.join(publicDir, "fonts", file);

// The audit's own names for the invoice's faces, each file registered once.
// react-pdf keeps a font's glyphs between documents, and when one file is
// loaded under two names and both are used in a document, the next
// documents lose letters. So nothing here shares a font with the invoice,
// and every piece of text is set in one of these two.
const SANS = "AuditSans";
const MONO = "AuditMono";
const families = new Set(Font.getRegisteredFontFamilies());
if (!families.has(SANS))
  Font.register({
    family: SANS,
    fonts: [
      { src: font("CreatoDisplay-Medium.otf") },
      { src: font("CreatoDisplay-Bold.otf"), fontWeight: 700 },
    ],
  });
// A Latin subset of IBM Plex Mono saved for PDFs, as the invoice uses.
if (!families.has(MONO))
  Font.register({ family: MONO, src: font("pdf/IBMPlexMono-Medium.ttf") });
Font.registerHyphenationCallback((word) => [word]);

/** Creato's characters; anything else is swapped for one of them, or left out. */
const NOT_IN_FONT =
  /[^\n\u0020-\u007e\u00a1-\u00ff\u0131\u0141\u0142\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02c7\u02d8-\u02dd\u03c0\u2013\u2014\u2018-\u201a\u201c-\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u2044\u20ac\u2122\u2126\u2202\u2206\u220f\u2211\u2212\u221a\u221e\u222b\u2248\u2260\u2264\u2265\u25ca]/g;

const fit = (text: string) =>
  text
    .normalize("NFC")
    .replace(/(\d(?:\.\d)?)\s?\u2605/g, "$1 stars")
    .replace(/\u2605/g, "*")
    .replace(/\u2192/g, "\u203a")
    .replace(/\u2190/g, "\u2039")
    .replace(/[\u2713\u2714]/g, "\u2022")
    .replace(/[\u00a0\u2009\u202f]/g, " ")
    .replace(/[\u2010\u2011]/g, "-")
    .replace(NOT_IN_FONT, "");

/** Every piece of text in the view, made safe for the fonts. */
function fitAll<T>(value: T, key?: string): T {
  if (typeof value === "string")
    return (key === "phoneShot" ? value : fit(value)) as T;
  if (Array.isArray(value)) return value.map((v) => fitAll(v)) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, fitAll(v, k)]),
    ) as T;
  return value;
}

const BLACK = "#0d0d0e";
const TEXT = "#6d7885";
const LIGHT = "#f1f2f4";
const LIGHT2 = "#e0e2e5";
const MINT = "#b5f2e0";
const PURPLE = "#c1b7ff";
const LIME = "#d1ff93";
const YELLOW = "#fff78b";
const RED = "#ffd6d6";

const TONES: Record<string, string> = {
  red: RED,
  yellow: YELLOW,
  mint: MINT,
  lime: LIME,
};
const CARD_TONES = [MINT, PURPLE, LIME];

const s = StyleSheet.create({
  page: {
    paddingTop: 44,
    paddingBottom: 64,
    paddingHorizontal: 44,
    fontFamily: SANS,
    fontSize: 10,
    lineHeight: 1.4,
    color: BLACK,
  },
  mono: {
    fontFamily: MONO,
    fontSize: 7.5,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: TEXT,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 34, height: 21 },
  brandName: { fontFamily: SANS, fontSize: 13 },
  title: {
    fontFamily: SANS,
    fontSize: 30,
    letterSpacing: -0.8,
    lineHeight: 1.05,
    marginTop: 22,
  },
  subtitle: { fontSize: 10.5, color: TEXT, marginTop: 6 },
  scoreRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  scoreCard: {
    width: 170,
    padding: 16,
    borderRadius: 14,
    backgroundColor: BLACK,
  },
  scoreNumber: {
    fontFamily: SANS,
    fontSize: 54,
    lineHeight: 1,
    color: "#ffffff",
    letterSpacing: -2,
  },
  scoreOf: { fontFamily: SANS, fontSize: 18, color: "#9aa3ad" },
  scoreLabel: {
    fontFamily: MONO,
    fontSize: 7.5,
    color: "#c9cdd2",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: LIGHT,
    justifyContent: "space-between",
  },
  pill: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 20,
    fontFamily: MONO,
    fontSize: 7.5,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: BLACK,
  },
  summary: { fontFamily: SANS, fontSize: 14, lineHeight: 1.3, marginTop: 10 },
  h2: {
    fontFamily: SANS,
    fontSize: 17,
    letterSpacing: -0.3,
    marginTop: 20,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT2,
    gap: 10,
  },
  rowName: { flex: 1, fontFamily: SANS, fontSize: 10.5 },
  rowScore: { width: 44, fontFamily: SANS, fontSize: 12, textAlign: "right" },
  tops: { flexDirection: "row", gap: 8 },
  top: { flex: 1, padding: 12, borderRadius: 12, gap: 6 },
  topName: { fontFamily: SANS, fontSize: 11 },
  small: { fontSize: 8.5, lineHeight: 1.4 },
  check: {
    marginTop: 18,
    padding: 16,
    borderRadius: 14,
    backgroundColor: LIGHT,
  },
  checkHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  checkName: { fontFamily: SANS, fontSize: 14 },
  checkScore: { fontFamily: SANS, fontSize: 14 },
  fix: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  part: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: LIGHT2,
  },
  state: {
    width: 58,
    alignSelf: "flex-start",
    paddingVertical: 3,
    borderRadius: 10,
    fontFamily: MONO,
    fontSize: 6.5,
    textAlign: "center",
    textTransform: "uppercase",
  },
  partBody: { flex: 1, gap: 2 },
  partLabel: { fontFamily: SANS, fontSize: 9.5 },
  quote: { fontSize: 8.5, color: TEXT, fontStyle: "normal" },
  table: { marginTop: 4 },
  th: {
    flexDirection: "row",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
  },
  tr: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT2,
  },
  shotRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 4,
    alignItems: "flex-start",
  },
  shot: { width: 140, borderRadius: 10, borderWidth: 1, borderColor: LIGHT2 },
  next: {
    marginTop: 24,
    padding: 18,
    borderRadius: 14,
    backgroundColor: BLACK,
  },
  nextText: {
    fontFamily: SANS,
    fontSize: 13,
    color: "#ffffff",
    lineHeight: 1.3,
  },
  nextLink: {
    fontFamily: MONO,
    fontSize: 8,
    color: LIME,
    marginTop: 10,
    textTransform: "uppercase",
  },
  footer: {
    position: "absolute",
    bottom: 26,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

const STATE: Record<Part["state"], { label: string; bg: string }> = {
  good: { label: "Good", bg: LIME },
  partial: { label: "Needs work", bg: YELLOW },
  missing: { label: "Fix this", bg: RED },
  unknown: { label: "Couldn't tell", bg: LIGHT2 },
};

/** A long fix cut to fit its card on the first page; it's whole on the next. */
function short(text: string, max = 200) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const sentence = cut.lastIndexOf(". ");
  return sentence > max * 0.5
    ? cut.slice(0, sentence + 1)
    : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

function statusOf(score: number | null) {
  if (score === null) return { label: "Not checked", bg: LIGHT2 };
  if (score >= 80) return { label: "Good", bg: LIME };
  if (score >= 50) return { label: "Needs work", bg: YELLOW };
  return { label: "Costing you", bg: RED };
}

function AuditPdf({
  view,
  logo,
  link,
}: {
  view: AuditView;
  logo: Buffer;
  link?: string;
}) {
  const date = fmtDate(view.finishedAt ?? view.createdAt);
  const shot = view.phoneShot?.match(
    /^data:image\/(jpeg|jpg|png);base64,(.+)$/,
  );
  const low = (view.score ?? 0) < CALL_BELOW;
  return (
    <Document
      title={`Website audit: ${view.domain ?? view.business}`}
      author='Fonts & Footers'
      subject={`The free website audit for ${view.business}`}
    >
      <Page size='LETTER' style={s.page}>
        <View style={s.header}>
          <View style={s.brand}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- a PDF image, not an <img> */}
            <Image style={s.logo} src={{ data: logo, format: "png" }} />
            <Text style={s.brandName}>Fonts & Footers</Text>
          </View>
          <Text style={s.mono}>Free website audit · {date}</Text>
        </View>

        <Text style={s.title}>{view.business}</Text>
        <Text style={s.subtitle}>
          {[view.domain, view.place].filter(Boolean).join(" · ")}
        </Text>

        <View style={s.scoreRow}>
          <View style={s.scoreCard}>
            <Text style={s.scoreLabel}>Your score</Text>
            <Text style={[s.scoreNumber, { marginTop: 10 }]}>
              {view.score ?? "–"}
              <Text style={s.scoreOf}> /100</Text>
            </Text>
          </View>
          <View style={s.summaryCard}>
            {view.band && (
              <Text
                style={[s.pill, { backgroundColor: TONES[view.band.tone] }]}
              >
                {view.band.label}
              </Text>
            )}
            <Text style={s.summary}>{view.summary}</Text>
          </View>
        </View>

        {view.top.length > 0 && (
          <View wrap={false}>
            <Text style={s.h2}>The three things costing you the most</Text>
            <View style={s.tops}>
              {view.top.map((t, i) => (
                <View
                  key={t.id}
                  style={[s.top, { backgroundColor: CARD_TONES[i] }]}
                  wrap={false}
                >
                  <Text style={s.mono}>0{i + 1}</Text>
                  <Text style={s.topName}>{t.name}</Text>
                  <Text style={s.small}>{t.found}</Text>
                  {t.fix && (
                    <Text style={[s.small, { color: TEXT }]}>
                      {short(t.fix)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* A scorecard: what each check found is on the pages after. */}
        <Text style={s.h2}>The six checks</Text>
        {view.checks.map((c) => {
          const status = statusOf(c.result?.score ?? null);
          return (
            <View key={c.id} style={s.row} wrap={false}>
              <Text style={s.rowName}>{c.name}</Text>
              <Text
                style={[s.state, { backgroundColor: status.bg, width: 66 }]}
              >
                {status.label}
              </Text>
              <Text style={s.rowScore}>{c.result?.score ?? "–"}</Text>
            </View>
          );
        })}

        <Footer view={view} />
      </Page>

      <Page size='LETTER' style={s.page}>
        <Text style={[s.h2, { marginTop: 0 }]}>Every check, in detail</Text>
        {view.checks.map((c) => {
          const r = c.result;
          if (!r) return null;
          return (
            <View key={c.id} style={s.check}>
              <View style={s.checkHead} wrap={false}>
                <Text style={s.checkName}>{c.name}</Text>
                <Text style={s.checkScore}>
                  {r.score === null ? "Not checked" : `${r.score}/100`}
                </Text>
              </View>
              <Text style={[s.small, { marginTop: 6 }]}>{r.found}</Text>
              <Text style={[s.small, { color: TEXT, marginTop: 4 }]}>
                {CHECKS[c.id].why}
              </Text>
              {r.fix && (
                <View style={s.fix} wrap={false}>
                  <Text style={s.mono}>The fix</Text>
                  <Text style={[s.small, { marginTop: 4 }]}>{r.fix}</Text>
                </View>
              )}
              {!(r.parts.length === 1 && r.parts[0].found === r.found) &&
                r.parts.map((p) => (
                  <View key={p.id} style={s.part} wrap={false}>
                    <Text
                      style={[s.state, { backgroundColor: STATE[p.state].bg }]}
                    >
                      {STATE[p.state].label}
                    </Text>
                    <View style={s.partBody}>
                      <Text style={s.partLabel}>{p.label}</Text>
                      <Text style={s.small}>{p.found}</Text>
                      {p.quote && <Text style={s.quote}>“{p.quote}”</Text>}
                      {p.proof?.slice(0, 6).map((x, i) => (
                        <Text key={i} style={[s.small, { color: TEXT }]}>
                          · {x.label}
                        </Text>
                      ))}
                    </View>
                  </View>
                ))}
              {r.notes?.map((n, i) => (
                <Text key={i} style={[s.small, { color: TEXT, marginTop: 8 }]}>
                  Worth a look: {n}
                </Text>
              ))}
            </View>
          );
        })}

        {view.searches.length > 0 && (
          <View wrap={false}>
            <Text style={s.h2}>
              The searches we ran{view.place ? ` in ${view.place}` : ""}
            </Text>
            <View style={s.th}>
              <Text style={[s.mono, { flex: 1 }]}>Search</Text>
              <Text style={[s.mono, { width: 80, textAlign: "right" }]}>
                A month
              </Text>
              <Text style={[s.mono, { width: 80, textAlign: "right" }]}>
                Map results
              </Text>
              <Text style={[s.mono, { width: 80, textAlign: "right" }]}>
                Google
              </Text>
            </View>
            {view.searches.map((r) => (
              <View key={r.keyword} style={s.tr}>
                <Text style={[s.small, { flex: 1 }]}>{r.keyword}</Text>
                <Text style={[s.small, { width: 80, textAlign: "right" }]}>
                  {r.volume ? r.volume.toLocaleString("en-US") : "–"}
                </Text>
                <Text style={[s.small, { width: 80, textAlign: "right" }]}>
                  {r.maps ? `#${r.maps}` : "Not there"}
                </Text>
                <Text style={[s.small, { width: 80, textAlign: "right" }]}>
                  {r.organic ? `#${r.organic}` : "Not on page one"}
                </Text>
              </View>
            ))}
            <Text style={[s.small, { color: TEXT, marginTop: 6 }]}>
              Searches a month are Google&apos;s estimates. Places are from
              Google&apos;s results for {view.place ?? "your city"} on a phone,
              on {date}.
            </Text>
          </View>
        )}

        {view.rivals.length > 0 && (
          <View wrap={false}>
            <Text style={s.h2}>You and the operators near you</Text>
            <View style={s.th}>
              <Text style={[s.mono, { flex: 1 }]}>Business</Text>
              <Text style={[s.mono, { width: 80, textAlign: "right" }]}>
                Reviews
              </Text>
              <Text style={[s.mono, { width: 80, textAlign: "right" }]}>
                Rating
              </Text>
            </View>
            {view.listing && (
              <View style={s.tr}>
                <Text style={[s.small, { flex: 1, fontFamily: SANS }]}>
                  {view.listing.name} (you)
                </Text>
                <Text style={[s.small, { width: 80, textAlign: "right" }]}>
                  {view.listing.reviews.toLocaleString("en-US")}
                </Text>
                <Text style={[s.small, { width: 80, textAlign: "right" }]}>
                  {view.listing.rating?.toFixed(1) ?? "–"}
                </Text>
              </View>
            )}
            {view.rivals.map((r) => (
              <View key={r.name} style={s.tr}>
                <Text style={[s.small, { flex: 1 }]}>{r.name}</Text>
                <Text style={[s.small, { width: 80, textAlign: "right" }]}>
                  {r.reviews?.toLocaleString("en-US") ?? "–"}
                </Text>
                <Text style={[s.small, { width: 80, textAlign: "right" }]}>
                  {r.rating?.toFixed(1) ?? "–"}
                </Text>
              </View>
            ))}
          </View>
        )}

        {view.semrush && <DeepDive d={view.semrush} />}

        {shot && (
          <View wrap={false}>
            <Text style={s.h2}>What a rider sees on a phone</Text>
            <View style={s.shotRow}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- a PDF image, not an <img> */}
              <Image
                style={s.shot}
                src={{
                  data: Buffer.from(shot[2], "base64"),
                  format: shot[1] === "png" ? "png" : "jpg",
                }}
              />
              <Text style={[s.small, { flex: 1, color: TEXT }]}>
                Your homepage&apos;s first screen on a mid-range phone, from
                Google&apos;s speed test.
              </Text>
            </View>
          </View>
        )}

        <View style={s.next} wrap={false}>
          <Text style={[s.mono, { color: "#c9cdd2" }]}>Next step</Text>
          <Text style={[s.nextText, { marginTop: 8 }]}>
            {!view.hasSite
              ? "Your Google listing is doing all the work on its own. If you'd like a website built around the searches riders make, with online booking, let's talk: a 20-minute call, and no pitch if it's not a fit."
              : low
                ? "The fixes above are a good start. If you'd rather have your site rebuilt around the searches riders make, let's talk: a 20-minute call, and no pitch if it's not a fit."
                : "Your site is in decent shape, so the faster win is more accounts: the hotels, venues and events in your market, with who to ask for."}
          </Text>
          <Text style={s.nextLink}>
            {low || !view.hasSite
              ? "calendly.com/chris-ware-dev/discovery-call"
              : "fontsandfooters.com/services/leads"}
          </Text>
        </View>

        <Text style={[s.small, { color: TEXT, marginTop: 18 }]}>
          {view.hasSite
            ? "How this was checked: your live site as the server sends it, Google's speed test on a phone (PageSpeed Insights), your Google Business Profile, Google's results for the searches above, and an AI reading your pages the way an assistant would (it only counts what it can quote)."
            : "How this was checked: your Google Business Profile, the operators near you, and Google's results for the searches above. With no website, the four website checks score zero."}{" "}
          Checked {date}.{link ? ` The report online: ${link}` : ""} Something
          look wrong? Reply to the email, or write to hello@fontsandfooters.com.
        </Text>
        <Footer view={view} />
      </Page>
    </Document>
  );
}

const num = (v: number) => Math.round(v).toLocaleString("en-US");

/** A small table: the first column takes the room, the rest are numbers. */
function PdfTable({
  head,
  rows,
  widths,
}: {
  head: string[];
  rows: (string | number)[][];
  widths: number[];
}) {
  return (
    <View style={s.table}>
      <View style={s.th}>
        {head.map((h, i) => (
          <Text
            key={h}
            style={[s.mono, i ? { width: widths[i - 1], textAlign: "right" } : { flex: 1 }]}
          >
            {h}
          </Text>
        ))}
      </View>
      {rows.map((r, j) => (
        <View key={j} style={s.tr} wrap={false}>
          {r.map((c, i) => (
            <Text
              key={i}
              style={[s.small, i ? { width: widths[i - 1], textAlign: "right" } : { flex: 1 }]}
            >
              {String(c)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/** The Search deep-dive, from the Semrush exports. */
function DeepDive({ d }: { d: SemrushData }) {
  const p = d.positions;
  const t = d.trend;
  const db = p?.database ?? t?.database;
  const asOf = d.files.map((f) => f.uploadedAt).sort().at(-1);
  const max = Math.max(1, ...(t?.months ?? []).map((m) => m.traffic));
  const pages = d.pages?.length ? d.pages : (p?.pages ?? []);
  return (
    <View break>
      <View style={[s.next, { marginTop: 0 }]} wrap={false}>
        <Text style={[s.mono, { color: LIME }]}>Search deep-dive</Text>
        <Text style={[s.nextText, { fontSize: 17, marginTop: 8 }]}>
          Where your Google traffic comes from, and where it could
        </Text>
        <Text style={[s.small, { color: "#c9cdd2", marginTop: 6 }]}>
          From Semrush{db ? `'s ${db} database` : ""}
          {asOf ? `, ${monthName(asOf.slice(0, 7))}` : ""}. These are
          estimates: useful for comparing and spotting trends, not an exact
          count of visits.
        </Text>
      </View>

      {p && (
        <View style={[s.scoreRow, { marginTop: 10 }]} wrap={false}>
          {(
            [
              ["Visits a month", num(p.traffic)],
              ["Searches you show up for", num(p.keywords)],
              ["On page one", num(p.top10)],
              ["Worth a month in ads", usd(p.value)],
            ] as const
          ).map(([label, value], i) => (
            <View
              key={label}
              style={[s.summaryCard, { padding: 12, backgroundColor: i === 3 ? MINT : LIGHT }]}
            >
              <Text style={[s.scoreNumber, { fontSize: 24, color: BLACK, letterSpacing: -0.5 }]}>
                {value}
              </Text>
              <Text style={[s.mono, { marginTop: 6 }]}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {semrushInsights(d).map((i) => (
        <View key={i.title} style={[s.check, { marginTop: 8, padding: 12 }]} wrap={false}>
          <Text style={s.mono}>{i.title}</Text>
          <Text style={[s.small, { marginTop: 4, fontSize: 9.5 }]}>{i.text}</Text>
        </View>
      ))}

      {p && p.close.length > 0 && (
        <View wrap={false}>
          <Text style={s.h2}>Ride searches closest to the top</Text>
          <PdfTable
            head={["Search", "You", "A month", "Ad price"]}
            widths={[70, 60, 60]}
            rows={p.close.map((k) => [
              k.keyword,
              placeOf(k),
              num(k.volume),
              k.cpc ? `$${k.cpc.toFixed(2)}` : "–",
            ])}
          />
        </View>
      )}

      {t && t.months.length > 1 && (
        <View wrap={false}>
          <Text style={s.h2}>Visits from Google, the last {t.months.length} months</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 2,
              height: 90,
              borderBottomWidth: 1,
              borderBottomColor: LIGHT2,
            }}
          >
            {t.months.map((m) => (
              <View
                key={m.month}
                style={{
                  flex: 1,
                  height: Math.max(1.5, (m.traffic / max) * 88),
                  backgroundColor: BLACK,
                  borderTopLeftRadius: 2,
                  borderTopRightRadius: 2,
                }}
              />
            ))}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
            <Text style={s.mono}>
              {monthShort(t.months[0].month)} {t.months[0].month.slice(0, 4)}
            </Text>
            <Text style={s.mono}>
              {t.peak ? `Best: ${monthName(t.peak.month)}, ${num(t.peak.traffic)}` : ""}
            </Text>
            <Text style={s.mono}>
              {monthShort(t.months.at(-1)!.month)} {t.months.at(-1)!.month.slice(0, 4)}
            </Text>
          </View>
        </View>
      )}

      {p && p.top.length > 0 && (
        <View wrap={false}>
          <Text style={s.h2}>The searches that send you the most</Text>
          <PdfTable
            head={["Search", "You", "A month", "Visits"]}
            widths={[50, 60, 50]}
            rows={p.top.map((k) => [k.keyword, `#${k.position}`, num(k.volume), num(k.traffic)])}
          />
        </View>
      )}

      {pages.length > 0 && (
        <View wrap={false}>
          <Text style={s.h2}>Your pages Google sends people to</Text>
          <PdfTable
            head={["Page", "Searches", "Visits"]}
            widths={[60, 50]}
            rows={pages.slice(0, 8).map((pg) => [pagePath(pg.url), num(pg.keywords), num(pg.traffic)])}
          />
        </View>
      )}

      {d.competitors && d.competitors.length > 0 && (
        <View wrap={false}>
          <Text style={s.h2}>Who you&apos;re up against on Google</Text>
          <PdfTable
            head={["Site", "Shared", "Searches", "Visits", "Worth"]}
            widths={[50, 55, 50, 55]}
            rows={[
              ...(p ? [["You", "–", num(p.keywords), num(p.traffic), usd(p.value)]] : []),
              ...d.competitors
                .slice(0, 8)
                .map((c) => [c.domain, num(c.common), num(c.keywords), num(c.traffic), usd(c.value)]),
            ]}
          />
        </View>
      )}

      {d.gap && d.gap.missing.length > 0 && (
        <View wrap={false}>
          <Text style={s.h2}>Searches they rank for and you don&apos;t</Text>
          <PdfTable
            head={["Search", "A month", "Who's there"]}
            widths={[55, 150]}
            rows={d.gap.missing.map((k) => [k.keyword, num(k.volume), `${k.domain} (#${k.position})`])}
          />
        </View>
      )}

      {d.links && (
        <View wrap={false}>
          <Text style={s.h2}>Sites that link to you</Text>
          <Text style={s.small}>
            {num(d.links.domains)} linking sites
            {d.links.follow !== undefined ? `, ${d.links.follow}% count toward rankings` : ""}
            , {num(d.links.spamCount)} look like spam.
            {d.links.top.length
              ? ` The strongest: ${d.links.top.slice(0, 5).map((x) => x.domain).join(", ")}.`
              : ""}
          </Text>
          {d.links.spam.length > 0 && (
            <PdfTable
              head={["Looks like spam", "Why"]}
              widths={[220]}
              rows={d.links.spam.slice(0, 6).map((x) => [x.domain, x.why])}
            />
          )}
        </View>
      )}
    </View>
  );
}

function Footer({ view }: { view: AuditView }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.mono}>
        Fonts & Footers · Website audit{view.domain ? ` · ${view.domain}` : ""}
      </Text>
      {/* Not page numbers: a render-prop text here takes the whole footer out. */}
      <Text style={s.mono}>fontsandfooters.com</Text>
    </View>
  );
}

/** "website-audit-desertblackcar.com.pdf", or the business name with no site. */
export function pdfFileName(view: AuditView) {
  const slug = (view.domain ?? view.business)
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `website-audit-${slug || "report"}.pdf`;
}

export async function renderAuditPdf(view: AuditView, link?: string) {
  const logo = readFileSync(
    path.join(publicDir, "logos", "fnf_logo_black.png"),
  );
  return renderToBuffer(
    <AuditPdf view={fitAll(view)} logo={logo} link={link} />,
  );
}
