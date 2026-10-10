import SmoothScroll from "@/components/shared/SmoothScroll/SmoothScroll";
import PageTransitions from "@/components/shared/PageTransitions/PageTransitions";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import localFont from "next/font/local";
import Analytics from "@/components/shared/Analytics/Analytics";
import { APP_URL } from "@/lib/server/config";

const CreatoDisplayMedium = localFont({
  src: "../../public/fonts/CreatoDisplay-Medium.otf",
  variable: "--CreatoDisplayMedium",
  display: "swap",
});

const CreatoDisplayRegular = localFont({
  src: "../../public/fonts/CreatoDisplay-Regular.otf",
  variable: "--CreatoDisplayRegular",
  display: "swap",
});

const CreatoDisplayBold = localFont({
  src: "../../public/fonts/CreatoDisplay-Bold.otf",
  variable: "--CreatoDisplayBold",
  display: "swap",
});

const CreatoDisplayBlack = localFont({
  src: "../../public/fonts/CreatoDisplay-Black.otf",
  variable: "--CreatoDisplayBlack",
  display: "swap",
});

const CreatoDisplayExtraBold = localFont({
  src: "../../public/fonts/CreatoDisplay-ExtraBold.otf",
  variable: "--CreatoDisplayExtraBold",
  display: "swap",
});

const cdCopy = localFont({
  src: "../../public/fonts/cdCopy.otf",
  variable: "--cdCopy",
  display: "swap",
});

const IBMPlex = localFont({
  src: "../../public/fonts/IBMPlexMono-Medium.ttf",
  variable: "--IBMPlex",
  display: "swap",
});

const IBMPlexReg = localFont({
  src: "../../public/fonts/IBMPlexMono-Regular.ttf",
  variable: "--IBMPlexReg",
  display: "swap",
});

const IBMPlexMonoBold = localFont({
  src: "../../public/fonts/IBMPlexMono-Bold.ttf",
  variable: "--IBMPlexMonoBold",
  display: "swap",
});

// The home page's title and description, and the defaults for any page
// without its own. Links shared anywhere show the page's own title and
// description with the share image (opengraph-image.jpg), unless the page
// brings its own picture (a Journal post).
export const metadata: Metadata = {
  metadataBase: new URL(
    URL.canParse(APP_URL) ? APP_URL : "https://fontsandfooters.com",
  ),
  title: {
    default: "Limo Websites, Booking Software & Leads | Fonts & Footers",
    template: "%s | Fonts & Footers",
  },
  description:
    "Websites, booking software and leads built only for black car and limo operators. Get found on Google, take bookings with no per-booking fees, and win accounts.",
  applicationName: "Fonts & Footers",
  openGraph: {
    type: "website",
    siteName: "Fonts & Footers",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.setAttribute('data-reveal-ready','')",
          }}
        />
      </head>
      <body
        className={`${CreatoDisplayMedium.variable} ${CreatoDisplayRegular.variable} ${IBMPlex.variable} ${CreatoDisplayBold.style} ${cdCopy.variable} ${CreatoDisplayBlack.variable} ${CreatoDisplayExtraBold.variable} ${IBMPlexReg.variable} ${IBMPlexMonoBold.variable}`}
      >
        <SmoothScroll>
          <PageTransitions />
          {children}
        </SmoothScroll>
        <Analytics />
      </body>
    </html>
  );
}
