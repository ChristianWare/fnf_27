import type { NextConfig } from "next";

const PDF_FILES = ["./public/fonts/**/*", "./public/logos/fnf_logo_black.png"];

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // The PDFs (invoices, the signed agreement, the audit report): keep the
  // renderer out of the bundle, and ship the fonts and logo it reads from
  // /public with every route that makes one, including the Stripe webhook
  // and the audit's report page, which email them.
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: {
    "/dashboard/**": PDF_FILES,
    "/admin/**": PDF_FILES,
    "/api/**": PDF_FILES,
    "/audit/**": PDF_FILES,
  },
  async redirects() {
    return [
      // The audit is a free tool, not a service page. Catch the guessed URL.
      { source: "/services/audit", destination: "/audit", permanent: true },

      // The old site's pages, where Google and old links still send people.
      // Permanent, so their place in search moves to the new page.
      { source: "/leads", destination: "/services/leads", permanent: true },
      {
        source: "/websites",
        destination: "/services/websites",
        permanent: true,
      },
      { source: "/portfolio", destination: "/projects", permanent: true },
      { source: "/work", destination: "/projects", permanent: true },
      // The old blog's posts became the Journal. The no-shows post's topic
      // (reminders, deposits) lives on the booking software page now.
      {
        source: "/blog/how-to-eliminate-no-shows-with-smart-booking-technology",
        destination: "/services/booking-software",
        permanent: true,
      },
      { source: "/blog", destination: "/journal", permanent: true },
      { source: "/blog/:slug*", destination: "/journal", permanent: true },
      { source: "/components", destination: "/", permanent: true },

      // The old dashboard's pages, linked from emails clients still have
      // (the morning leads emails, billing, the website steps).
      ...[
        [
          "/dashboard/leads/:kind(hot|warm|cold|place|preview)/:id",
          "/dashboard/leads",
        ],
        ["/dashboard/leads/search", "/dashboard/leads/find"],
        ["/dashboard/leads/:page(saved|welcome)", "/dashboard/leads"],
        ["/dashboard/billing/website", "/dashboard/billing"],
        ["/dashboard/enroll/:plan(leads|website)", "/dashboard/billing"],
        ["/dashboard/website/change-requests", "/dashboard/website/changes"],
        ["/dashboard/website/design-selection", "/dashboard/website/design"],
        [
          "/dashboard/website/documents/:id/sign",
          "/dashboard/website/documents",
        ],
        ["/admin/change-requests", "/admin/requests"],
        ["/admin/support", "/admin/messages"],
        ["/admin/clients/:id/:tab(leads|website)", "/admin/clients/:id"],
      ].map(([source, destination]) => ({
        source,
        destination,
        permanent: false,
      })),
    ];
  },
};

export default nextConfig;
