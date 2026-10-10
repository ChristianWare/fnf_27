// /manifest.webmanifest: the name and icons a phone uses when someone adds
// the site to their home screen.

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fonts & Footers",
    short_name: "Fonts & Footers",
    description:
      "Websites, booking software and leads for black car and limo operators.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0d0d0e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
