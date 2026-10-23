// The service agreement as a PDF, in the proposal's layout: the letterhead,
// who it's between, the plan, the investment, the terms and the
// signatures, with the e-signature record once it's signed. Server only:
// it reads the fonts and the logo from /public.

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
import { SUPPORT_EMAIL } from "@/lib/dashboard/plans";
import { docRef, startsWhen, type AgreementBody } from "./types";

const publicDir = path.join(process.cwd(), "public");
const font = (file: string) => path.join(publicDir, "fonts", file);

// The same two faces as the proposal and the invoices, under the same
// names, registered once whichever is drawn first.
const families = new Set(Font.getRegisteredFontFamilies());
if (!families.has("Creato"))
  Font.register({
    family: "Creato",
    fonts: [
      { src: font("CreatoDisplay-Medium.otf") },
      { src: font("CreatoDisplay-Bold.otf"), fontWeight: 700 },
    ],
  });
if (!families.has("Plex"))
  Font.register({ family: "Plex", src: font("pdf/IBMPlexMono-Medium.ttf") });
Font.registerHyphenationCallback((word) => [word]);

/** Creato's characters; anything typed outside them is swapped or dropped. */
const NOT_IN_FONT =
  /[^\n -~¡-ÿıŁłŒœŠšŸŽžƒˆˇ˘-˝π–—‘-‚“-„†-•…‰‹›⁄€™Ω∂∆∏∑−√∞∫≈≠≤≥◊]/g;

const fit = (text: string) =>
  text
    .normalize("NFC")
    .replace(/→/g, "›")
    .replace(/[✓✔]/g, "•")
    .replace(/[   ]/g, " ")
    .replace(/[‐‑]/g, "-")
    .replace(NOT_IN_FONT, "");

const BLACK = "#0d0d0e";
const TEXT = "#6d7885";
const LIGHT = "#f1f2f4";
const LIGHT2 = "#e0e2e5";
const LIME = "#d1ff93";
const PURPLE = "#c1b7ff";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 72,
    paddingHorizontal: 48,
    fontFamily: "Creato",
    fontSize: 10,
    lineHeight: 1.45,
    color: BLACK,
  },
  mono: {
    fontFamily: "Plex",
    fontSize: 8,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: TEXT,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 30, height: 19 },
  brandName: { fontSize: 12.5, color: BLACK },
  from: { alignItems: "flex-end", gap: 1 },
  fromLine: { fontSize: 9.5, color: TEXT },
  titleBlock: { marginTop: 40, gap: 10 },
  pill: {
    alignSelf: "flex-start",
    height: 20,
    paddingHorizontal: 10,
    paddingBottom: 2,
    borderRadius: 10,
    backgroundColor: PURPLE,
    justifyContent: "center",
    alignItems: "center",
  },
  pillText: {
    fontFamily: "Plex",
    fontSize: 8,
    lineHeight: 1,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: BLACK,
  },
  title: { fontSize: 32, letterSpacing: -1, lineHeight: 1.05, color: BLACK },
  rule: { height: 1, backgroundColor: LIGHT2, marginVertical: 20 },
  facts: { flexDirection: "row", gap: 24 },
  fact: { flex: 1, gap: 3 },
  factValue: { fontSize: 10.5, color: BLACK },
  section: { marginTop: 26, gap: 10 },
  h2: { fontSize: 18, letterSpacing: -0.4, lineHeight: 1.15, color: BLACK },
  body: { fontSize: 10.5, lineHeight: 1.55, color: TEXT },
  list: { gap: 7, marginTop: 2 },
  item: { flexDirection: "row", gap: 10 },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: BLACK,
    marginTop: 5,
  },
  itemText: { flex: 1, fontSize: 10.5, lineHeight: 1.5, color: BLACK },
  table: { marginTop: 4 },
  thead: {
    flexDirection: "row",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
  },
  trow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT2,
  },
  cDesc: { flex: 1, paddingRight: 16 },
  cAmount: { width: 150, alignItems: "flex-end" },
  lineTitle: { fontSize: 11.5, color: BLACK },
  lineDetail: { fontSize: 9.5, color: TEXT, marginTop: 3 },
  amount: { fontSize: 11.5, color: BLACK, textAlign: "right" },
  struck: {
    fontSize: 9.5,
    color: TEXT,
    textDecoration: "line-through",
    textAlign: "right",
  },
  waived: {
    marginTop: 4,
    height: 16,
    paddingHorizontal: 8,
    paddingBottom: 2,
    borderRadius: 8,
    backgroundColor: LIME,
    justifyContent: "center",
    alignItems: "center",
  },
  waivedText: {
    fontFamily: "Plex",
    fontSize: 7.5,
    lineHeight: 1,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: BLACK,
  },
  totals: { alignItems: "flex-end", marginTop: 14 },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: 260,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: BLACK,
  },
  grandLabel: { fontFamily: "Plex", fontSize: 8, color: "#ffffff" },
  grandValue: { fontSize: 16, lineHeight: 1, color: "#ffffff" },
  then: { fontSize: 9.5, color: TEXT, marginTop: 8, textAlign: "right" },
  term: { flexDirection: "row", gap: 10 },
  num: { width: 18, fontFamily: "Plex", fontSize: 9, color: TEXT, marginTop: 1 },
  termBody: { flex: 1, gap: 3 },
  termHead: { fontSize: 11.5, color: BLACK },
  termText: { fontSize: 10, lineHeight: 1.55, color: TEXT },
  signs: { flexDirection: "row", gap: 28, marginTop: 4 },
  sign: { flex: 1, gap: 4 },
  signName: { fontSize: 20, letterSpacing: -0.4, color: BLACK, minHeight: 26 },
  signLine: { height: 1, backgroundColor: BLACK, marginBottom: 2 },
  signMeta: { fontSize: 9.5, color: TEXT },
  record: {
    marginTop: 18,
    padding: 14,
    borderRadius: 10,
    backgroundColor: LIGHT,
    gap: 4,
  },
  recordText: { fontSize: 9, lineHeight: 1.5, color: BLACK },
  footer: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: LIGHT2,
    paddingTop: 10,
  },
  footerText: { fontSize: 8.5, color: TEXT },
});

