import type { Metadata, Viewport } from "next";
import "./globals.css";
import localFont from "next/font/local";

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

export const metadata: Metadata = {
  title: {
    default: "Fonts & Footers | Custom Booking Websites",
    template: "%s - Fonts & Footers",
  },
  description:
    "Fonts & Footers builds lightning-fast, mobile-first booking platforms that cut no-shows, and automate deposits for salons, spas, rentals, and service brands.",
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
    <html lang='en'>
      <body
        className={`${CreatoDisplayMedium.variable} ${CreatoDisplayRegular.variable} ${IBMPlex.variable} ${CreatoDisplayBold.style} ${cdCopy.variable} ${CreatoDisplayBlack.variable} ${CreatoDisplayExtraBold.variable} ${IBMPlexReg.variable} ${IBMPlexMonoBold.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
