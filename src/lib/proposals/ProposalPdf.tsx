// A proposal, as a PDF: the cover and the plan on the first page, then
// the investment, the proof, the terms and the next step. The same fonts,
// colors and footer as the invoices. Server only: it reads the fonts and
// the logo from /public.

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
import { lines, type Proposal } from "./types";

const publicDir = path.join(process.cwd(), "public");
const font = (file: string) => path.join(publicDir, "fonts", file);

// The invoice's two faces, under the invoice's own names, so each font file
// is only ever registered under one name (react-pdf drops letters when one
// file is used under two). Registered here too in case no invoice has been
// drawn yet.
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
  /[^\n -~¡-ÿıŁłŒœŠšŸŽžƒˆˇ˘-˝π–—‘-‚“-„†-•…‰‹›⁄€™Ω∂∆∏∑−√∞∫≈≠≤≥◊]/g;

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
  // A fixed-height box with the word centered in it; padding on the text
  // itself sat the word high in the pill.
  pill: {
    alignSelf: "flex-start",
    height: 20,
    paddingHorizontal: 10,
    // Plex sits low in its line box; this lifts the caps to the middle.
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
  note: {
    marginTop: 4,
    padding: 18,
    borderRadius: 10,
    backgroundColor: LIGHT,
    gap: 6,
  },
  noteText: { fontSize: 10.5, lineHeight: 1.55, color: BLACK },
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
  num: { width: 18, fontFamily: "Plex", fontSize: 9, color: TEXT },
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
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: LIME,
    fontFamily: "Plex",
    fontSize: 7.5,
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
  proof: {
    marginTop: 4,
    padding: 18,
    borderRadius: 10,
    backgroundColor: BLACK,
    gap: 14,
  },
  proofQuote: { fontSize: 15, lineHeight: 1.3, color: "#ffffff" },
  proofBy: { fontSize: 9.5, color: "rgba(255,255,255,0.7)" },
  stats: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#1d1e20",
    gap: 4,
  },
  statValue: { fontSize: 16, lineHeight: 1, color: LIME },
  statLabel: {
    fontFamily: "Plex",
    fontSize: 7,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.7)",
  },
  next: {
    marginTop: 26,
    padding: 18,
    borderRadius: 10,
    backgroundColor: LIME,
    gap: 6,
  },
  nextTitle: { fontSize: 14, color: BLACK },
  nextText: { fontSize: 10.5, lineHeight: 1.55, color: BLACK },
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

const fmt = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
/** A YYYY-MM-DD date, plus some days, as "October 22, 2026". */
function fmtDate(iso: string, plusDays = 0) {
  const [y, m, d] = iso.split("-").map(Number);
  return fmt.format(new Date(Date.UTC(y, m - 1, d + plusDays)));
}

// Nier Transportation's results, the same as the site's proof band.
const NIER = [
  { value: "$0", label: "Per-booking fees" },
  { value: "53", label: "Pages built for search" },
  { value: "+105%", label: "Organic traffic" },
  { value: "0", label: "Days offline at the switch" },
];

