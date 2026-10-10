// The site's own stats, on Plausible: the same site the old site counted
// on (fontsandfooters.com), so the numbers carry straight on. Only the
// live site counts; previews and development don't. The dashboards and
// admin aren't counted, so the numbers are visitors, not clients signing
// in. The goals (an audit asked for, a message sent) are in
// lib/analytics.ts.

import Script from "next/script";
import { IS_LIVE } from "@/lib/server/email";

const DOMAIN = "fontsandfooters.com";
const EXCLUDE = "/dashboard, /dashboard/**, /admin, /admin/**";

// Holds goals sent before the script has loaded, as Plausible suggests.
const QUEUE =
  "window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}";

export default function Analytics() {
  if (!IS_LIVE) return null;
  return (
    <>
      <Script id='plausible-queue' strategy='afterInteractive'>
        {QUEUE}
      </Script>
      <Script
        src='https://plausible.io/js/script.exclusions.js'
        data-domain={DOMAIN}
        data-exclude={EXCLUDE}
        strategy='afterInteractive'
      />
    </>
  );
}
