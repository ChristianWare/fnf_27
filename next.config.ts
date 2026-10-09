import type { NextConfig } from "next";

const PDF_FILES = ["./public/fonts/**/*", "./public/logos/fnf_logo_black.png"];

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // The PDFs (invoices, the signed agreement): keep the renderer out of the
  // bundle, and ship the fonts and logo it reads from /public with every
  // route that makes one, including the Stripe webhook that emails them.
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: {
    "/dashboard/**": PDF_FILES,
    "/admin/**": PDF_FILES,
    "/api/**": PDF_FILES,
  },
  async redirects() {
    return [
      // The audit is a free tool, not a service page. Catch the guessed URL.
      { source: "/services/audit", destination: "/audit", permanent: true },
    ];
  },
};

export default nextConfig;