function Bullets({ items }: { items: string[] }) {
  return (
    <View style={styles.list}>
      {items.map((item, i) => (
        <View style={styles.item} key={i} wrap={false}>
          <View style={styles.dot} />
          <Text style={styles.itemText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function ProposalPdf({ p, logo }: { p: Proposal; logo: Buffer }) {
  const who = p.business || p.contactName;
  const included = lines(p.included);
  const terms = lines(p.terms);
  const setupDue = p.waiveSetup ? 0 : p.setup;
  // What's paid to start: the one-time fee, plus the first month unless
  // there's a free period first.
  const firstMonth = p.monthly > 0 && p.trialDays === 0 ? p.monthly : 0;
  const dueToStart = setupDue + firstMonth;
  const hasSetupLine = p.setup > 0;

  return (
    <Document
      title={`Proposal for ${who}`}
      author='Fonts & Footers'
      subject={`${p.service} for ${who}`}
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
            <Text style={styles.pillText}>Proposal</Text>
          </View>
          {/* The service on one line, the client on the next. */}
          <View>
            <Text style={styles.title}>{p.service} for</Text>
            <Text style={styles.title}>{who}</Text>
          </View>
        </View>

        <View style={styles.rule} />

        <View style={styles.facts}>
          <View style={[styles.fact, { flex: 1.4 }]}>
            <Text style={styles.mono}>Prepared for</Text>
            {p.contactName ? (
              <Text style={styles.factValue}>{p.contactName}</Text>
            ) : null}
            {p.business && p.business !== p.contactName ? (
              <Text style={styles.factValue}>{p.business}</Text>
            ) : null}
            {p.email ? <Text style={styles.fromLine}>{p.email}</Text> : null}
            {p.city ? <Text style={styles.fromLine}>{p.city}</Text> : null}
          </View>
          <View style={styles.fact}>
            <Text style={styles.mono}>Date</Text>
            <Text style={styles.factValue}>{fmtDate(p.date)}</Text>
          </View>
          <View style={styles.fact}>
            <Text style={styles.mono}>Valid until</Text>
            <Text style={styles.factValue}>
              {fmtDate(p.date, p.validDays)}
            </Text>
          </View>
        </View>

        <View style={styles.rule} />

        {p.note ? (
          <View style={styles.note}>
            <Text style={styles.noteText}>{p.note}</Text>
            <Text style={[styles.noteText, { color: TEXT }]}>
              Chris Ware, Fonts & Footers
            </Text>
          </View>
        ) : null}

        {(p.summary || included.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.mono}>The plan</Text>
            <Text style={styles.h2}>{p.service}</Text>
            {p.summary ? <Text style={styles.body}>{p.summary}</Text> : null}
            {included.length > 0 && (
              <>
                <Text style={[styles.mono, { marginTop: 6 }]}>
                  What&apos;s included
                </Text>
                <Bullets items={included} />
              </>
            )}
          </View>
        )}

        {p.timeline ? (
          <View style={styles.section} wrap={false}>
            <Text style={styles.mono}>Timeline</Text>
            <Text style={[styles.body, { color: BLACK }]}>{p.timeline}</Text>
          </View>
        ) : null}

        {/* The investment. */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.mono}>Investment</Text>
          <View style={styles.table}>
            <View style={styles.thead}>
              <Text style={[styles.mono, styles.cDesc]}>Item</Text>
              <Text style={[styles.mono, { width: 150, textAlign: "right" }]}>
                Amount
              </Text>
            </View>

            {hasSetupLine && (
              <View style={styles.trow}>
                <View style={styles.cDesc}>
                  <Text style={styles.lineTitle}>
                    {p.monthly > 0 ? "Setup" : p.service}
                  </Text>
                  <Text style={styles.lineDetail}>
                    {p.waiveSetup && p.waiveReason
                      ? `One time. Waived: ${p.waiveReason}.`
                      : p.monthly > 0
                        ? "One time: the design, build and launch."
                        : "One time, for the project."}
                  </Text>
                </View>
                <View style={styles.cAmount}>
                  {p.waiveSetup ? (
                    <>
                      <Text style={styles.struck}>{money(p.setup)}</Text>
                      <Text style={styles.amount}>$0</Text>
                      <Text style={styles.waived}>Waived</Text>
                    </>
                  ) : (
                    <Text style={styles.amount}>{money(p.setup)}</Text>
                  )}
                </View>
              </View>
            )}

            {p.monthly > 0 && (
              <View style={styles.trow}>
                <View style={styles.cDesc}>
                  <Text style={styles.lineTitle}>{p.service}, monthly</Text>
                  <Text style={styles.lineDetail}>
                    {p.trialDays > 0
                      ? `Free for the first ${p.trialDays} days, then charged automatically to your card on the 1st of every month.`
                      : "Charged automatically to your card on the 1st of every month. Month to month, no long-term contract."}
                  </Text>
                </View>
                <View style={styles.cAmount}>
                  <Text style={styles.amount}>{money(p.monthly)}/mo</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.totals}>
            <View style={styles.grand}>
              <Text style={styles.grandLabel}>DUE TO START</Text>
              <Text style={styles.grandValue}>{money(dueToStart)}</Text>
            </View>
            {p.monthly > 0 && (
              <Text style={styles.then}>
                {p.trialDays > 0
                  ? `Then ${money(p.monthly)} a month after ${p.trialDays} free days, auto-deducted on the 1st of every month.`
                  : `Then ${money(p.monthly)} a month, auto-deducted on the 1st of every month.`}
              </Text>
            )}
          </View>
        </View>

        {p.caseStudy && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.mono}>Proof</Text>
            <View style={styles.proof}>
              <Text style={styles.proofQuote}>
                &ldquo;It paid for itself in the first month.&rdquo;
              </Text>
              <Text style={styles.proofBy}>
                Barry LaNier, Owner, Nier Transportation · Phoenix · since 2004
              </Text>
              <View style={styles.stats}>
                {NIER.map((stat) => (
                  <View style={styles.stat} key={stat.label}>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.proofBy}>
                The full case study: fontsandfooters.com/projects/nier-transportation
              </Text>
            </View>
          </View>
        )}

        {terms.length > 0 && (
          // Kept whole, so the heading never sits alone at a page's foot.
          <View style={styles.section} wrap={false}>
            <Text style={styles.mono}>Key terms</Text>
            <View style={styles.list}>
              {terms.map((term, i) => (
                <View style={styles.item} key={i} wrap={false}>
                  <Text style={styles.num}>{String(i + 1).padStart(2, "0")}</Text>
                  <Text style={styles.itemText}>{term}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.body, { fontSize: 9, marginTop: 4 }]}>
              A summary. The signed agreement sets out the full terms.
            </Text>
          </View>
        )}

        {p.nextSteps ? (
          <View style={styles.next} wrap={false}>
            <Text style={styles.nextTitle}>Next step</Text>
            <Text style={styles.nextText}>{p.nextSteps}</Text>
            <Text style={[styles.nextText, { color: TEXT }]}>
              This proposal is valid until {fmtDate(p.date, p.validDays)}.
            </Text>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Fonts & Footers · 10105 E Via Linda Ste. 103, Scottsdale, AZ 85268 ·{" "}
            {SUPPORT_EMAIL}
          </Text>
          <Text style={styles.footerText}>Proposal</Text>
        </View>
      </Page>
    </Document>
  );
}

/** Every piece of text, made safe for the fonts. */
function fitProposal(p: Proposal): Proposal {
  return Object.fromEntries(
    Object.entries(p).map(([k, v]) => [k, typeof v === "string" ? fit(v) : v]),
  ) as Proposal;
}

/** The finished PDF, ready to download. */
export async function renderProposal(proposal: Proposal) {
  const logo = readFileSync(
    path.join(publicDir, "logos", "fnf_logo_black.png"),
  );
  return renderToBuffer(
    <ProposalPdf p={fitProposal(proposal)} logo={logo} />,
  );
}