const money = (amount: number) =>
  `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

const day = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "America/Phoenix",
});
const stamp = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Phoenix",
  timeZoneName: "short",
});

export type AgreementMeta = {
  id: string;
  signedAt?: string;
  signedBy?: string;
  signedIp?: string;
};

function AgreementPdf({
  a,
  meta,
  logo,
}: {
  a: AgreementBody;
  meta: AgreementMeta;
  logo: Buffer;
}) {
  const who = a.parties.business || a.parties.name;
  const waived = a.fees.setup <= 0;
  const hasSetup = a.fees.setup > 0 || a.fees.listSetup > 0;
  const starts = startsWhen(a);

  return (
    <Document
      title={`Service agreement for ${who}`}
      author='Fonts & Footers'
      subject={`${a.service} for ${who}`}
    >
      <Page size='LETTER' style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- a PDF image, not an <img> */}
            <Image style={styles.logo} src={{ data: logo, format: "png" }} />
            <Text style={styles.brandName}>Fonts & Footers</Text>
          </View>
          <View style={styles.from}>
            <Text style={styles.fromLine}>Chris Ware, Founder</Text>
            <Text style={styles.fromLine}>Phoenix, Arizona</Text>
            <Text style={styles.fromLine}>{SUPPORT_EMAIL}</Text>
            <Text style={styles.fromLine}>fontsandfooters.com</Text>
          </View>
        </View>

        <View style={styles.titleBlock}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Service agreement</Text>
          </View>
          <View>
            <Text style={styles.title}>{a.service} for</Text>
            <Text style={styles.title}>{who}</Text>
          </View>
        </View>

        <View style={styles.rule} />

        <View style={styles.facts}>
          <View style={[styles.fact, { flex: 1.4 }]}>
            <Text style={styles.mono}>Between Fonts & Footers and</Text>
            {a.parties.name ? (
              <Text style={styles.factValue}>{a.parties.name}</Text>
            ) : null}
            {a.parties.business && a.parties.business !== a.parties.name ? (
              <Text style={styles.factValue}>{a.parties.business}</Text>
            ) : null}
            {a.parties.email ? (
              <Text style={styles.fromLine}>{a.parties.email}</Text>
            ) : null}
            {a.parties.city ? (
              <Text style={styles.fromLine}>{a.parties.city}</Text>
            ) : null}
          </View>
          <View style={styles.fact}>
            <Text style={styles.mono}>Date</Text>
            <Text style={styles.factValue}>{day.format(new Date(a.date))}</Text>
          </View>
          <View style={styles.fact}>
            <Text style={styles.mono}>Agreement</Text>
            <Text style={styles.factValue}>{docRef(meta.id)}</Text>
          </View>
        </View>

        <View style={styles.rule} />

        <View style={styles.section}>
          <Text style={styles.mono}>The plan</Text>
          <Text style={styles.h2}>{a.service}</Text>
          {a.summary ? <Text style={styles.body}>{a.summary}</Text> : null}
          {a.included.length > 0 && (
            <>
              <Text style={[styles.mono, { marginTop: 6 }]}>
                What&apos;s included
              </Text>
              <View style={styles.list}>
                {a.included.map((item, i) => (
                  <View style={styles.item} key={i} wrap={false}>
                    <View style={styles.dot} />
                    <Text style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {a.timeline ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.mono}>Timeline</Text>
            <Text style={[styles.body, { color: BLACK }]}>{a.timeline}</Text>
          </View>
        ) : null}

        <View style={styles.section} wrap={false}>
          <Text style={styles.mono}>Investment</Text>
          <View style={styles.table}>
            <View style={styles.thead}>
              <Text style={[styles.mono, styles.cDesc]}>Item</Text>
              <Text style={[styles.mono, { width: 150, textAlign: "right" }]}>
                Amount
              </Text>
            </View>
            {hasSetup && (
              <View style={styles.trow}>
                <View style={styles.cDesc}>
                  <Text style={styles.lineTitle}>Setup</Text>
                  <Text style={styles.lineDetail}>
                    One time: the design, build and launch.
                  </Text>
                </View>
                <View style={styles.cAmount}>
                  {waived ? (
                    <>
                      {a.fees.listSetup > 0 && (
                        <Text style={styles.struck}>
                          {money(a.fees.listSetup)}
                        </Text>
                      )}
                      <Text style={styles.amount}>$0</Text>
                      <View style={styles.waived}>
                        <Text style={styles.waivedText}>Waived</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.amount}>{money(a.fees.setup)}</Text>
                  )}
                </View>
              </View>
            )}
            <View style={styles.trow}>
              <View style={styles.cDesc}>
                <Text style={styles.lineTitle}>{a.service}, monthly</Text>
                <Text style={styles.lineDetail}>
                  Charged automatically to your card on the 1st of every month,
                  starting {starts}. Month to month, no long-term contract.
                </Text>
              </View>
              <View style={styles.cAmount}>
                <Text style={styles.amount}>{money(a.fees.monthly)}/mo</Text>
              </View>
            </View>
          </View>
          <View style={styles.totals}>
            <View style={styles.grand}>
              <Text style={styles.grandLabel}>DUE TO START</Text>
              <Text style={styles.grandValue}>{money(a.fees.setup)}</Text>
            </View>
            <Text style={styles.then}>
              Then {money(a.fees.monthly)} a month, starting {starts}.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.mono}>Terms</Text>
          <View style={[styles.list, { gap: 12 }]}>
            {a.terms.map((term, i) => (
              <View style={styles.term} key={i} wrap={false}>
                <Text style={styles.num}>{String(i + 1).padStart(2, "0")}</Text>
                <View style={styles.termBody}>
                  <Text style={styles.termHead}>{term.heading}</Text>
                  <Text style={styles.termText}>{term.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.mono}>Signatures</Text>
          <View style={styles.signs}>
            <View style={styles.sign}>
              <Text style={styles.mono}>Fonts & Footers</Text>
              <Text style={styles.signName}>Chris Ware</Text>
              <View style={styles.signLine} />
              <Text style={styles.signMeta}>Chris Ware, Founder</Text>
              <Text style={styles.signMeta}>{day.format(new Date(a.date))}</Text>
            </View>
            <View style={styles.sign}>
              <Text style={styles.mono}>{who}</Text>
              <Text style={styles.signName}>{meta.signedBy ?? " "}</Text>
              <View style={styles.signLine} />
              <Text style={styles.signMeta}>
                {meta.signedBy
                  ? `${meta.signedBy}, for ${who}`
                  : `${a.parties.name || "Your name"}, for ${who}`}
              </Text>
              <Text style={styles.signMeta}>
                {meta.signedAt
                  ? day.format(new Date(meta.signedAt))
                  : "Not signed yet"}
              </Text>
            </View>
          </View>
          {meta.signedAt && meta.signedBy ? (
            <View style={styles.record}>
              <Text style={styles.mono}>Electronic signature record</Text>
              <Text style={styles.recordText}>
                Signed electronically by {meta.signedBy}
                {a.signerEmail ? ` (${a.signerEmail})` : ""} on{" "}
                {stamp.format(new Date(meta.signedAt))}
                {meta.signedIp ? `, from ${meta.signedIp}` : ""}, by typing
                their name and agreeing in the Fonts & Footers client portal.
                Agreement {docRef(meta.id)}.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Fonts & Footers · 10105 E Via Linda Ste. 103, Scottsdale, AZ 85268 ·{" "}
            {SUPPORT_EMAIL}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) =>
              `Service Agreement · ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

/** Every piece of text, made safe for the fonts. */
function fitAll<T>(value: T): T {
  if (typeof value === "string") return fit(value) as T;
  if (Array.isArray(value)) return value.map(fitAll) as T;
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, fitAll(v)]),
    ) as T;
  return value;
}

/** The finished PDF. */
export async function renderAgreement(body: AgreementBody, meta: AgreementMeta) {
  const logo = readFileSync(
    path.join(publicDir, "logos", "fnf_logo_black.png"),
  );
  return renderToBuffer(
    <AgreementPdf a={fitAll(body)} meta={fitAll(meta)} logo={logo} />,
  );
}
