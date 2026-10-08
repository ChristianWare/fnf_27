// The invoice, as a PDF. Used by the download on the Billing page, and
// later by the email that goes out when a payment goes through, so the
// two are always the same document. Server only: it reads the fonts and
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
import type { Client, Invoice } from "@/lib/dashboard/types";
import { PLANS, SUPPORT_EMAIL } from "@/lib/dashboard/plans";

const publicDir = path.join(process.cwd(), "public");
const font = (file: string) => path.join(publicDir, "fonts", file);

Font.register({
  family: "Creato",
  fonts: [
    { src: font("CreatoDisplay-Medium.otf") },
    { src: font("CreatoDisplay-Bold.otf"), fontWeight: 700 },
  ],
});
Font.register({ family: "Copy", src: font("cdCopy.otf") });
// The PDF renderer can't read the site's copy of IBM Plex Mono, so
// /public/fonts/pdf holds a Latin subset of it re-saved for PDFs.
Font.register({ family: "Plex", src: font("pdf/IBMPlexMono-Medium.ttf") });
// Never break a word across lines.
Font.registerHyphenationCallback((word) => [word]);

const BLACK = "#0d0d0e";
const TEXT = "#6d7885";
const LIGHT = "#f1f2f4";
const LIGHT2 = "#e0e2e5";
const LIME = "#d1ff93";
const YELLOW = "#fff78b";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 48,
    fontFamily: "Copy",
    fontSize: 10,
    lineHeight: 1.4,
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
  logo: { width: 40, height: 25 },
  brandName: { fontFamily: "Creato", fontSize: 16, color: BLACK },
  from: { alignItems: "flex-end", gap: 1 },
  fromLine: { fontSize: 9.5, color: TEXT },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 36,
  },
  title: {
    fontFamily: "Creato",
    fontSize: 34,
    letterSpacing: -1,
    lineHeight: 1,
    color: BLACK,
  },
  pill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    fontFamily: "Plex",
    fontSize: 8,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: BLACK,
  },
  rule: { height: 1, backgroundColor: LIGHT2, marginVertical: 18 },
  facts: { flexDirection: "row", gap: 24 },
  fact: { flex: 1, gap: 3 },
  factValue: { fontSize: 10.5, color: BLACK },
  billTo: { gap: 2 },
  table: { marginTop: 10 },
  thead: {
    flexDirection: "row",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: BLACK,
  },
  trow: {
    flexDirection: "row",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: LIGHT2,
  },
  cDesc: { flex: 1, paddingRight: 16 },
  cPeriod: { width: 150 },
  cAmount: { width: 90, textAlign: "right" },
  lineTitle: { fontFamily: "Creato", fontSize: 11.5, color: BLACK },
  lineDetail: { fontSize: 9.5, color: TEXT, marginTop: 3 },
  totals: { alignItems: "flex-end", marginTop: 14, gap: 6 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 240,
    paddingVertical: 4,
  },
  totalLabel: { fontSize: 10, color: TEXT },
  totalValue: { fontSize: 10, color: BLACK },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: 240,
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: BLACK,
  },
  grandLabel: { fontFamily: "Plex", fontSize: 8, color: "#ffffff" },
  grandValue: {
    fontFamily: "Creato",
    fontSize: 16,
    lineHeight: 1,
    color: "#ffffff",
  },
  note: {
    marginTop: 22,
    padding: 16,
    borderRadius: 10,
    backgroundColor: LIGHT,
    gap: 4,
  },
  noteText: { fontSize: 9.5, color: TEXT },
  thanks: { fontFamily: "Creato", fontSize: 11, color: BLACK, marginBottom: 2 },
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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/Phoenix",
});
const fmtDate = (value: string) => fmt.format(new Date(value));

/** What the line on the invoice is for, in a sentence. */
function lineDetail(invoice: Invoice, client: Client) {
  if (/setup/i.test(invoice.description)) {
    return "One-time setup: the design, build and launch of your site.";
  }
  if (/leads/i.test(invoice.description)) {
    return "The Leads Tool: fresh leads every morning, with who to ask for and what to say.";
  }
  if (client.website?.plan === "FULL_PLATFORM") {
    return "Your website, booking software, dispatch, driver app, flight tracking and the Leads Tool. Hosting, security, backups and unlimited changes included.";
  }
  return "Your custom website with its SEO foundation. Hosting, security, backups and unlimited changes included.";
}

