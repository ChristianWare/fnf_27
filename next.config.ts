import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async redirects() {
    return [
      // The audit is a free tool, not a service page. Catch the guessed URL.
      { source: "/services/audit", destination: "/audit", permanent: true },
    ];
  },
};

export default nextConfig;
