// Links to Google photos of places, through our own address so the key
// stays on the server. Each link is signed, so only links we made work
// (nobody can run up the photo bill). Server only.

import { sign, signatureOk } from "@/lib/server/ids";
import { url } from "@/lib/server/config";

/** The sizes we ask Google for: lists, cards, the grid, the page, full size. */
export const PHOTO_WIDTHS = [160, 400, 640, 1200, 1600] as const;
export type PhotoWidth = (typeof PHOTO_WIDTHS)[number];

/** Google keeps up to 10 photos of a place. */
export const MAX_PHOTOS = 10;

// The first photo's links have no index, as they always have, so links in
// emails already sent keep working.
const value = (placeId: string, width: number, index: number) =>
  index ? `photo.${placeId}.${index}.${width}` : `photo.${placeId}.${width}`;

/** "/api/leads/photo?…", or the full address for emails. */
export function photoUrl(
  placeId: string,
  width: PhotoWidth,
  { absolute = false, index = 0 }: { absolute?: boolean; index?: number } = {},
) {
  const n = index ? `&n=${index}` : "";
  const path = `/api/leads/photo?id=${encodeURIComponent(placeId)}${n}&w=${width}&s=${sign(value(placeId, width, index))}`;
  return absolute ? url(path) : path;
}

export function photoLinkOk(
  placeId: string,
  width: number,
  signature: string,
  index = 0,
) {
  return (
    (PHOTO_WIDTHS as readonly number[]).includes(width) &&
    Number.isInteger(index) &&
    index >= 0 &&
    index < MAX_PHOTOS &&
    signatureOk(value(placeId, width, index), signature)
  );
}