function InvoicePdf({
  invoice,
  client,
  logo,
}: {
  invoice: Invoice;
  client: Client;
  logo: Buffer;
}) {
  const paid = invoice.status === "PAID";
  const period = invoice.period
    ? `${fmtDate(invoice.period.from)} – ${fmtDate(invoice.period.to)}`
    : "";
  const planName = client.website
    ? PLANS[client.website.plan].name
    : "Leads Tool";

  return (
    <Document
      title={`Invoice ${invoice.number}`}
      author='Fonts & Footers'
      subject={`${invoice.description} for ${client.business}`}
    >
      <Page size='LETTER' style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brand}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- a PDF image, not an <img> */}
            <Image style={styles.logo} src={{ data: logo, format: "png" }} />
            <Text style={styles.brandName}>Fonts & Footers</Text>
          </View>
          <View style={styles.from}>
            <Text style={styles.fromLine}>Fonts & Footers</Text>
            <Text style={styles.fromLine}>Phoenix, Arizona</Text>
            <Text style={styles.fromLine}>{SUPPORT_EMAIL}</Text>
            <Text style={styles.fromLine}>fontsandfooters.com</Text>
          </View>
        </View>

        <View style={styles.titleRow}>
          <View style={{ gap: 8 }}>
            <Text style={styles.mono}>Invoice</Text>
            <Text style={styles.title}>{invoice.number}</Text>
          </View>
          <Text
            style={[styles.pill, { backgroundColor: paid ? LIME : YELLOW }]}
          >
            {paid ? "Paid" : "Due"}
          </Text>
        </View>

        <View style={styles.rule} />

        <View style={styles.facts}>
          <View style={[styles.fact, { flex: 1.4 }]}>
            <Text style={styles.mono}>Billed to</Text>
            <View style={styles.billTo}>
              <Text style={styles.factValue}>{client.business}</Text>
              <Text style={styles.factValue}>{client.contact.name}</Text>
              <Text style={styles.fromLine}>{client.contact.email}</Text>
              <Text style={styles.fromLine}>{client.city}</Text>
            </View>
          </View>
          <View style={styles.fact}>
            <Text style={styles.mono}>Invoice date</Text>
            <Text style={styles.factValue}>{fmtDate(invoice.date)}</Text>
            {period ? (
              <>
                <Text style={[styles.mono, { marginTop: 8 }]}>Period</Text>
                <Text style={styles.factValue}>{period}</Text>
              </>
            ) : null}
          </View>
          <View style={styles.fact}>
            <Text style={styles.mono}>{paid ? "Paid on" : "Due by"}</Text>
            <Text style={styles.factValue}>
              {fmtDate(invoice.paidAt ?? invoice.date)}
            </Text>
            {invoice.method ? (
              <>
                <Text style={[styles.mono, { marginTop: 8 }]}>
                  Payment method
                </Text>
                <Text style={styles.factValue}>{invoice.method}</Text>
              </>
            ) : null}
          </View>
        </View>

        <View style={styles.rule} />

        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={[styles.mono, styles.cDesc]}>Description</Text>
            <Text style={[styles.mono, styles.cPeriod]}>Period</Text>
            <Text style={[styles.mono, styles.cAmount]}>Amount</Text>
          </View>
          <View style={styles.trow}>
            <View style={styles.cDesc}>
              <Text style={styles.lineTitle}>{invoice.description}</Text>
              <Text style={styles.lineDetail}>
                {lineDetail(invoice, client)}
              </Text>
            </View>
            <Text style={[styles.cPeriod, { color: TEXT }]}>
              {period || "One time"}
            </Text>
            <Text style={styles.cAmount}>{money(invoice.amount)}</Text>
          </View>
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{money(invoice.amount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Per-booking fees</Text>
            <Text style={styles.totalValue}>$0.00</Text>
          </View>
          <View style={styles.grand}>
            <Text style={styles.grandLabel}>
              {paid ? "TOTAL PAID" : "TOTAL DUE"}
            </Text>
            <Text style={styles.grandValue}>{money(invoice.amount)}</Text>
          </View>
        </View>

        <View style={styles.note}>
          <Text style={styles.thanks}>Thank you for your business.</Text>
          <Text style={styles.noteText}>
            {paid
              ? `Paid ${invoice.method ? `automatically with your ${invoice.method}` : "in full"} on ${fmtDate(invoice.paidAt ?? invoice.date)}. Nothing to do.`
              : `Please pay by ${fmtDate(invoice.date)}. Add or update a card in your dashboard under Billing.`}
          </Text>
          <Text style={styles.noteText}>
            Your plan: {planName}, month to month, no contract. Questions about
            this invoice: {SUPPORT_EMAIL}.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Fonts & Footers · Phoenix, Arizona · {SUPPORT_EMAIL}
          </Text>
          <Text style={styles.footerText}>Invoice {invoice.number}</Text>
        </View>
      </Page>
    </Document>
  );
}

/** The finished PDF, ready to send or download. */
export async function renderInvoice(invoice: Invoice, client: Client) {
  const logo = readFileSync(
    path.join(publicDir, "logos", "fnf_logo_black.png"),
  );
  return renderToBuffer(
    <InvoicePdf invoice={invoice} client={client} logo={logo} />,
  );
}
