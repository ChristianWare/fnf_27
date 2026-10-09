import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // The invoice PDFs: keep the renderer out of the bundle, and ship the
  // fonts and logo it reads from /public with the route.
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: {
    "/dashboard/billing/invoices/[id]": [
      "./public/fonts/**/*",
      "./public/logos/**/*",
    ],
    "/admin/clients/[id]/invoices/[invoiceId]": [
      "./public/fonts/**/*",
      "./public/logos/**/*",
    ],
  },
  async redirects() {
    return [
      // The audit is a free tool, not a service page. Catch the guessed URL.
      { source: "/services/audit", destination: "/audit", permanent: true },
    ];
  },
};

export default nextConfig;
