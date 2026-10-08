// Small, pure helpers that both server and client components use. Keep
// this file free of anything server-only (cookies, the database).

import type { Asset, BlueprintPage } from "./types";

/* ── Brand assets: what we need ── */

export type AssetNeed = {
  id: string;
  label: string;
  text: string;
  have: number;
  need: number;
};

export function assetNeeds(assets: Pick<Asset, "label">[]): AssetNeed[] {
  const count = (label: Asset["label"]) =>
    assets.filter((asset) => asset.label === label).length;
  return [
    {
      id: "logo",
      label: "Your logo",
      text: "SVG, PNG or PDF. The original file, if you have it.",
      have: count("Logo"),
      need: 1,
    },
    {
      id: "fleet",
      label: "Fleet photos",
      text: "At least six: each vehicle, outside and in.",
      have: count("Fleet photo"),
      need: 6,
    },
    {
      id: "team",
      label: "You or a chauffeur",
      text: "One photo of a real person by the car. It builds trust.",
      have: count("Team photo"),
      need: 1,
    },
    {
      id: "brand",
      label: "Brand guide or colors",
      text: "Optional. Anything that shows how your brand should look.",
      have: count("Brand guide"),
      need: 0,
    },
  ];
}

export const assetsComplete = (assets: Pick<Asset, "label">[]) =>
  assetNeeds(assets).every((item) => item.have >= item.need);

/* ── The blueprint ── */

export function blueprintCounts(pages: BlueprintPage[]) {
  const sections = pages.flatMap((page) => page.sections);
  return {
    total: sections.length,
    review: sections.filter((s) => s.status === "REVIEW").length,
    approved: sections.filter((s) => s.status === "APPROVED").length,
    draft: sections.filter((s) => s.status === "DRAFT").length,
  };
}
