// Studio details every email and link uses. Server only.

/** The site's address, for links in emails and Stripe's return URLs. */
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://fontsandfooters.com"
    : "http://localhost:3000")
).replace(/\/$/, "");

export const STUDIO = {
  name: "Fonts & Footers",
  from: "Fonts & Footers <noreply@fontsandfooters.com>",
  replyTo: "hello@fontsandfooters.com",
  /** On every email, as the law asks. */
  address: "10105 E Via Linda Ste. 103, Scottsdale, AZ 85268",
};

export const url = (path: string) =>
  `${APP_URL}${path.startsWith("/") ? path : `/${path}`}`;
